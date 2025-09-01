import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

interface MediaOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'webp' | 'avif' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

@Injectable()
export class SimpleCDNService {
  private s3: AWS.S3;
  private readonly CDN_URL: string;
  private readonly BUCKET_NAME: string;

  constructor(private configService: ConfigService) {
    this.initializeAWS();
    this.CDN_URL = this.configService.get('CDN_URL', 'https://cdn.balloond.app');
    this.BUCKET_NAME = this.configService.get('S3_BUCKET', 'balloond-media');
  }

  private initializeAWS() {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    
    if (accessKeyId && secretAccessKey) {
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });

      this.s3 = new AWS.S3({
        signatureVersion: 'v4',
      });
    } else {
      console.warn('AWS credentials not configured - CDN functionality disabled');
    }
  }

  // Simple image upload without processing
  async uploadImage(
    buffer: Buffer,
    userId: string,
    type: 'profile' | 'verification' | 'balloon',
    options?: MediaOptions
  ): Promise<{ url: string; variants: { [key: string]: string } }> {
    const imageId = uuidv4();
    const key = `${type}/${userId}/${imageId}/original.jpg`;
    
    const url = await this.uploadToS3(buffer, key, 'image/jpeg');
    
    return {
      url,
      variants: {
        original: url,
        medium: url, // Same URL for simplicity
      },
    };
  }

  // Upload to S3
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    if (!this.s3) {
      // Fallback - return a placeholder URL
      return `https://placeholder.balloond.app/${key}`;
    }

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('S3 upload failed:', error);
      return `https://placeholder.balloond.app/${key}`;
    }
  }

  // Delete media
  async deleteMedia(url: string): Promise<boolean> {
    if (!this.s3) return true;

    try {
      const key = url.replace(`${this.CDN_URL}/`, '');
      await this.s3.deleteObject({
        Bucket: this.BUCKET_NAME,
        Key: key,
      }).promise();
      
      return true;
    } catch (error) {
      console.error('Failed to delete media:', error);
      return false;
    }
  }
}
