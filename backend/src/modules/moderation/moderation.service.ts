/**
 * Enhanced Moderation Service with AI capabilities
 * Handles content moderation, nudity detection, and profile verification
 */

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ReportContentDto, VerifyProfileDto } from './dto/moderation.dto';
import { ReportStatus, ModerationAction } from '@prisma/client';
import * as vision from '@google-cloud/vision';
import * as AWS from 'aws-sdk';
import * as sharp from 'sharp';

@Injectable()
export class ModerationService {
  private visionClient: vision.ImageAnnotatorClient;
  private rekognition: AWS.Rekognition;
  private s3: AWS.S3;
  
  private readonly AUTO_APPROVE_THRESHOLD = 0.8;
  private readonly AUTO_REJECT_THRESHOLD = 0.2;
  private readonly MAX_REPORTS_BEFORE_BAN = 5;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Google Vision API
    this.visionClient = new vision.ImageAnnotatorClient({
      keyFilename: this.configService.get('GOOGLE_APPLICATION_CREDENTIALS'),
    });

    // Initialize AWS services
    AWS.config.update({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
    
    this.rekognition = new AWS.Rekognition();
    this.s3 = new AWS.S3();
  }

  /**
   * Report content (user or message)
   */
  async reportContent(userId: string, dto: ReportContentDto) {
    // Check if user has already reported this content
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        contentId: dto.contentId,
        contentType: dto.contentType,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this content');
    }

    // Create report
    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        contentType: dto.contentType,
        contentId: dto.contentId,
        reason: dto.reason,
        description: dto.description,
        status: ReportStatus.PENDING,
      },
    });

    // Check if content has reached report threshold
    const reportCount = await this.prisma.report.count({
      where: {
        contentId: dto.contentId,
        contentType: dto.contentType,
        status: ReportStatus.PENDING,
      },
    });

    // Auto-ban if threshold reached
    if (reportCount >= this.MAX_REPORTS_BEFORE_BAN) {
      await this.autoModerateContent(dto.contentId, dto.contentType);
    }

    // Queue for manual review if needed
    await this.queueForReview(report.id);

    return report;
  }

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId, blockedUserId },
          { blockerId: blockedUserId, blockedUserId: blockerId },
        ],
      },
    });

    if (existingBlock) {
      throw new BadRequestException('User already blocked');
    }

    // Create block
    const block = await this.prisma.block.create({
      data: {
        blockerId,
        blockedUserId,
      },
    });

    // Update any existing chats to blocked status
    await this.prisma.chat.updateMany({
      where: {
        participants: {
          every: {
            userId: { in: [blockerId, blockedUserId] },
          },
        },
      },
      data: {
        isBlocked: true,
      },
    });

    return { success: true, block };
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedUserId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        blockerId,
        blockedUserId,
      },
    });

    if (!block) {
      throw new BadRequestException('User is not blocked');
    }

    await this.prisma.block.delete({
      where: { id: block.id },
    });

    // Update chat status
    await this.prisma.chat.updateMany({
      where: {
        participants: {
          every: {
            userId: { in: [blockerId, blockedUserId] },
          },
        },
      },
      data: {
        isBlocked: false,
      },
    });

    return { success: true };
  }

  /**
   * Scan image for inappropriate content using Google Vision API
   */
  async scanImageForNudity(imageUrl: string): Promise<{
    safe: boolean;
    confidence: number;
    details: any;
  }> {
    try {
      // Use Google Vision Safe Search Detection
      const [result] = await this.visionClient.safeSearchDetection(imageUrl);
      const detections = result.safeSearchAnnotation;

      if (!detections) {
        throw new Error('No safety annotations found');
      }

      // Calculate safety score
      const safetyScores = {
        adult: this.getLikelihoodScore(detections.adult),
        violence: this.getLikelihoodScore(detections.violence),
        racy: this.getLikelihoodScore(detections.racy),
      };

      // Determine if content is safe
      const maxScore = Math.max(...Object.values(safetyScores));
      const safe = maxScore < 0.5; // Threshold for safety
      const confidence = 1 - maxScore;

      return {
        safe,
        confidence,
        details: {
          scores: safetyScores,
          adult: detections.adult,
          violence: detections.violence,
          racy: detections.racy,
          medical: detections.medical,
          spoof: detections.spoof,
        },
      };
    } catch (error) {
      console.error('Google Vision API error:', error);
      
      // Fallback to AWS Rekognition if available
      return this.scanWithRekognition(imageUrl);
    }
  }

  /**
   * Fallback nudity detection using AWS Rekognition
   */
  private async scanWithRekognition(imageUrl: string): Promise<{
    safe: boolean;
    confidence: number;
    details: any;
  }> {
    try {
      // Download image to buffer
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();

      const params = {
        Image: {
          Bytes: Buffer.from(buffer),
        },
        MinConfidence: 60,
      };

      const result = await this.rekognition.detectModerationLabels(params).promise();

      // Check for inappropriate content
      const inappropriateLabels = result.ModerationLabels?.filter(
        label => ['Explicit Nudity', 'Suggestive', 'Sexual Activity'].includes(label.Name || '')
      );

      const safe = !inappropriateLabels || inappropriateLabels.length === 0;
      const confidence = safe ? 1 : (inappropriateLabels[0]?.Confidence || 0) / 100;

      return {
        safe,
        confidence,
        details: {
          labels: result.ModerationLabels,
        },
      };
    } catch (error) {
      console.error('AWS Rekognition error:', error);
      
      // If both services fail, default to manual review
      return {
        safe: false,
        confidence: 0.5,
        details: { error: 'Both moderation services failed' },
      };
    }
  }

  /**
   * Verify profile with selfie comparison
   */
  async verifyProfile(userId: string, dto: VerifyProfileDto) {
    try {
      // Get user's profile photos
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { photos: true },
      });

      if (!user || user.photos.length === 0) {
        throw new BadRequestException('No profile photos found');
      }

      // Process selfie image
      const selfieBuffer = Buffer.from(dto.selfieData, 'base64');
      
      // Resize and optimize selfie
      const processedSelfie = await sharp(selfieBuffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload selfie to S3
      const selfieKey = `verification/${userId}/${Date.now()}.jpg`;
      await this.s3.putObject({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: selfieKey,
        Body: processedSelfie,
        ContentType: 'image/jpeg',
      }).promise();

      const selfieUrl = `https://${this.configService.get('AWS_S3_BUCKET')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${selfieKey}`;

      // Compare faces using AWS Rekognition
      const verificationResults = await Promise.all(
        user.photos.map(photo => this.compareFaces(selfieUrl, photo))
      );

      // Calculate overall similarity
      const maxSimilarity = Math.max(...verificationResults.map(r => r.similarity));
      const verified = maxSimilarity >= 80; // 80% similarity threshold

      // Update user verification status
      if (verified) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        });

        // Create verification record
        await this.prisma.verification.create({
          data: {
            userId,
            selfieUrl,
            similarity: maxSimilarity,
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });
      } else {
        // Queue for manual review
        await this.prisma.verification.create({
          data: {
            userId,
            selfieUrl,
            similarity: maxSimilarity,
            status: 'PENDING',
          },
        });
      }

      return {
        verified,
        similarity: maxSimilarity,
        message: verified 
          ? 'Profile successfully verified!' 
          : 'Verification pending manual review',
      };
    } catch (error) {
      console.error('Profile verification error:', error);
      throw new BadRequestException('Verification failed. Please try again.');
    }
  }

  /**
   * Compare two faces using AWS Rekognition
   */
  private async compareFaces(sourceImage: string, targetImage: string): Promise<{
    similarity: number;
    confidence: number;
  }> {
    try {
      // Download images
      const [sourceResponse, targetResponse] = await Promise.all([
        fetch(sourceImage),
        fetch(targetImage),
      ]);

      const [sourceBuffer, targetBuffer] = await Promise.all([
        sourceResponse.arrayBuffer(),
        targetResponse.arrayBuffer(),
      ]);

      const params = {
        SourceImage: {
          Bytes: Buffer.from(sourceBuffer),
        },
        TargetImage: {
          Bytes: Buffer.from(targetBuffer),
        },
        SimilarityThreshold: 70,
      };

      const result = await this.rekognition.compareFaces(params).promise();

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const match = result.FaceMatches[0];
        return {
          similarity: match.Similarity || 0,
          confidence: match.Face?.Confidence || 0,
        };
      }

      return { similarity: 0, confidence: 0 };
    } catch (error) {
      console.error('Face comparison error:', error);
      return { similarity: 0, confidence: 0 };
    }
  }

  /**
   * Process photo upload with moderation
   */
  async processPhotoUpload(userId: string, photoUrl: string): Promise<{
    approved: boolean;
    photoUrl: string;
    moderationResult?: any;
  }> {
    // Scan for inappropriate content
    const scanResult = await this.scanImageForNudity(photoUrl);

    if (scanResult.confidence >= this.AUTO_APPROVE_THRESHOLD && scanResult.safe) {
      // Auto-approve safe content
      return {
        approved: true,
        photoUrl,
        moderationResult: scanResult.details,
      };
    } else if (scanResult.confidence >= this.AUTO_REJECT_THRESHOLD && !scanResult.safe) {
      // Auto-reject unsafe content
      await this.deleteImage(photoUrl);
      throw new BadRequestException('Photo contains inappropriate content');
    } else {
      // Queue for manual review
      await this.prisma.moderationQueue.create({
        data: {
          userId,
          contentType: 'PHOTO',
          contentUrl: photoUrl,
          aiScore: scanResult.confidence,
          aiDetails: scanResult.details,
          status: 'PENDING',
        },
      });

      return {
        approved: false,
        photoUrl,
        moderationResult: {
          status: 'pending_review',
          message: 'Photo is being reviewed and will be available soon',
        },
      };
    }
  }

  /**
   * Get moderation queue for admin review
   */
  async getModerationQueue(adminId: string, status?: string) {
    // Verify admin permissions
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (admin?.role !== 'ADMIN' && admin?.role !== 'MODERATOR') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.moderationQueue.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 50,
    });
  }

  /**
   * Review moderation item
   */
  async reviewModerationItem(adminId: string, itemId: string, action: ModerationAction, notes?: string) {
    // Verify admin permissions
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (admin?.role !== 'ADMIN' && admin?.role !== 'MODERATOR') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const item = await this.prisma.moderationQueue.update({
      where: { id: itemId },
      data: {
        status: action === ModerationAction.APPROVE ? 'APPROVED' : 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    // Take action based on decision
    if (action === ModerationAction.REJECT && item.contentType === 'PHOTO') {
      await this.deleteImage(item.contentUrl);
    }

    return item;
  }

  /**
   * Auto-moderate content based on reports
   */
  private async autoModerateContent(contentId: string, contentType: string) {
    if (contentType === 'USER') {
      // Suspend user account
      await this.prisma.user.update({
        where: { id: contentId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason: 'Multiple reports received',
        },
      });
    } else if (contentType === 'MESSAGE') {
      // Delete message
      await this.prisma.message.update({
        where: { id: contentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    // Update all related reports
    await this.prisma.report.updateMany({
      where: {
        contentId,
        contentType,
        status: ReportStatus.PENDING,
      },
      data: {
        status: ReportStatus.RESOLVED,
        resolution: 'AUTO_MODERATED',
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Queue report for manual review
   */
  private async queueForReview(reportId: string) {
    // Add to moderation queue if not auto-moderated
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { name: true },
        },
      },
    });

    if (report && report.status === ReportStatus.PENDING) {
      await this.prisma.moderationQueue.create({
        data: {
          userId: report.reporterId,
          contentType: 'REPORT',
          contentUrl: report.contentId,
          status: 'PENDING',
          aiDetails: {
            reason: report.reason,
            description: report.description,
            reporterName: report.reporter.name,
          },
        },
      });
    }
  }

  /**
   * Delete image from S3
   */
  private async deleteImage(imageUrl: string) {
    try {
      const key = imageUrl.split('.com/')[1];
      await this.s3.deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: key,
      }).promise();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  /**
   * Convert Google Vision likelihood to numeric score
   */
  private getLikelihoodScore(likelihood: string | null | undefined): number {
    const scores: Record<string, number> = {
      VERY_UNLIKELY: 0,
      UNLIKELY: 0.25,
      POSSIBLE: 0.5,
      LIKELY: 0.75,
      VERY_LIKELY: 1,
    };
    return scores[likelihood || 'VERY_UNLIKELY'] || 0;
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string) {
    const [reports, blocks, verifications] = await Promise.all([
      this.prisma.report.findMany({
        where: {
          OR: [
            { reporterId: userId },
            { contentId: userId, contentType: 'USER' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedUserId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      reports,
      blocks,
      verification: verifications,
      isSuspended: false, // Check user suspension status
    };
  }
}
