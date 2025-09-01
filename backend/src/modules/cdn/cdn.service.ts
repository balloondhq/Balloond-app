import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Readable } from 'stream';

interface MediaOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'webp' | 'avif' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface VideoOptions {
  resolution?: '240p' | '360p' | '480p' | '720p' | '1080p';
  bitrate?: string;
  codec?: string;
  format?: 'mp4' | 'webm';
  thumbnail?: boolean;
}

@Injectable()
export class CDNService {
  private s3: AWS.S3;
  private cloudfront: AWS.CloudFront;
  private readonly CDN_URL: string;
  private readonly BUCKET_NAME: string;
  
  // Image size presets
  private readonly IMAGE_PRESETS = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    small: { width: 320, height: 320, quality: 85 },
    medium: { width: 640, height: 640, quality: 85 },
    large: { width: 1280, height: 1280, quality: 90 },
    original: { quality: 95 },
  };
  
  // Video resolution presets
  private readonly VIDEO_PRESETS = {
    '240p': { width: 426, height: 240, bitrate: '350k' },
    '360p': { width: 640, height: 360, bitrate: '750k' },
    '480p': { width: 854, height: 480, bitrate: '1000k' },
    '720p': { width: 1280, height: 720, bitrate: '2500k' },
    '1080p': { width: 1920, height: 1080, bitrate: '4500k' },
  };

  constructor(private configService: ConfigService) {
    this.initializeAWS();
    this.CDN_URL = this.configService.get('CDN_URL', 'https://cdn.balloond.app');
    this.BUCKET_NAME = this.configService.get('S3_BUCKET', 'balloond-media');
  }

  private initializeAWS() {
    AWS.config.update({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    });

    this.s3 = new AWS.S3({
      signatureVersion: 'v4',
      httpOptions: {
        timeout: 300000, // 5 minutes
      },
    });

    this.cloudfront = new AWS.CloudFront();
  }

  // Upload and optimize image
  async uploadImage(
    buffer: Buffer,
    userId: string,
    type: 'profile' | 'verification' | 'balloon',
    options?: MediaOptions
  ): Promise<{ url: string; variants: { [key: string]: string } }> {
    const imageId = uuidv4();
    const variants: { [key: string]: string } = {};

    // Generate multiple variants
    for (const [preset, config] of Object.entries(this.IMAGE_PRESETS)) {
      if (preset === 'original' && type !== 'profile') continue;

      const optimized = await this.optimizeImage(buffer, {
        ...config,
        format: options?.format || 'webp',
      });

      const key = `${type}/${userId}/${imageId}/${preset}.webp`;
      const url = await this.uploadToS3(optimized, key, 'image/webp');
      variants[preset] = url;
    }

    // Generate AVIF variant for modern browsers
    const avifBuffer = await this.optimizeImage(buffer, {
      ...this.IMAGE_PRESETS.medium,
      format: 'avif',
    });
    const avifKey = `${type}/${userId}/${imageId}/medium.avif`;
    variants.avif = await this.uploadToS3(avifBuffer, avifKey, 'image/avif');

    return {
      url: variants.medium || variants.small,
      variants,
    };
  }

  // Optimize image
  private async optimizeImage(
    input: Buffer,
    options: MediaOptions
  ): Promise<Buffer> {
    let pipeline = sharp(input);

    // Resize if dimensions specified
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit || 'cover',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific optimizations
    switch (options.format) {
      case 'webp':
        pipeline = pipeline.webp({
          quality: options.quality || 85,
          effort: 6,
        });
        break;
      case 'avif':
        pipeline = pipeline.avif({
          quality: options.quality || 80,
          effort: 6,
        });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: options.quality || 85,
          progressive: true,
          mozjpeg: true,
        });
        break;
      default:
        pipeline = pipeline.webp({ quality: options.quality || 85 });
    }

    // Add metadata
    pipeline = pipeline.withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Balloon\'d',
          Software: 'Balloon\'d App',
        },
      },
    });

    return pipeline.toBuffer();
  }

  // Upload video with transcoding
  async uploadVideo(
    buffer: Buffer,
    userId: string,
    type: 'profile' | 'message',
    options?: VideoOptions
  ): Promise<{ url: string; thumbnail?: string; duration?: number }> {
    const videoId = uuidv4();
    const resolution = options?.resolution || '720p';
    const preset = this.VIDEO_PRESETS[resolution];

    // Upload original
    const originalKey = `video/${type}/${userId}/${videoId}/original.mp4`;
    await this.uploadToS3(buffer, originalKey, 'video/mp4');

    // Transcode video
    const transcodedBuffer = await this.transcodeVideo(buffer, preset);
    const transcodedKey = `video/${type}/${userId}/${videoId}/${resolution}.mp4`;
    const url = await this.uploadToS3(transcodedBuffer, transcodedKey, 'video/mp4');

    // Generate thumbnail if requested
    let thumbnail: string | undefined;
    if (options?.thumbnail) {
      const thumbnailBuffer = await this.generateVideoThumbnail(buffer);
      const thumbnailKey = `video/${type}/${userId}/${videoId}/thumbnail.jpg`;
      thumbnail = await this.uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');
    }

    // Get video duration
    const duration = await this.getVideoDuration(buffer);

    return { url, thumbnail, duration };
  }

  // Transcode video
  private async transcodeVideo(
    input: Buffer,
    preset: any
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new Readable();
      stream.push(input);
      stream.push(null);

      ffmpeg(stream)
        .outputOptions([
          `-vf scale=${preset.width}:${preset.height}`,
          `-b:v ${preset.bitrate}`,
          '-codec:v libx264',
          '-preset medium',
          '-movflags +faststart',
          '-codec:a aac',
          '-b:a 128k',
        ])
        .format('mp4')
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)))
        .pipe()
        .on('data', (chunk: Buffer) => chunks.push(chunk));
    });
  }

  // Generate video thumbnail
  private async generateVideoThumbnail(input: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new Readable();
      stream.push(input);
      stream.push(null);

      ffmpeg(stream)
        .screenshots({
          timestamps: ['50%'],
          filename: 'thumbnail.jpg',
          size: '640x360',
        })
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)))
        .pipe()
        .on('data', (chunk: Buffer) => chunks.push(chunk));
    });
  }

  // Get video duration
  private async getVideoDuration(input: Buffer): Promise<number> {
    return new Promise((resolve, reject) => {
      const stream = new Readable();
      stream.push(input);
      stream.push(null);

      ffmpeg.ffprobe(stream as any, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  // Upload to S3
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year
      Metadata: {
        'uploaded-at': new Date().toISOString(),
      },
    };

    await this.s3.upload(params).promise();
    return `${this.CDN_URL}/${key}`;
  }

  // Delete media
  async deleteMedia(url: string): Promise<boolean> {
    try {
      const key = url.replace(`${this.CDN_URL}/`, '');
      await this.s3.deleteObject({
        Bucket: this.BUCKET_NAME,
        Key: key,
      }).promise();
      
      // Invalidate CloudFront cache
      await this.invalidateCache([`/${key}`]);
      
      return true;
    } catch (error) {
      console.error('Failed to delete media:', error);
      return false;
    }
  }

  // Invalidate CloudFront cache
  async invalidateCache(paths: string[]): Promise<void> {
    const distributionId = this.configService.get('CLOUDFRONT_DISTRIBUTION_ID');
    if (!distributionId) return;

    try {
      await this.cloudfront.createInvalidation({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      }).promise();
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }

  // Generate signed URL for private content
  generateSignedUrl(key: string, expiresIn = 3600): string {
    const url = new AWS.CloudFront.Signer(
      this.configService.get('CLOUDFRONT_KEY_PAIR_ID'),
      this.configService.get('CLOUDFRONT_PRIVATE_KEY')
    ).getSignedUrl({
      url: `${this.CDN_URL}/${key}`,
      expires: Math.floor(Date.now() / 1000) + expiresIn,
    });
    
    return url;
  }

  // Get media metadata
  async getMediaMetadata(url: string): Promise<any> {
    try {
      const key = url.replace(`${this.CDN_URL}/`, '');
      const response = await this.s3.headObject({
        Bucket: this.BUCKET_NAME,
        Key: key,
      }).promise();
      
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('Failed to get media metadata:', error);
      return null;
    }
  }

  // Batch upload optimization
  async batchUpload(
    files: { buffer: Buffer; key: string; contentType: string }[]
  ): Promise<string[]> {
    const uploadPromises = files.map(file =>
      this.uploadToS3(file.buffer, file.key, file.contentType)
    );
    
    return Promise.all(uploadPromises);
  }

  // Clean up old media
  async cleanupOldMedia(userId: string, keepRecent = 5): Promise<number> {
    try {
      const prefix = `profile/${userId}/`;
      const objects = await this.s3.listObjectsV2({
        Bucket: this.BUCKET_NAME,
        Prefix: prefix,
      }).promise();
      
      if (!objects.Contents || objects.Contents.length <= keepRecent) {
        return 0;
      }
      
      // Sort by last modified and keep recent
      const sorted = objects.Contents.sort((a, b) => 
        (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
      );
      
      const toDelete = sorted.slice(keepRecent);
      
      if (toDelete.length > 0) {
        await this.s3.deleteObjects({
          Bucket: this.BUCKET_NAME,
          Delete: {
            Objects: toDelete.map(obj => ({ Key: obj.Key! })),
          },
        }).promise();
      }
      
      return toDelete.length;
    } catch (error) {
      console.error('Failed to cleanup old media:', error);
      return 0;
    }
  }
}

export default CDNService;
