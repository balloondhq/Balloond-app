import { IsString, IsEnum, IsOptional, IsNumber, IsUrl } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;
}

export class SendVoiceMessageDto {
  @IsString()
  audioData: string; // Base64 encoded audio

  @IsNumber()
  duration: number; // Duration in seconds

  @IsOptional()
  @IsString()
  format?: string; // Audio format (webm, mp3, etc.)
}

export class TypingIndicatorDto {
  @IsString()
  chatId: string;

  @IsString()
  isTyping: boolean;
}

export class MarkReadDto {
  @IsString()
  chatId: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

export class DeleteMessageDto {
  @IsString()
  messageId: string;
}
