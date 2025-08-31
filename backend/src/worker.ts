import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as Bull from 'bull';

@Injectable()
export class WorkerService {
  private queues: Map<string, Bull.Queue> = new Map();

  constructor(private prisma: PrismaService) {
    this.initializeQueues();
  }

  private initializeQueues() {
    // Initialize Redis queues for background jobs
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    // Create queues
    this.queues.set('email', new Bull('email', { redis: redisConfig }));
    this.queues.set('notification', new Bull('notification', { redis: redisConfig }));
    this.queues.set('moderation', new Bull('moderation', { redis: redisConfig }));
    this.queues.set('subscription', new Bull('subscription', { redis: redisConfig }));

    // Process jobs
    this.processEmailJobs();
    this.processNotificationJobs();
    this.processModerationJobs();
    this.processSubscriptionJobs();
  }

  private processEmailJobs() {
    const emailQueue = this.queues.get('email');
    if (!emailQueue) return;

    emailQueue.process(async (job) => {
      const { to, subject, template, data } = job.data;
      // Email sending logic here
      console.log(`Sending email to ${to}: ${subject}`);
      return { sent: true };
    });
  }

  private processNotificationJobs() {
    const notificationQueue = this.queues.get('notification');
    if (!notificationQueue) return;

    notificationQueue.process(async (job) => {
      const { userId, type, title, message, data } = job.data;
      
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data,
        },
      });

      // Push notification logic here
      console.log(`Notification sent to user ${userId}: ${title}`);
      return { sent: true };
    });
  }

  private processModerationJobs() {
    const moderationQueue = this.queues.get('moderation');
    if (!moderationQueue) return;

    moderationQueue.process(async (job) => {
      const { userId, messageId, content, type } = job.data;
      
      // Simple content moderation
      const flaggedWords = ['spam', 'inappropriate', 'offensive'];
      const isFlagged = flaggedWords.some(word => 
        content.toLowerCase().includes(word)
      );

      if (isFlagged) {
        // Create moderation action
        await this.prisma.moderationAction.create({
          data: {
            userId,
            messageId,
            action: 'flagged',
            reason: 'Inappropriate content detected',
            details: { content, type },
          },
        });

        // Soft delete the message if it exists
        if (messageId) {
          await this.prisma.message.update({
            where: { id: messageId },
            data: { 
              deletedAt: new Date(),
              content: '[Message removed by moderation]'
            },
          });
        }
      }

      return { moderated: isFlagged };
    });
  }

  private processSubscriptionJobs() {
    const subscriptionQueue = this.queues.get('subscription');
    if (!subscriptionQueue) return;

    subscriptionQueue.process(async (job) => {
      const { userId, action, data } = job.data;

      switch (action) {
        case 'activate':
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              isPremium: true,
              subscriptionTier: data.tier,
              subscriptionExpiresAt: new Date(data.expiresAt),
            },
          });
          break;

        case 'renew':
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionExpiresAt: new Date(data.expiresAt),
            },
          });
          break;

        case 'cancel':
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              isPremium: false,
              subscriptionTier: null,
              subscriptionExpiresAt: null,
            },
          });
          break;

        case 'expire':
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
          });

          if (user && user.subscriptionExpiresAt) {
            const now = new Date();
            if (user.subscriptionExpiresAt < now) {
              await this.prisma.user.update({
                where: { id: userId },
                data: {
                  isPremium: false,
                  subscriptionTier: null,
                  subscriptionExpiresAt: null,
                },
              });
            }
          }
          break;
      }

      return { processed: true };
    });
  }

  // Add jobs to queues
  async addEmailJob(data: any) {
    const queue = this.queues.get('email');
    if (queue) {
      await queue.add(data);
    }
  }

  async addNotificationJob(data: any) {
    const queue = this.queues.get('notification');
    if (queue) {
      await queue.add(data);
    }
  }

  async addModerationJob(data: any) {
    const queue = this.queues.get('moderation');
    if (queue) {
      await queue.add(data);
    }
  }

  async addSubscriptionJob(data: any) {
    const queue = this.queues.get('subscription');
    if (queue) {
      await queue.add(data);
    }
  }

  // Daily jobs
  async runDailyJobs() {
    // Reset daily pops
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await this.prisma.user.updateMany({
      where: {
        lastPopReset: {
          lt: yesterday,
        },
      },
      data: {
        dailyPops: 3,
        lastPopReset: new Date(),
      },
    });

    // Check expired subscriptions
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        isPremium: true,
        subscriptionExpiresAt: {
          lt: new Date(),
        },
      },
    });

    for (const user of expiredUsers) {
      await this.addSubscriptionJob({
        userId: user.id,
        action: 'expire',
        data: {},
      });
    }

    // Clean old balloons
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    await this.prisma.balloon.deleteMany({
      where: {
        createdAt: {
          lt: weekAgo,
        },
        isPopped: false,
      },
    });

    console.log('Daily jobs completed');
  }
}

export default WorkerService;
