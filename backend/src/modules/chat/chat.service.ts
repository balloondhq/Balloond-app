/**
 * Enhanced Chat service with voice message support
 * Handles chat data operations including voice messages
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto, SendVoiceMessageDto } from './dto/chat.dto';
import { MessageType, Platform } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';

@Injectable()
export class ChatService {
  private s3: AWS.S3;
  private firebaseAdmin: admin.app.App;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Configure AWS S3 for voice message storage
    AWS.config.update({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
    this.s3 = new AWS.S3();

    // Initialize Firebase Admin for push notifications
    if (!admin.apps.length) {
      this.firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.firebaseAdmin = admin.app();
    }
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string) {
    // Check for blocks
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedUserId: userId },
        ],
      },
    });

    const blockedUserIds = [
      ...blocks.filter(b => b.blockerId === userId).map(b => b.blockedUserId),
      ...blocks.filter(b => b.blockedUserId === userId).map(b => b.blockerId),
    ];

    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
        isBlocked: false,
      },
      include: {
        participants: {
          where: {
            userId: { notIn: blockedUserIds },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photos: true,
                lastSeen: true,
                isVerified: true,
                subscriptionTier: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        match: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photos: true,
              },
            },
            matchedUser: {
              select: {
                id: true,
                name: true,
                photos: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Format chats with other user info and unread count
    const formattedChats = await Promise.all(
      chats.map(async chat => {
        const otherParticipant = chat.participants.find(p => p.userId !== userId);
        
        // Get unread count
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            isRead: false,
            isDeleted: false,
          },
        });

        return {
          ...chat,
          otherUser: otherParticipant?.user,
          lastMessage: chat.messages[0] || null,
          unreadCount,
        };
      })
    );

    return formattedChats;
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photos: true,
                bio: true,
                lastSeen: true,
                isVerified: true,
                subscriptionTier: true,
              },
            },
          },
        },
        match: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this chat');
    }

    // Check if chat is blocked
    if (chat.isBlocked) {
      throw new ForbiddenException('This chat has been blocked');
    }

    const otherParticipant = chat.participants.find(p => p.userId !== userId);
    return {
      ...chat,
      otherUser: otherParticipant?.user,
    };
  }

  /**
   * Get messages in a chat with pagination
   */
  async getChatMessages(chatId: string, userId: string, limit = 50, before?: string) {
    // Verify user is participant
    await this.verifyParticipant(chatId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Send a text message
   */
  async sendMessage(userId: string, chatId: string, messageDto: SendMessageDto) {
    // Verify user is participant and chat is not blocked
    await this.verifyParticipant(chatId, userId);
    await this.checkChatBlocked(chatId);

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: messageDto.content,
        messageType: messageDto.messageType || MessageType.TEXT,
        mediaUrl: messageDto.mediaUrl,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photos: true,
          },
        },
      },
    });

    // Update chat's last message timestamp
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    // Send push notification
    await this.sendPushNotification(chatId, userId, message);

    return message;
  }

  /**
   * Send a voice message
   */
  async sendVoiceMessage(userId: string, chatId: string, voiceData: SendVoiceMessageDto) {
    // Verify user is participant and chat is not blocked
    await this.verifyParticipant(chatId, userId);
    await this.checkChatBlocked(chatId);

    // Validate duration (max 60 seconds)
    if (voiceData.duration > 60) {
      throw new BadRequestException('Voice messages cannot exceed 60 seconds');
    }

    // Upload voice file to S3
    const voiceKey = `voice-messages/${chatId}/${userId}/${Date.now()}.${voiceData.format || 'webm'}`;
    const voiceBuffer = Buffer.from(voiceData.audioData, 'base64');

    await this.s3.putObject({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: voiceKey,
      Body: voiceBuffer,
      ContentType: `audio/${voiceData.format || 'webm'}`,
    }).promise();

    const voiceUrl = `https://${this.configService.get('AWS_S3_BUCKET')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${voiceKey}`;

    // Create message record
    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        messageType: MessageType.VOICE,
        mediaUrl: voiceUrl,
        mediaDuration: voiceData.duration,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photos: true,
          },
        },
      },
    });

    // Update chat's last message timestamp
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    // Send push notification
    await this.sendPushNotification(chatId, userId, message);

    return message;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string, userId: string) {
    await this.verifyParticipant(chatId, userId);

    // Update all unread messages from other user
    await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Update participant's last read
    await this.prisma.chatParticipant.update({
      where: {
        chatId_userId: { chatId, userId },
      },
      data: {
        lastRead: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Cannot delete message from another user');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    return { success: true };
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    await this.verifyParticipant(chatId, userId);

    await this.prisma.chatParticipant.update({
      where: {
        chatId_userId: { chatId, userId },
      },
      data: {
        isTyping,
      },
    });

    return { success: true };
  }

  /**
   * Register push notification token
   */
  async registerPushToken(userId: string, token: string, platform: Platform) {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
      update: {
        userId,
        isActive: true,
      },
    });

    return { success: true };
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(chatId: string, senderId: string, message: any) {
    try {
      // Get chat participants
      const participants = await this.prisma.chatParticipant.findMany({
        where: {
          chatId,
          userId: { not: senderId },
          notificationsEnabled: true,
        },
        include: {
          user: {
            include: {
              pushTokens: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      // Get sender info
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true },
      });

      // Prepare notification payload
      const notification = {
        title: sender?.name || 'New Message',
        body: message.messageType === MessageType.TEXT 
          ? message.content 
          : message.messageType === MessageType.VOICE 
          ? '🎤 Voice message'
          : '📷 Image',
        data: {
          chatId,
          messageId: message.id,
          senderId,
        },
      };

      // Send notifications to all recipient tokens
      const tokens = participants.flatMap(p => p.user.pushTokens.map(t => t.token));
      
      if (tokens.length > 0) {
        const multicastMessage = {
          notification,
          tokens,
          android: {
            priority: 'high' as const,
            notification: {
              sound: 'default',
              channelId: 'messages',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        const response = await this.firebaseAdmin.messaging().sendMulticast(multicastMessage);
        
        // Handle failed tokens
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(tokens[idx]);
            }
          });

          // Deactivate failed tokens
          await this.prisma.pushToken.updateMany({
            where: { token: { in: failedTokens } },
            data: { isActive: false },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Verify user is participant in chat
   */
  private async verifyParticipant(chatId: string, userId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not authorized to access this chat');
    }

    return participant;
  }

  /**
   * Check if chat is blocked
   */
  private async checkChatBlocked(chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { isBlocked: true },
    });

    if (chat?.isBlocked) {
      throw new ForbiddenException('This chat has been blocked');
    }
  }
}
