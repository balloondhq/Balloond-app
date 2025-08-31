/**
 * Chat controller
 * Handles chat and messaging endpoints
 */

import { Controller, Get, Post, Delete, Body, Request, UseGuards, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, SendVoiceMessageDto } from './dto/chat.dto';
import { Platform } from '@prisma/client';

@ApiTags('chat')
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all chat conversations' })
  async getConversations(@Request() req) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get('conversations/:chatId')
  @ApiOperation({ summary: 'Get specific chat conversation' })
  async getConversation(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.getChatById(chatId, req.user.id);
  }

  @Get('conversations/:chatId/messages')
  @ApiOperation({ summary: 'Get messages in a chat' })
  async getMessages(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.getChatMessages(chatId, req.user.id);
  }

  @Post('conversations/:chatId/messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @Request() req,
    @Param('chatId') chatId: string,
    @Body() messageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, chatId, messageDto);
  }

  @Post('conversations/:chatId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.markMessagesAsRead(chatId, req.user.id);
  }

  @Post('conversations/:chatId/voice')
  @ApiOperation({ summary: 'Send a voice message' })
  async sendVoiceMessage(
    @Request() req,
    @Param('chatId') chatId: string,
    @Body() voiceDto: SendVoiceMessageDto,
  ) {
    return this.chatService.sendVoiceMessage(req.user.id, chatId, voiceDto);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  async registerPushToken(
    @Request() req,
    @Body() body: { token: string; platform: Platform },
  ) {
    return this.chatService.registerPushToken(req.user.id, body.token, body.platform);
  }

  @Post('conversations/:chatId/typing')
  @ApiOperation({ summary: 'Update typing status' })
  async updateTyping(
    @Request() req,
    @Param('chatId') chatId: string,
    @Body() body: { isTyping: boolean },
  ) {
    return this.chatService.updateTypingStatus(chatId, req.user.id, body.isTyping);
  }
}
