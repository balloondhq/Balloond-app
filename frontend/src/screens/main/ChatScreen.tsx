/**
 * ChatScreen
 * Individual chat conversation with voice message support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { VoiceMessage } from '../../components/VoiceMessage';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { chatService } from '../../services/chatService';
import { API_URL } from '../../config/api';

interface Message {
  id: string;
  content?: string;
  messageType: 'TEXT' | 'IMAGE' | 'VOICE';
  mediaUrl?: string;
  mediaDuration?: number;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    photos: string[];
  };
}

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, otherUser } = route.params as any;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const currentUserId = 'USER_ID'; // Get from auth context

  useEffect(() => {
    setupPushNotifications();
    loadMessages();
    connectWebSocket();
    markMessagesAsRead();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const setupPushNotifications = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Push notifications are required for real-time messaging');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      // Register token with backend
      await chatService.registerPushToken(token.data, Platform.OS as any);
    }
  };

  const connectWebSocket = () => {
    socketRef.current = io(API_URL, {
      transports: ['websocket'],
    });

    socketRef.current.emit('authenticate', { userId: currentUserId });
    socketRef.current.emit('join-chat', { chatId, userId: currentUserId });

    // Listen for new messages
    socketRef.current.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      markMessagesAsRead();
    });

    // Listen for voice messages
    socketRef.current.on('new-voice-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      markMessagesAsRead();
    });

    // Listen for typing status
    socketRef.current.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        setOtherUserTyping(data.isTyping);
      }
    });

    // Listen for deleted messages
    socketRef.current.on('message-deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await chatService.getChatMessages(chatId);
      setMessages(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await chatService.markMessagesAsRead(chatId);
      socketRef.current?.emit('message-read', { chatId, userId: currentUserId });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: inputText,
      messageType: 'TEXT',
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: {
        id: currentUserId,
        name: 'You',
        photos: [],
      },
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');

    try {
      const sentMessage = await chatService.sendMessage(chatId, {
        content: inputText,
        messageType: 'TEXT',
      });

      // Replace temp message with actual message
      setMessages(prev =>
        prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg)
      );

      // Emit via socket
      socketRef.current?.emit('send-message', {
        chatId,
        userId: currentUserId,
        content: inputText,
      });
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const sendVoiceMessage = async (audioData: string, duration: number) => {
    const tempMessage: Message = {
      id: `temp-voice-${Date.now()}`,
      messageType: 'VOICE',
      mediaDuration: duration,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: {
        id: currentUserId,
        name: 'You',
        photos: [],
      },
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const sentMessage = await chatService.sendVoiceMessage(chatId, {
        audioData,
        duration,
        format: 'webm',
      });

      // Replace temp message with actual message
      setMessages(prev =>
        prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg)
      );

      // Emit via socket
      socketRef.current?.emit('send-voice-message', {
        chatId,
        userId: currentUserId,
        audioData,
        duration,
        format: 'webm',
      });
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing', {
        chatId,
        userId: currentUserId,
        isTyping: true,
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing', {
        chatId,
        userId: currentUserId,
        isTyping: false,
      });
    }, 1000);
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteMessage(messageId);
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
              
              socketRef.current?.emit('delete-message', {
                messageId,
                userId: currentUserId,
                chatId,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === currentUserId;
    const timestamp = new Date(item.createdAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (item.messageType === 'VOICE') {
      return (
        <TouchableOpacity
          onLongPress={() => isOwn && deleteMessage(item.id)}
        >
          <VoiceMessage
            url={item.mediaUrl!}
            duration={item.mediaDuration || 0}
            isOwn={isOwn}
            timestamp={timestamp}
          />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => isOwn && deleteMessage(item.id)}
      >
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
            {timestamp}
            {isOwn && item.isRead && ' ✓✓'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#8B1A1A" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser?.name}</Text>
            {otherUserTyping && (
              <Text style={styles.typingIndicator}>typing...</Text>
            )}
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#8B1A1A" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B1A1A" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            onPress={() => setShowVoiceRecorder(true)}
            style={styles.voiceButton}
          >
            <Ionicons name="mic" size={24} color="#8B1A1A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim()}
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Voice Recorder Modal */}
        <VoiceRecorder
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSendVoice={sendVoiceMessage}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typingIndicator: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  moreButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginVertical: 4,
  },
  ownMessage: {
    backgroundColor: '#8B1A1A',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#F5F5DC',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  ownMessageText: {
    color: '#FFF',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    fontSize: 16,
    color: '#333',
  },
  voiceButton: {
    padding: 10,
    marginLeft: 5,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
