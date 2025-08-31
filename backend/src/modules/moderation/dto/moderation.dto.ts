import { IsEnum, IsString, IsOptional, IsArray, IsUrl, IsBase64, IsNumber } from 'class-validator';
import { ReportType, ReportStatus, VerificationStatus } from '@prisma/client';

export class CreateReportDto {
  @IsString()
  reportedUserId: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidence?: string[];
}

export class UpdateReportDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  moderatorNotes?: string;
}

export class BlockUserDto {
  @IsString()
  blockedUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class VerifyPhotoDto {
  @IsString()
  @IsUrl()
  verificationPhoto: string;
}

export class ModeratePhotoDto {
  @IsString()
  userId: string;

  @IsString()
  @IsUrl()
  photoUrl: string;
}

export class ModerationDecisionDto {
  @IsString()
  photoModerationId: string;

  @IsString()
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  moderatorNotes?: string;
}

export class BanUserDto {
  @IsString()
  userId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  duration?: string; // e.g., '7d', '30d', 'permanent'
}

// New DTOs for Phase 2 features

export class ReportContentDto {
  @IsEnum(['USER', 'MESSAGE'])
  contentType: string;

  @IsString()
  contentId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class VerifyProfileDto {
  @IsBase64()
  selfieData: string; // Base64 encoded selfie image

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  verificationType?: 'SELFIE' | 'ID' | 'BOTH';
}

export class ScanImageDto {
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsString()
  scanType?: 'NUDITY' | 'VIOLENCE' | 'ALL';
}

export class ReviewModerationDto {
  @IsEnum(['APPROVE', 'REJECT', 'ESCALATE'])
  action: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class PhotoUploadDto {
  @IsBase64()
  photoData: string;

  @IsOptional()
  @IsString()
  photoType?: string; // profile, verification, etc.

  @IsOptional()
  @IsNumber()
  position?: number; // Position in photo array
}

export class GetModerationQueueDto {
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class ProcessVerificationDto {
  @IsString()
  verificationId: string;

  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_NEW'])
  action: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class AppealDecisionDto {
  @IsString()
  appealId: string;

  @IsEnum(['ACCEPT', 'REJECT'])
  decision: string;

  @IsString()
  reason: string;
}
