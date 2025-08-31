import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// Analytics event types
export enum AnalyticsEvent {
  // Onboarding events
  ONBOARDING_START = 'onboarding_start',
  ONBOARDING_COMPLETE = 'onboarding_complete',
  TUTORIAL_SKIP = 'tutorial_skip',
  TUTORIAL_COMPLETE = 'tutorial_complete',
  
  // Authentication events
  SIGNUP_START = 'signup_start',
  SIGNUP_COMPLETE = 'signup_complete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  
  // Balloon events
  BALLOON_POP = 'balloon_pop',
  BALLOON_SWIPE_RIGHT = 'balloon_swipe_right',
  BALLOON_SWIPE_LEFT = 'balloon_swipe_left',
  DAILY_BALLOONS_EXHAUSTED = 'daily_balloons_exhausted',
  
  // Matching events
  MATCH_CREATED = 'match_created',
  MATCH_VIEWED = 'match_viewed',
  PROFILE_VIEWED = 'profile_viewed',
  
  // Chat events
  CHAT_STARTED = 'chat_started',
  MESSAGE_SENT = 'message_sent',
  VOICE_NOTE_SENT = 'voice_note_sent',
  VIDEO_CALL_STARTED = 'video_call_started',
  
  // Subscription events
  SUBSCRIPTION_SCREEN_VIEWED = 'subscription_screen_viewed',
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  
  // Premium feature usage
  PREMIUM_FEATURE_USED = 'premium_feature_used',
  UNLIMITED_POPS_USED = 'unlimited_pops_used',
  SEE_WHO_LIKES_VIEWED = 'see_who_likes_viewed',
  
  // Group events
  GROUP_EVENT_CREATED = 'group_event_created',
  GROUP_EVENT_JOINED = 'group_event_joined',
  GROUP_EVENT_ATTENDED = 'group_event_attended',
  
  // AR events
  AR_EXPERIENCE_STARTED = 'ar_experience_started',
  AR_BALLOON_PLACED = 'ar_balloon_placed',
  AR_BALLOON_POPPED = 'ar_balloon_popped',
  
  // User engagement
  APP_OPENED = 'app_opened',
  APP_BACKGROUNDED = 'app_backgrounded',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  
  // Retention events
  DAY_1_RETENTION = 'day_1_retention',
  DAY_7_RETENTION = 'day_7_retention',
  DAY_30_RETENTION = 'day_30_retention',
  
  // Error events
  ERROR_OCCURRED = 'error_occurred',
  CRASH_REPORTED = 'crash_reported',
}

interface UserProperties {
  userId?: string;
  email?: string;
  age?: number;
  gender?: string;
  isPremium?: boolean;
  subscriptionTier?: string;
  totalMatches?: number;
  totalPops?: number;
  accountCreatedAt?: string;
  lastActiveAt?: string;
}

interface EventProperties {
  [key: string]: any;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private eventQueue: any[] = [];
  private isInitialized = false;
  private userProperties: UserProperties = {};
  private deviceInfo: any = {};
  private abTestVariants: Map<string, string> = new Map();

  private constructor() {
    this.initializeDeviceInfo();
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  private async initializeDeviceInfo() {
    this.deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      deviceType: Device.deviceType,
      deviceName: Device.deviceName,
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      appVersion: Application.nativeApplicationVersion,
      buildVersion: Application.nativeBuildVersion,
    };
  }

  async initialize(userId?: string) {
    if (this.isInitialized) return;

    this.userId = userId || (await this.getAnonymousId());
    this.sessionId = this.generateSessionId();
    this.isInitialized = true;

    // Load cached events if any
    await this.loadCachedEvents();

    // Start session
    this.track(AnalyticsEvent.SESSION_STARTED, {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });

    // Set up retention tracking
    await this.checkRetention();

    // Flush any queued events
    await this.flushEvents();
  }

  private async getAnonymousId(): Promise<string> {
    let anonymousId = await AsyncStorage.getItem('anonymousId');
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('anonymousId', anonymousId);
    }
    return anonymousId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
    this.identify(userId);
  }

  identify(userId: string, properties?: UserProperties) {
    this.userId = userId;
    if (properties) {
      this.userProperties = { ...this.userProperties, ...properties };
    }

    const identifyEvent = {
      type: 'identify',
      userId,
      properties: this.userProperties,
      timestamp: new Date().toISOString(),
      context: this.getContext(),
    };

    this.eventQueue.push(identifyEvent);
    this.flushEvents();
  }

  track(event: AnalyticsEvent, properties?: EventProperties) {
    const trackEvent = {
      type: 'track',
      event,
      userId: this.userId,
      sessionId: this.sessionId,
      properties: {
        ...properties,
        ...this.getEventMetadata(),
      },
      timestamp: new Date().toISOString(),
      context: this.getContext(),
    };

    this.eventQueue.push(trackEvent);

    // For critical events, flush immediately
    if (this.isCriticalEvent(event)) {
      this.flushEvents();
    }
  }

  screen(screenName: string, properties?: EventProperties) {
    const screenEvent = {
      type: 'screen',
      name: screenName,
      userId: this.userId,
      sessionId: this.sessionId,
      properties,
      timestamp: new Date().toISOString(),
      context: this.getContext(),
    };

    this.eventQueue.push(screenEvent);
  }

  // A/B Testing support
  getVariant(experimentName: string): string {
    if (!this.abTestVariants.has(experimentName)) {
      // Simple random assignment for demo
      const variants = ['control', 'variant_a', 'variant_b'];
      const variant = variants[Math.floor(Math.random() * variants.length)];
      this.abTestVariants.set(experimentName, variant);
      
      // Track exposure
      this.track(AnalyticsEvent.ERROR_OCCURRED, {
        experiment: experimentName,
        variant,
        type: 'experiment_exposure',
      });
    }
    return this.abTestVariants.get(experimentName)!;
  }

  // Funnel tracking
  trackFunnel(funnelName: string, step: string, properties?: EventProperties) {
    this.track(AnalyticsEvent.ERROR_OCCURRED, {
      funnel: funnelName,
      step,
      ...properties,
      type: 'funnel_step',
    });
  }

  // Revenue tracking
  trackRevenue(amount: number, currency: string, productId: string, properties?: EventProperties) {
    this.track(AnalyticsEvent.SUBSCRIPTION_STARTED, {
      revenue: amount,
      currency,
      productId,
      ...properties,
    });
  }

  private getContext() {
    return {
      device: this.deviceInfo,
      locale: 'en-US', // You might want to get this dynamically
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      app: {
        name: 'Balloond',
        version: this.deviceInfo.appVersion,
        build: this.deviceInfo.buildVersion,
      },
    };
  }

  private getEventMetadata() {
    return {
      sessionId: this.sessionId,
      platform: Platform.OS,
      isPremium: this.userProperties.isPremium || false,
    };
  }

  private isCriticalEvent(event: AnalyticsEvent): boolean {
    const criticalEvents = [
      AnalyticsEvent.SUBSCRIPTION_STARTED,
      AnalyticsEvent.MATCH_CREATED,
      AnalyticsEvent.ERROR_OCCURRED,
      AnalyticsEvent.CRASH_REPORTED,
    ];
    return criticalEvents.includes(event);
  }

  private async checkRetention() {
    const firstLaunch = await AsyncStorage.getItem('firstLaunchDate');
    if (!firstLaunch) {
      await AsyncStorage.setItem('firstLaunchDate', new Date().toISOString());
      return;
    }

    const daysSinceFirstLaunch = Math.floor(
      (Date.now() - new Date(firstLaunch).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceFirstLaunch === 1) {
      this.track(AnalyticsEvent.DAY_1_RETENTION);
    } else if (daysSinceFirstLaunch === 7) {
      this.track(AnalyticsEvent.DAY_7_RETENTION);
    } else if (daysSinceFirstLaunch === 30) {
      this.track(AnalyticsEvent.DAY_30_RETENTION);
    }
  }

  private async loadCachedEvents() {
    try {
      const cached = await AsyncStorage.getItem('analyticsEventQueue');
      if (cached) {
        this.eventQueue = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load cached events:', error);
    }
  }

  private async cacheEvents() {
    try {
      await AsyncStorage.setItem('analyticsEventQueue', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.error('Failed to cache events:', error);
    }
  }

  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In production, this would send to your analytics backend
      // For now, we'll just log them
      console.log('Analytics Events:', eventsToSend);
      
      // Here you would typically:
      // await fetch('https://your-analytics-endpoint.com/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: eventsToSend }),
      // });

      // Clear cache after successful send
      await AsyncStorage.removeItem('analyticsEventQueue');
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-add events to queue and cache them
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      await this.cacheEvents();
    }
  }

  async endSession() {
    this.track(AnalyticsEvent.SESSION_ENDED, {
      sessionId: this.sessionId,
      duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
    });
    await this.flushEvents();
  }
}

export const Analytics = AnalyticsTracker.getInstance();

// Convenience functions
export const trackEvent = (event: AnalyticsEvent, properties?: EventProperties) => {
  Analytics.track(event, properties);
};

export const trackScreen = (screenName: string, properties?: EventProperties) => {
  Analytics.screen(screenName, properties);
};

export const trackFunnel = (funnelName: string, step: string, properties?: EventProperties) => {
  Analytics.trackFunnel(funnelName, step, properties);
};

export const trackRevenue = (amount: number, currency: string, productId: string, properties?: EventProperties) => {
  Analytics.trackRevenue(amount, currency, productId, properties);
};

export const getABTestVariant = (experimentName: string): string => {
  return Analytics.getVariant(experimentName);
};
