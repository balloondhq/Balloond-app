/**
 * Chat Service
 * Handles chat and messaging operations with voice message support
 */

import { apiService } from './apiService';
import { API_ENDPOINTS } from '../config/api';
import io, { Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';
import { Platform } from 'react-native';

interface Chat {
  id: string;
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    lastSeen: Date;
    isVerified?: boolean;
    subscriptionTier?: string;
  };
  lastMessage?: {
    content?: string;
    messageType: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO';
    createdAt: Date;
    senderId: string;
  };
  unreadCount: number;
  isBlocked?: boolean;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  messageType: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO';
  mediaUrl?: string;
  mediaDuration?: number;
  isRead: boolean;
  isDeleted?: boolean;
  sender: {
    id: string;
    name: string;
    photos: string[];
  };
  createdAt: Date;
}

interface SendMessageDto {
  content?: string;
  messageType?: 'TEXT' | 'IMAGE' | 'VOICE' | 'VIDEO';
  mediaUrl?: string;
}

interface SendVoiceMessageDto {
  audioData: string; // Base64 encoded audio
  duration: number; // Duration in seconds
  format?: string; // Audio format (webm, mp3, etc.)
}

class ChatService {
  private socket: Socket | null = null;
  private messageCallbacks: Map<string, (message: Message) => void> = new Map();
  private voiceMessageCallbacks: Map<string, (message: Message) => void> = new Map();
  private typingCallbacks: Map<string, (data: { userId: string; isTyping: boolean }) => void> = new Map();
  private messageDeleteCallbacks: Map<string, (messageId: string) => void> = new Map();

  // Get all conversations
  async getConversations(): Promise<Chat[]> {
    return apiService.get<Chat[]>(API_ENDPOINTS.GET_CONVERSATIONS);
  }

  // Get a specific conversation
  async getConversation(chatId: string): Promise<Chat> {
    return apiService.get<Chat>(`${API_ENDPOINTS.GET_CONVERSATIONS}/${chatId}`);
  }

  // Get messages in a chat with pagination
  async getChatMessages(chatId: string, limit = 50, before?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    return apiService.get<Message[]>(`${API_ENDPOINTS.GET_MESSAGES}/${chatId}/messages?${params}`);
  }

  // Send a text message
  async sendMessage(chatId: string, message: SendMessageDto): Promise<Message> {
    return apiService.post<Message>(`${API_ENDPOINTS.SEND_MESSAGE}/${chatId}/messages`, message);
  }

  // Send a voice message
  async sendVoiceMessage(chatId: string, voiceData: SendVoiceMessageDto): Promise<Message> {
    return apiService.post<Message>(`/chat/conversations/${chatId}/voice`, voiceData);
  }

  // Mark messages as read
  async markMessagesAsRead(chatId: string): Promise<{ success: boolean }> {
    return apiService.post(`${API_ENDPOINTS.MARK_READ}/${chatId}/read`);
  }

  // Delete a message
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return apiService.delete(`/chat/messages/${messageId}`);
  }

  // Update typing status
  async updateTypingStatus(chatId: string, isTyping: boolean): Promise<{ success: boolean }> {
    return apiService.post(`/chat/conversations/${chatId}/typing`, { isTyping });
  }

  // Register push notification token
  async registerPushToken(token: string, platform: string): Promise<{ success: boolean }> {
    return apiService.post('/chat/push-token', {
      token,
      platform: platform.toUpperCase() as 'IOS' | 'ANDROID',
    });
  }

  // Report content (user or message)
  async reportContent(data: {
    contentType: 'USER' | 'MESSAGE';
    contentId: string;
    reason: string;
    description?: string;
  }): Promise<{ success: boolean }> {
    return apiService.post('/moderation/report', data);
  }

  // Block a user
  async blockUser(userId: string): Promise<{ success: boolean }> {
    return apiService.post('/moderation/block', { userId });
  }

  // Unblock a user
  async unblockUser(userId: string): Promise<{ success: boolean }> {
    return apiService.delete(`/moderation/block/${userId}`);
  }

  // WebSocket connection for real-time messaging
  connectSocket(userId: string) {
    if (this.socket?.connected) return;

    this.socket = io(API_CONFIG.WS_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket?.emit('authenticate', { userId });
    });

    this.socket.on('authenticated', () => {
      console.log('Socket authenticated');
    });

    // Listen for text messages
    this.socket.on('new-message', (message: Message) => {
      const callback = this.messageCallbacks.get(message.chatId);
      if (callback) {
        callback(message);
      }
    });

    // Listen for voice messages
    this.socket.on('new-voice-message', (message: Message) => {
      const callback = this.voiceMessageCallbacks.get(message.chatId) || 
                       this.messageCallbacks.get(message.chatId);
      if (callback) {
        callback(message);
      }
    });

    // Listen for typing indicators
    this.socket.on('user-typing', (data: { userId: string; isTyping: boolean; chatId?: string }) => {
      if (data.chatId) {
        const callback = this.typingCallbacks.get(data.chatId);
        if (callback) {
          callback({ userId: data.userId, isTyping: data.isTyping });
        }
      }
    });

    // Listen for deleted messages
    this.socket.on('message-deleted', (data: { messageId: string; chatId?: string }) => {
      if (data.chatId) {
        const callback = this.messageDeleteCallbacks.get(data.chatId);
        if (callback) {
          callback(data.messageId);
        }
      }
    });

    // Listen for read receipts
    this.socket.on('messages-read', (data: { chatId: string; userId: string }) => {
      console.log('Messages read in chat:', data.chatId, 'by user:', data.userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  // Join a chat room
  joinChat(chatId: string, userId: string) {
    this.socket?.emit('join-chat', { chatId, userId });
  }

  // Leave a chat room
  leaveChat(chatId: string) {
    this.socket?.emit('leave-chat', { chatId });
  }

  // Send typing status
  sendTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    this.socket?.emit('typing', { chatId, userId, isTyping });
  }

  // Send message via socket
  sendMessageViaSocket(chatId: string, userId: string, content: string) {
    this.socket?.emit('send-message', { chatId, userId, content });
  }

  // Send voice message via socket
  sendVoiceMessageViaSocket(chatId: string, userId: string, audioData: string, duration: number, format?: string) {
    this.socket?.emit('send-voice-message', { chatId, userId, audioData, duration, format });
  }

  // Mark messages as read via socket
  markAsReadViaSocket(chatId: string, userId: string) {
    this.socket?.emit('message-read', { chatId, userId });
  }

  // Delete message via socket
  deleteMessageViaSocket(messageId: string, userId: string, chatId: string) {
    this.socket?.emit('delete-message', { messageId, userId, chatId });
  }

  // Register callbacks for new messages
  onNewMessage(chatId: string, callback: (message: Message) => void) {
    this.messageCallbacks.set(chatId, callback);
  }

  // Register callbacks for voice messages
  onNewVoiceMessage(chatId: string, callback: (message: Message) => void) {
    this.voiceMessageCallbacks.set(chatId, callback);
  }

  // Register callbacks for typing indicators
  onTypingStatus(chatId: string, callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.typingCallbacks.set(chatId, callback);
  }

  // Register callbacks for deleted messages
  onMessageDeleted(chatId: string, callback: (messageId: string) => void) {
    this.messageDeleteCallbacks.set(chatId, callback);
  }

  // Unregister message callbacks
  offNewMessage(chatId: string) {
    this.messageCallbacks.delete(chatId);
  }

  // Unregister voice message callbacks
  offNewVoiceMessage(chatId: string) {
    this.voiceMessageCallbacks.delete(chatId);
  }

  // Unregister typing callbacks
  offTypingStatus(chatId: string) {
    this.typingCallbacks.delete(chatId);
  }

  // Unregister delete callbacks
  offMessageDeleted(chatId: string) {
    this.messageDeleteCallbacks.delete(chatId);
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messageCallbacks.clear();
      this.voiceMessageCallbacks.clear();
      this.typingCallbacks.clear();
      this.messageDeleteCallbacks.clear();
    }
  }
}

export const chatService = new ChatService();
