/**
 * Health Check Controller
 * Provides health status for monitoring
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    s3: ServiceHealth;
    firebase: ServiceHealth;
    stripe: ServiceHealth;
  };
  metrics?: {
    activeUsers: number;
    activeChats: number;
    queuedJobs: number;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private redis: Redis.Redis;
  private startTime: Date;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.startTime = new Date();
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  async health(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with service status' })
  async detailedHealth(): Promise<HealthStatus> {
    const services = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
      this.checkFirebase(),
      this.checkStripe(),
    ]);

    const [database, redis, s3, firebase, stripe] = services;
    
    // Determine overall status
    const unhealthyServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    // Get metrics if services are healthy
    let metrics;
    if (database.status === 'up' && redis.status === 'up') {
      metrics = await this.getMetrics();
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      services: {
        database,
        redis,
        s3,
        firebase,
        stripe,
      },
      metrics,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  async liveness(): Promise<{ status: string }> {
    // Simple check to see if the app is running
    return { status: 'alive' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async readiness(): Promise<{ status: string; ready: boolean }> {
    // Check if critical services are available
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.ping();
      return { status: 'ready', ready: true };
    } catch (error) {
      return { status: 'not_ready', ready: false };
    }
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      return {
        status: responseTime < 100 ? 'up' : 'degraded',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const result = await this.redis.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: result === 'PONG' && responseTime < 50 ? 'up' : 'degraded',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkS3(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check AWS S3 connectivity
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        region: this.configService.get('AWS_REGION'),
      });

      await s3.headBucket({ Bucket: this.configService.get('AWS_S3_BUCKET') }).promise();
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 500 ? 'up' : 'degraded',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkFirebase(): Promise<ServiceHealth> {
    try {
      // Check Firebase Admin SDK initialization
      const admin = require('firebase-admin');
      if (admin.apps.length > 0) {
        return { status: 'up' };
      } else {
        return { status: 'down', error: 'Firebase not initialized' };
      }
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkStripe(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check Stripe API connectivity
      const stripe = require('stripe')(this.configService.get('STRIPE_SECRET_KEY'));
      await stripe.balance.retrieve();
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 1000 ? 'up' : 'degraded',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async getMetrics() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const [activeUsers, activeChats, queuedJobs] = await Promise.all([
        this.prisma.user.count({
          where: {
            lastSeen: {
              gte: fiveMinutesAgo,
            },
          },
        }),
        this.prisma.chat.count({
          where: {
            lastMessageAt: {
              gte: fiveMinutesAgo,
            },
          },
        }),
        this.getQueuedJobsCount(),
      ]);

      return {
        activeUsers,
        activeChats,
        queuedJobs,
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return undefined;
    }
  }

  private async getQueuedJobsCount(): Promise<number> {
    try {
      const queues = ['images', 'notifications', 'moderation', 'verification'];
      let total = 0;

      for (const queueName of queues) {
        const count = await this.redis.llen(`bull:${queueName}:wait`);
        total += count;
      }

      return total;
    } catch (error) {
      console.error('Failed to get queued jobs count:', error);
      return 0;
    }
  }
}
