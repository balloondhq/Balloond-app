/**
 * Matching DTOs
 */

import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PopType } from '@prisma/client';

export class PopBalloonDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ enum: PopType, example: PopType.SINGLE })
  @IsEnum(PopType)
  popType: PopType;
}

export class BalloonDto {
  userId: string;
  isPopped: boolean;
  popType: PopType | null;
  preview?: {
    photos: string[];
    name: string;
  };
}

export class MatchDto {
  id: string;
  userId: string;
  matchedUserId: string;
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    bio?: string;
    age?: number;
  };
  chatId?: string;
  createdAt: Date;
}
