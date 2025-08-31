/**
 * Push Notification Service
 * Handles push notifications for real-time messaging
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { chatService } from './chatService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize push notifications
   */
  async initialize(userId: string) {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification');
        return;
      }

      // Get push token
      const token = await this.getExpoPushToken();
      if (token) {
        // Register token with backend
        await chatService.registerPushToken(token, Platform.OS);
        console.log('Push token registered:', token);
      }

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Set up notification listeners
      this.setupListeners();

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Get Expo push token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('Project ID not found in app.json');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels() {
    // Messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B1A1A',
      sound: 'default',
    });

    // Matches channel
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'New Matches',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#8B1A1A',
      sound: 'default',
    });

    // Voice messages channel
    await Notifications.setNotificationChannelAsync('voice', {
      name: 'Voice Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B1A1A',
      sound: 'default',
    });
  }

  /**
   * Set up notification listeners
   */
  setupListeners() {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle user interaction with notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.chatId) {
        // Navigate to chat
        this.handleChatNotification(data.chatId, data.messageId);
      } else if (data.matchId) {
        // Navigate to match
        this.handleMatchNotification(data.matchId);
      }
    });
  }

  /**
   * Handle chat notification tap
   */
  private handleChatNotification(chatId: string, messageId?: string) {
    // This should trigger navigation to the chat screen
    // You'll need to implement this based on your navigation setup
    console.log('Navigate to chat:', chatId, 'message:', messageId);
  }

  /**
   * Handle match notification tap
   */
  private handleMatchNotification(matchId: string) {
    // This should trigger navigation to the matches screen
    // You'll need to implement this based on your navigation setup
    console.log('Navigate to match:', matchId);
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger || null, // null = immediate
    });
  }

  /**
   * Send a local notification for new message (when app is in background)
   */
  async sendMessageNotification(senderName: string, message: string, chatId: string, isVoice = false) {
    const channelId = isVoice ? 'voice' : 'messages';
    const title = senderName;
    const body = isVoice ? '🎤 Voice message' : message;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { chatId },
        sound: 'default',
        badge: 1,
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId }),
    });
  }

  /**
   * Send a local notification for new match
   */
  async sendMatchNotification(matchName: string, matchId: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎈 It\'s a Match!',
        body: `You matched with ${matchName}!`,
        data: { matchId },
        sound: 'default',
        badge: 1,
      },
      trigger: null,
      ...(Platform.OS === 'android' && { channelId: 'matches' }),
    });
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
