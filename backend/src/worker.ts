/**
 * Background Worker Service
 * Handles async jobs: image processing, push notifications, moderation, etc.
 */

import { NestFactory } from '@nestjs/core';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import * as sharp from 'sharp';
import * as vision from '@google-cloud/vision';
import { AppModule } from './app.module';

// Job types
enum JobType {
  PROCESS_IMAGE = 'process_image',
  SEND_PUSH_NOTIFICATION = 'send_push_notification',
  MODERATE_CONTENT = 'moderate_content',
  VERIFY_PROFILE = 'verify_profile',
  PROCESS_SUBSCRIPTION = 'process_subscription',
  CLEANUP_EXPIRED_SESSIONS = 'cleanup_expired_sessions',
  GENERATE_DAILY_STATS = 'generate_daily_stats',
  SEND_EMAIL = 'send_email',
}

interface ImageProcessingJob {
  userId: string;
  imageUrl: string;
  imageType: 'profile' | 'verification';
}

interface PushNotificationJob {
  userId: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
}

interface ModerationJob {
  contentId: string;
  contentType: 'photo' | 'message' | 'profile';
  contentUrl?: string;
  contentText?: string;
}

class WorkerService {
  private prisma: PrismaService;
  private config: ConfigService;
  private s3: AWS.S3;
  private rekognition: AWS.Rekognition;
  private visionClient: vision.ImageAnnotatorClient;
  private firebaseAdmin: admin.app.App;

  constructor() {
    this.initialize();
  }

  async initialize() {
    const app = await NestFactory.createApplicationContext(AppModule);
    this.prisma = app.get(PrismaService);
    this.config = app.get(ConfigService);

    // Initialize AWS services
    AWS.config.update({
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION'),
    });
    this.s3 = new AWS.S3();
    this.rekognition = new AWS.Rekognition();

    // Initialize Google Vision
    this.visionClient = new vision.ImageAnnotatorClient({
      keyFilename: this.config.get('GOOGLE_APPLICATION_CREDENTIALS'),
    });

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      this.firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get('FIREBASE_PROJECT_ID'),
          clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.firebaseAdmin = admin.app();
    }

    console.log('Worker service initialized');
  }

  /**
   * Process uploaded images
   */
  async processImage(job: Job<ImageProcessingJob>) {
    const { userId, imageUrl, imageType } = job.data;
    console.log(`Processing image for user ${userId}: ${imageUrl}`);

    try {
      // Download image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);

      // Create multiple sizes
      const sizes = [
        { width: 150, height: 150, suffix: '_thumb' },
        { width: 400, height: 400, suffix: '_medium' },
        { width: 800, height: 800, suffix: '_large' },
      ];

      const processedImages = await Promise.all(
        sizes.map(async (size) => {
          const resized = await sharp(imageBuffer)
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'center',
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload to S3
          const key = `${imageType}/${userId}/${Date.now()}${size.suffix}.jpg`;
          await this.s3.putObject({
            Bucket: this.config.get('AWS_S3_BUCKET'),
            Key: key,
            Body: resized,
            ContentType: 'image/jpeg',
            CacheControl: 'max-age=31536000',
          }).promise();

          return `https://${this.config.get('AWS_S3_BUCKET')}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
        })
      );

      // Update user profile with processed images
      if (imageType === 'profile') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            photos: {
              push: processedImages[2], // Large version
            },
            thumbnail: processedImages[0], // Thumbnail version
          },
        });
      }

      await job.updateProgress(100);
      return { success: true, images: processedImages };
    } catch (error) {
      console.error('Image processing failed:', error);
      throw error;
    }
  }

  /**
   * Send push notifications
   */
  async sendPushNotification(job: Job<PushNotificationJob>) {
    const { userId, title, body, data, badge } = job.data;
    console.log(`Sending push notification to user ${userId}`);

    try {
      // Get user's push tokens
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (pushTokens.length === 0) {
        console.log(`No active push tokens for user ${userId}`);
        return { success: false, reason: 'No active tokens' };
      }

      // Prepare notification
      const notification = {
        title,
        body,
      };

      const message = {
        notification,
        data: data || {},
        tokens: pushTokens.map(t => t.token),
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: badge || 1,
              contentAvailable: true,
            },
          },
        },
      };

      // Send via Firebase
      const response = await this.firebaseAdmin.messaging().sendMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(pushTokens[idx].token);
          }
        });

        // Deactivate failed tokens
        await this.prisma.pushToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { isActive: false },
        });
      }

      await job.updateProgress(100);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Push notification failed:', error);
      throw error;
    }
  }

  /**
   * Moderate content using AI
   */
  async moderateContent(job: Job<ModerationJob>) {
    const { contentId, contentType, contentUrl, contentText } = job.data;
    console.log(`Moderating ${contentType}: ${contentId}`);

    try {
      let moderationResult: any = {};

      if (contentType === 'photo' && contentUrl) {
        // Use Google Vision for image moderation
        const [result] = await this.visionClient.safeSearchDetection(contentUrl);
        const detections = result.safeSearchAnnotation;

        moderationResult = {
          adult: detections?.adult,
          violence: detections?.violence,
          racy: detections?.racy,
          safe: this.isSafeContent(detections),
        };

        // If unsafe, take action
        if (!moderationResult.safe) {
          await this.handleUnsafeContent(contentId, contentType, moderationResult);
        }
      } else if (contentType === 'message' && contentText) {
        // Use text moderation (can integrate with Perspective API or similar)
        moderationResult = await this.moderateText(contentText);
        
        if (!moderationResult.safe) {
          await this.handleUnsafeContent(contentId, contentType, moderationResult);
        }
      }

      // Store moderation result
      await this.prisma.moderationLog.create({
        data: {
          contentId,
          contentType,
          result: moderationResult,
          timestamp: new Date(),
        },
      });

      await job.updateProgress(100);
      return { success: true, result: moderationResult };
    } catch (error) {
      console.error('Content moderation failed:', error);
      throw error;
    }
  }

  /**
   * Verify user profile
   */
  async verifyProfile(job: Job<{ userId: string; verificationId: string }>) {
    const { userId, verificationId } = job.data;
    console.log(`Verifying profile for user ${userId}`);

    try {
      // Get verification data
      const verification = await this.prisma.verification.findUnique({
        where: { id: verificationId },
        include: { user: true },
      });

      if (!verification) {
        throw new Error('Verification not found');
      }

      // Compare faces using AWS Rekognition
      const userPhotos = verification.user.photos;
      const selfieUrl = verification.selfieUrl;

      const comparisons = await Promise.all(
        userPhotos.map(async (photo) => {
          const params = {
            SourceImage: {
              S3Object: {
                Bucket: this.config.get('AWS_S3_BUCKET'),
                Name: this.extractS3Key(selfieUrl),
              },
            },
            TargetImage: {
              S3Object: {
                Bucket: this.config.get('AWS_S3_BUCKET'),
                Name: this.extractS3Key(photo),
              },
            },
            SimilarityThreshold: 80,
          };

          try {
            const result = await this.rekognition.compareFaces(params).promise();
            return result.FaceMatches?.[0]?.Similarity || 0;
          } catch {
            return 0;
          }
        })
      );

      const maxSimilarity = Math.max(...comparisons);
      const isVerified = maxSimilarity >= 80;

      // Update verification status
      await this.prisma.verification.update({
        where: { id: verificationId },
        data: {
          status: isVerified ? 'VERIFIED' : 'FAILED',
          similarity: maxSimilarity,
          verifiedAt: isVerified ? new Date() : null,
        },
      });

      // Update user verification status
      if (isVerified) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        });

        // Send success notification
        await this.queuePushNotification({
          userId,
          title: 'Profile Verified! ✓',
          body: 'Your profile is now verified. You\'ll get more matches!',
        });
      } else {
        // Send failure notification
        await this.queuePushNotification({
          userId,
          title: 'Verification Failed',
          body: 'Please try again with a clearer selfie.',
        });
      }

      await job.updateProgress(100);
      return { success: true, verified: isVerified, similarity: maxSimilarity };
    } catch (error) {
      console.error('Profile verification failed:', error);
      throw error;
    }
  }

  /**
   * Process subscription events
   */
  async processSubscription(job: Job<{ userId: string; event: string; data: any }>) {
    const { userId, event, data } = job.data;
    console.log(`Processing subscription event ${event} for user ${userId}`);

    try {
      switch (event) {
        case 'subscription.created':
          await this.handleSubscriptionCreated(userId, data);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(userId, data);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(userId, data);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(userId, data);
          break;
        default:
          console.log(`Unknown subscription event: ${event}`);
      }

      await job.updateProgress(100);
      return { success: true };
    } catch (error) {
      console.error('Subscription processing failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(job: Job) {
    console.log('Cleaning up expired sessions');

    try {
      // Delete expired sessions
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`Deleted ${result.count} expired sessions`);

      // Cleanup orphaned push tokens
      const tokenResult = await this.prisma.pushToken.deleteMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
          },
          isActive: false,
        },
      });

      console.log(`Deleted ${tokenResult.count} inactive push tokens`);

      await job.updateProgress(100);
      return { success: true, sessionsDeleted: result.count, tokensDeleted: tokenResult.count };
    } catch (error) {
      console.error('Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generate daily statistics
   */
  async generateDailyStats(job: Job) {
    console.log('Generating daily statistics');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Gather stats
      const [
        newUsers,
        activeUsers,
        newMatches,
        messagesSent,
        voiceMessages,
        subscriptions,
        reports,
      ] = await Promise.all([
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.user.count({
          where: {
            lastSeen: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.match.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.message.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.message.count({
          where: {
            messageType: 'VOICE',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.subscription.count({
          where: {
            isActive: true,
            tier: { not: 'FREE' },
          },
        }),
        this.prisma.report.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
      ]);

      // Store daily stats
      await this.prisma.dailyStats.create({
        data: {
          date: today,
          newUsers,
          activeUsers,
          newMatches,
          messagesSent,
          voiceMessages,
          activeSubscriptions: subscriptions,
          reports,
        },
      });

      console.log('Daily stats generated:', {
        date: today.toISOString().split('T')[0],
        newUsers,
        activeUsers,
        newMatches,
        messagesSent,
        voiceMessages,
        subscriptions,
        reports,
      });

      await job.updateProgress(100);
      return { success: true };
    } catch (error) {
      console.error('Stats generation failed:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private isSafeContent(detections: any): boolean {
    if (!detections) return true;
    
    const unsafe = ['LIKELY', 'VERY_LIKELY'];
    return !unsafe.includes(detections.adult) &&
           !unsafe.includes(detections.violence) &&
           !unsafe.includes(detections.racy);
  }

  private async handleUnsafeContent(contentId: string, contentType: string, result: any) {
    if (contentType === 'photo') {
      // Remove photo
      await this.prisma.photo.update({
        where: { id: contentId },
        data: {
          isDeleted: true,
          deletionReason: 'Violated content policy',
        },
      });
    } else if (contentType === 'message') {
      // Delete message
      await this.prisma.message.update({
        where: { id: contentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    // Create moderation action record
    await this.prisma.moderationAction.create({
      data: {
        contentId,
        contentType,
        action: 'AUTO_REMOVED',
        reason: JSON.stringify(result),
        automated: true,
      },
    });
  }

  private async moderateText(text: string): Promise<any> {
    // Simple keyword-based moderation (replace with AI service in production)
    const bannedWords = ['spam', 'scam', 'hate'];
    const containsBannedWords = bannedWords.some(word => 
      text.toLowerCase().includes(word)
    );

    return {
      safe: !containsBannedWords,
      confidence: containsBannedWords ? 0.9 : 0.1,
      flaggedWords: bannedWords.filter(word => text.toLowerCase().includes(word)),
    };
  }

  private extractS3Key(url: string): string {
    const match = url.match(/amazonaws\.com\/(.+)$/);
    return match ? match[1] : '';
  }

  private async queuePushNotification(data: PushNotificationJob) {
    // Queue push notification job
    const queue = new Queue('notifications', {
      connection: {
        host: this.config.get('REDIS_HOST'),
        port: this.config.get('REDIS_PORT'),
      },
    });

    await queue.add(JobType.SEND_PUSH_NOTIFICATION, data);
  }

  private async handleSubscriptionCreated(userId: string, data: any) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: data.tier,
        subscriptionExpiresAt: new Date(data.expiresAt),
      },
    });
  }

  private async handleSubscriptionUpdated(userId: string, data: any) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: data.tier,
        subscriptionExpiresAt: new Date(data.expiresAt),
      },
    });
  }

  private async handleSubscriptionCancelled(userId: string, data: any) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'FREE',
        subscriptionExpiresAt: null,
      },
    });
  }

  private async handlePaymentFailed(userId: string, data: any) {
    // Send notification about failed payment
    await this.queuePushNotification({
      userId,
      title: 'Payment Failed',
      body: 'Please update your payment method to continue your subscription.',
      data: { type: 'payment_failed' },
    });
  }
}

// Create and start workers
async function startWorkers() {
  const workerService = new WorkerService();
  await workerService.initialize();

  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  // Image processing worker
  const imageWorker = new Worker(
    'images',
    async (job) => workerService.processImage(job),
    { connection, concurrency: 5 }
  );

  // Push notification worker
  const notificationWorker = new Worker(
    'notifications',
    async (job) => workerService.sendPushNotification(job),
    { connection, concurrency: 10 }
  );

  // Moderation worker
  const moderationWorker = new Worker(
    'moderation',
    async (job) => workerService.moderateContent(job),
    { connection, concurrency: 3 }
  );

  // Profile verification worker
  const verificationWorker = new Worker(
    'verification',
    async (job) => workerService.verifyProfile(job),
    { connection, concurrency: 2 }
  );

  // Subscription worker
  const subscriptionWorker = new Worker(
    'subscriptions',
    async (job) => workerService.processSubscription(job),
    { connection, concurrency: 5 }
  );

  // Maintenance worker (runs scheduled tasks)
  const maintenanceWorker = new Worker(
    'maintenance',
    async (job) => {
      switch (job.name) {
        case JobType.CLEANUP_EXPIRED_SESSIONS:
          return workerService.cleanupExpiredSessions(job);
        case JobType.GENERATE_DAILY_STATS:
          return workerService.generateDailyStats(job);
        default:
          throw new Error(`Unknown maintenance job: ${job.name}`);
      }
    },
    { connection, concurrency: 1 }
  );

  // Error handling
  [imageWorker, notificationWorker, moderationWorker, verificationWorker, subscriptionWorker, maintenanceWorker].forEach(worker => {
    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });
  });

  console.log('Workers started successfully');
}

// Start workers
startWorkers().catch(console.error);
