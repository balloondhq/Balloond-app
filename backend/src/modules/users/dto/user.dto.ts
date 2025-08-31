/**
 * User DTOs
 */

import { IsString, IsNumber, IsOptional, IsArray, Min, Max, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false, minimum: 18, maximum: 99 })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(99)
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  prompts?: any;

  @ApiProperty({ required: false, minimum: 18, maximum: 99 })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(99)
  minAge?: number;

  @ApiProperty({ required: false, minimum: 18, maximum: 99 })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(99)
  maxAge?: number;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 51.5074 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -0.1278 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 50, minimum: 5, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  radius?: number;
}

export class UserProfileDto {
  id: string;
  email: string;
  name: string;
  bio?: string;
  age?: number;
  photos: string[];
  prompts?: any;
  isVerified: boolean;
  createdAt: Date;
}
