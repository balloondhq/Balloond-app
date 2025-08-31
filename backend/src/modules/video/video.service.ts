// Video Profile Service
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';
import * as sharp from 'sharp';
import { SpeechClient } from '@google-cloud/speech';

@Injectable()
export class VideoService {
  private s3: S3;
  private speechClient: SpeechClient;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });

    this.speechClient = new SpeechClient({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT'),
      keyFilename: this.configService.get('GOOGLE_APPLICATION_CREDENTIALS'),
    });
  }

  async uploadVideoProfile(
    userId: string,
    videoBuffer: Buffer,
    mimeType: string
  ): Promise<any> {
    // Validate video
    const validation = await this.validateVideo(videoBuffer);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    // Process video
    const processedVideo = await this.processVideo(videoBuffer);
    
    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(videoBuffer);
    
    // Upload to S3
    const videoKey = `video-profiles/${userId}/${Date.now()}.mp4`;
    const thumbnailKey = `video-profiles/${userId}/thumbnail-${Date.now()}.jpg`;
    
    const [videoUrl, thumbnailUrl] = await Promise.all([
      this.uploadToS3(processedVideo, videoKey, 'video/mp4'),
      this.uploadToS3(thumbnail, thumbnailKey, 'image/jpeg'),
    ]);

    // Generate transcript
    const transcript = await this.generateTranscript(processedVideo);

    // Moderate content
    const moderationResult = await this.moderateVideoContent(processedVideo, transcript);
    
    // Save to database
    const videoProfile = await this.prisma.videoProfile.create({
      data: {
        userId,
        videoUrl,
        thumbnailUrl,
        duration: validation.duration,
        transcript,
        status: moderationResult.approved ? 'active' : 'rejected',
        moderationStatus: moderationResult.approved ? 'approved' : 'rejected',
      },
    });

    // Update user profile completion
    await this.updateProfileCompletion(userId);

    return videoProfile;
  }

  private async validateVideo(videoBuffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const tempPath = `/tmp/video-${Date.now()}.tmp`;
      require('fs').writeFileSync(tempPath, videoBuffer);

      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          resolve({ isValid: false, error: 'Invalid video format' });
          return;
        }

        const duration = metadata.format.duration || 0;
        const size = metadata.format.size || 0;

        // Cleanup
        require('fs').unlinkSync(tempPath);

        // Validation rules
        if (duration > 60) {
          resolve({ isValid: false, error: 'Video must be 60 seconds or less' });
        } else if (duration < 3) {
          resolve({ isValid: false, error: 'Video must be at least 3 seconds' });
        } else if (size > 50 * 1024 * 1024) {
          resolve({ isValid: false, error: 'Video must be less than 50MB' });
        } else {
          resolve({ isValid: true, duration: Math.round(duration) });
        }
      });
    });
  }

  private async processVideo(videoBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tempInput = `/tmp/input-${Date.now()}.tmp`;
      const tempOutput = `/tmp/output-${Date.now()}.mp4`;
      
      require('fs').writeFileSync(tempInput, videoBuffer);

      ffmpeg(tempInput)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('720x1280')
        .outputOptions([
          '-preset fast',
          '-crf 22',
          '-movflags +faststart',
        ])
        .on('end', () => {
          const processedBuffer = require('fs').readFileSync(tempOutput);
          
          // Cleanup
          require('fs').unlinkSync(tempInput);
          require('fs').unlinkSync(tempOutput);
          
          resolve(processedBuffer);
        })
        .on('error', reject)
        .save(tempOutput);
    });
  }

  private async generateThumbnail(videoBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tempPath = `/tmp/video-thumb-${Date.now()}.tmp`;
      require('fs').writeFileSync(tempPath, videoBuffer);

      ffmpeg(tempPath)
        .screenshots({
          timestamps: ['10%'],
          filename: 'thumbnail.jpg',
          folder: '/tmp',
          size: '360x640',
        })
        .on('end', async () => {
          const thumbnailPath = '/tmp/thumbnail.jpg';
          const thumbnailBuffer = require('fs').readFileSync(thumbnailPath);
          
          // Optimize with sharp
          const optimized = await sharp(thumbnailBuffer)
            .resize(360, 640, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer();
          
          // Cleanup
          require('fs').unlinkSync(tempPath);
          require('fs').unlinkSync(thumbnailPath);
          
          resolve(optimized);
        })
        .on('error', reject);
    });
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    };

    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  private async generateTranscript(videoBuffer: Buffer): Promise<string> {
    try {
      // Extract audio from video
      const audioBuffer = await this.extractAudio(videoBuffer);
      
      // Convert to base64 for Google Speech API
      const audioBase64 = audioBuffer.toString('base64');
      
      const request = {
        config: {
          encoding: 'MP3' as any,
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          model: 'latest_short',
        },
        audio: {
          content: audioBase64,
        },
      };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        ?.map(result => result.alternatives?.[0]?.transcript)
        .join(' ') || '';

      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      return '';
    }
  }

  private async extractAudio(videoBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tempInput = `/tmp/video-audio-${Date.now()}.tmp`;
      const tempOutput = `/tmp/audio-${Date.now()}.mp3`;
      
      require('fs').writeFileSync(tempInput, videoBuffer);

      ffmpeg(tempInput)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('end', () => {
          const audioBuffer = require('fs').readFileSync(tempOutput);
          
          // Cleanup
          require('fs').unlinkSync(tempInput);
          require('fs').unlinkSync(tempOutput);
          
          resolve(audioBuffer);
        })
        .on('error', reject)
        .save(tempOutput);
    });
  }

  private async moderateVideoContent(
    videoBuffer: Buffer,
    transcript: string
  ): Promise<{ approved: boolean; reasons?: string[] }> {
    // Text moderation
    const textModeration = await this.moderateText(transcript);
    if (!textModeration.approved) {
      return textModeration;
    }

    // Visual moderation (using AI service)
    const visualModeration = await this.moderateVisualContent(videoBuffer);
    if (!visualModeration.approved) {
      return visualModeration;
    }

    return { approved: true };
  }

  private async moderateText(text: string): Promise<any> {
    // Implement text moderation logic
    const bannedWords = ['offensive', 'inappropriate', 'explicit'];
    const lowerText = text.toLowerCase();
    
    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        return { approved: false, reasons: ['Inappropriate content detected'] };
      }
    }

    return { approved: true };
  }

  private async moderateVisualContent(videoBuffer: Buffer): Promise<any> {
    // Implement visual content moderation
    // This would typically use a service like AWS Rekognition or Google Vision
    return { approved: true };
  }

  private async updateProfileCompletion(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        videoProfiles: true,
        photos: true,
        interests: true,
      },
    });

    if (!user) return;

    let completionScore = 0;
    
    // Basic info: 30%
    if (user.name && user.bio && user.age) completionScore += 30;
    
    // Photos: 20%
    if (user.photos.length >= 3) completionScore += 20;
    else completionScore += (user.photos.length / 3) * 20;
    
    // Video profile: 20%
    if (user.videoProfiles.some(v => v.status === 'active')) completionScore += 20;
    
    // Prompts: 15%
    if (user.prompts?.length >= 3) completionScore += 15;
    
    // Interests: 15%
    if (user.interests.length >= 5) completionScore += 15;
    else completionScore += (user.interests.length / 5) * 15;

    await this.prisma.userEngagementMetrics.upsert({
      where: { userId },
      create: {
        userId,
        profileCompletionScore: completionScore / 100,
      },
      update: {
        profileCompletionScore: completionScore / 100,
        updatedAt: new Date(),
      },
    });
  }

  async getVideoProfile(userId: string): Promise<any> {
    return await this.prisma.videoProfile.findFirst({
      where: {
        userId,
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteVideoProfile(userId: string, videoId: string): Promise<void> {
    const video = await this.prisma.videoProfile.findFirst({
      where: {
        id: videoId,
        userId,
      },
    });

    if (!video) {
      throw new BadRequestException('Video not found');
    }

    // Delete from S3
    const videoKey = video.videoUrl.split('/').slice(-2).join('/');
    const thumbnailKey = video.thumbnailUrl.split('/').slice(-2).join('/');

    await Promise.all([
      this.s3.deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: `video-profiles/${videoKey}`,
      }).promise(),
      this.s3.deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: `video-profiles/${thumbnailKey}`,
      }).promise(),
    ]);

    // Delete from database
    await this.prisma.videoProfile.delete({
      where: { id: videoId },
    });

    // Update profile completion
    await this.updateProfileCompletion(userId);
  }
}