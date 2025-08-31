/**
 * Push Notification Configuration
 * Settings for Firebase Cloud Messaging and APNs
 */

export const PUSH_CONFIG = {
  // Notification channels for Android
  channels: {
    messages: {
      id: 'messages',
      name: 'Messages',
      importance: 5, // Max importance
      sound: 'default',
      vibrate: true,
      badge: true,
    },
    matches: {
      id: 'matches',
      name: 'New Matches',
      importance: 4, // High importance
      sound: 'default',
      vibrate: true,
      badge: true,
    },
    voice: {
      id: 'voice',
      name: 'Voice Messages',
      importance: 5, // Max importance
      sound: 'default',
      vibrate: true,
      badge: true,
    },
    promotions: {
      id: 'promotions',
      name: 'Promotions',
      importance: 3, // Default importance
      sound: 'default',
      vibrate: false,
      badge: false,
    },
  },

  // iOS notification categories
  categories: {
    message: {
      identifier: 'MESSAGE',
      actions: [
        {
          identifier: 'REPLY',
          buttonTitle: 'Reply',
          textInput: {
            placeholder: 'Type a message...',
          },
        },
        {
          identifier: 'VIEW',
          buttonTitle: 'View',
        },
      ],
    },
    match: {
      identifier: 'MATCH',
      actions: [
        {
          identifier: 'MESSAGE',
          buttonTitle: 'Send Message',
        },
        {
          identifier: 'VIEW_PROFILE',
          buttonTitle: 'View Profile',
        },
      ],
    },
  },

  // Default notification options
  defaultOptions: {
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: 'high',
  },

  // Voice message notification
  voiceMessageOptions: {
    title: '🎤 Voice Message',
    sound: 'voice_notification.wav',
    priority: 'max',
  },

  // Match notification
  matchNotificationOptions: {
    title: '🎈 It\'s a Match!',
    sound: 'match_notification.wav',
    priority: 'high',
  },
};

// Firebase configuration
export const FIREBASE_CONFIG = {
  // These will be populated from environment variables or app.json
  projectId: process.env.FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  
  // Notification topics for group messaging
  topics: {
    all: 'all_users',
    gold: 'gold_subscribers',
    glowing: 'glowing_subscribers',
    promotions: 'promotions',
    updates: 'app_updates',
  },
};

// Badge management
export const BADGE_CONFIG = {
  // Update badge count based on unread messages
  updateOnNewMessage: true,
  
  // Clear badge when app becomes active
  clearOnAppActive: false,
  
  // Clear badge when viewing messages
  clearOnMessageView: true,
};

// Deep linking configuration
export const DEEP_LINK_CONFIG = {
  prefix: 'balloond://',
  
  // Deep link routes
  routes: {
    chat: 'chat/:chatId',
    match: 'match/:matchId',
    profile: 'profile/:userId',
    subscription: 'subscription',
  },
  
  // Handle deep links from notifications
  handleNotificationLink: (data: any) => {
    if (data.chatId) {
      return `chat/${data.chatId}`;
    }
    if (data.matchId) {
      return `match/${data.matchId}`;
    }
    if (data.userId) {
      return `profile/${data.userId}`;
    }
    return null;
  },
};
