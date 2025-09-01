import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SimpleCDNService } from '../cdn/cdn-simple.service';

@Injectable()
export class SimpleVideoService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private cdnService: SimpleCDNService
  ) {}

  async uploadVideoProfile(
    userId: string,
    videoBuffer: Buffer,
    mimeType: string
  ): Promise<any> {
    // Basic validation
    if (videoBuffer.length > 50 * 1024 * 1024) {
      throw new BadRequestException('Video must be less than 50MB');
    }

    // Upload video without processing (simplified for deployment)
    const result = await this.cdnService.uploadImage(
      videoBuffer,
      userId,
      'profile'
    );

    // Create a simple video profile record
    const videoProfile = {
      id: 'video-' + Date.now(),
      userId,
      videoUrl: result.url,
      thumbnailUrl: result.url, // Same as video for simplicity
      duration: 30, // Default duration
      transcript: '',
      status: 'active',
      moderationStatus: 'approved',
      createdAt: new Date(),
    };

    console.log('Video profile created (simplified):', videoProfile);
    return videoProfile;
  }

  async getVideoProfile(userId: string): Promise<any> {
    // Return null for now - can be implemented when database is connected
    return null;
  }

  async deleteVideoProfile(userId: string, videoId: string): Promise<void> {
    // Simplified deletion - just log for now
    console.log(`Deleting video profile ${videoId} for user ${userId}`);
  }
}
