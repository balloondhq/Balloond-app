/**
 * WebSocket gateway for real-time chat
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove from userSockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Store user-socket mapping
    this.userSockets.set(data.userId, client.id);
    client.emit('authenticated', { success: true });
  }

  @SubscribeMessage('join-chat')
  handleJoinChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`chat-${data.chatId}`);
    client.emit('joined-chat', { chatId: data.chatId });
  }

  @SubscribeMessage('leave-chat')
  handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`chat-${data.chatId}`);
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() data: { chatId: string; userId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Save message to database
    const message = await this.chatService.sendMessage(data.userId, data.chatId, {
      content: data.content,
    });

    // Emit to all participants in the chat room
    this.server.to(`chat-${data.chatId}`).emit('new-message', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast typing status to other participants
    client.to(`chat-${data.chatId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('send-voice-message')
  async handleVoiceMessage(
    @MessageBody() data: { 
      chatId: string; 
      userId: string; 
      audioData: string; 
      duration: number;
      format?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Save voice message to database and S3
    const message = await this.chatService.sendVoiceMessage(data.userId, data.chatId, {
      audioData: data.audioData,
      duration: data.duration,
      format: data.format,
    });

    // Emit to all participants in the chat room
    this.server.to(`chat-${data.chatId}`).emit('new-voice-message', message);
  }

  @SubscribeMessage('message-read')
  async handleMessageRead(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Mark messages as read
    await this.chatService.markMessagesAsRead(data.chatId, data.userId);
    
    // Notify other participants
    client.to(`chat-${data.chatId}`).emit('messages-read', {
      chatId: data.chatId,
      userId: data.userId,
    });
  }

  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; userId: string; chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Delete message
    await this.chatService.deleteMessage(data.messageId, data.userId);
    
    // Notify all participants
    this.server.to(`chat-${data.chatId}`).emit('message-deleted', {
      messageId: data.messageId,
    });
  }
}
