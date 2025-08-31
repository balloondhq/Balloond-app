import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Event types for comprehensive tracking
export enum EventType {
  // Onboarding events
  ONBOARDING_START = 'onboarding_start',
  ONBOARDING_COMPLETE = 'onboarding_complete',
  TUTORIAL_SKIP = 'tutorial_skip',
  
  // Balloon interactions
  BALLOON_POP = 'balloon_pop',
  BALLOON_VIEW = 'balloon_view',
  BALLOON_SWIPE_RIGHT = 'balloon_swipe_right',
  BALLOON_SWIPE_LEFT = 'balloon_swipe_left',
  
  // Matching events
  MATCH_CREATED = 'match_created',
  MATCH_VIEWED = 'match_viewed',
  MATCH_UNMATCH = 'match_unmatch',
  
  // Chat events
  CHAT_INITIATED = 'chat_initiated',
  MESSAGE_SENT = 'message_sent',
  VOICE_MESSAGE_SENT = 'voice_message_sent',
  CHAT_OPENED = 'chat_opened',
  
  // Subscription events
  SUBSCRIPTION_VIEW = 'subscription_view',
  SUBSCRIPTION_START = 'subscription_start',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  SUBSCRIPTION_RENEW = 'subscription_renew',
  PAYWALL_SHOWN = 'paywall_shown',
  
  // Feature usage
  AR_EXPERIENCE_USED = 'ar_experience_used',
  VIDEO_PROFILE_CREATED = 'video_profile_created',
  PROFILE_UPDATED = 'profile_updated',
  LOCATION_UPDATED = 'location_updated',
  
  // Retention events
  APP_OPEN = 'app_open',
  APP_BACKGROUND = 'app_background',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  
  // Error events
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  CRASH_DETECTED = 'crash_detected',
}

interface EventProperties {
  [key: string]: any;
}

interface UserProperties {
  userId?: string;
  email?: string;
  isPremium?: boolean;
  registrationDate?: string;
  lastActive?: string;
  platform?: string;
  deviceModel?: string;
  appVersion?: string;
  osVersion?: string;
  locale?: string;
  timezone?: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: any[] = [];
  private isInitialized = false;
  private userProperties: UserProperties = {};
  private sessionStartTime: number = 0;
  private lastEventTime: number = 0;
  
  // A/B testing variants
  private experiments: Map<string, string> = new Map();
  
  // Analytics endpoints (replace with your actual analytics service)
  private readonly MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';
  private readonly SEGMENT_WRITE_KEY = process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY || '';
  private readonly AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '';
  
  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(userId?: string) {
    if (this.isInitialized) return;
    
    this.userId = userId || (await this.getAnonymousId());
    this.sessionStartTime = Date.now();
    
    // Set device properties
    this.userProperties = {
      ...this.userProperties,
      userId: this.userId,
      platform: Platform.OS,
      deviceModel: Device.modelName || 'Unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      osVersion: Device.osVersion || 'Unknown',
      locale: Constants.expoConfig?.locales?.[0] || 'en',
    };
    
    // Initialize third-party analytics SDKs
    await this.initializeMixpanel();
    await this.initializeSegment();
    await this.initializeAmplitude();
    
    // Load experiments
    await this.loadExperiments();
    
    // Process queued events
    await this.flushEventQueue();
    
    this.isInitialized = true;
    
    // Track app open
    this.track(EventType.APP_OPEN, {
      sessionId: this.sessionId,
      lastSessionDuration: await this.getLastSessionDuration(),
    });
    
    // Start session
    this.track(EventType.SESSION_START);
  }

  // Track events with properties
  track(event: EventType, properties?: EventProperties) {
    const timestamp = Date.now();
    const timeSinceLastEvent = this.lastEventTime ? timestamp - this.lastEventTime : 0;
    this.lastEventTime = timestamp;
    
    const eventData = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp,
        timeSinceLastEvent,
        sessionDuration: timestamp - this.sessionStartTime,
        ...this.getContextProperties(),
      },
      userId: this.userId,
    };
    
    if (!this.isInitialized) {
      this.eventQueue.push(eventData);
      return;
    }
    
    // Send to analytics providers
    this.sendToMixpanel(eventData);
    this.sendToSegment(eventData);
    this.sendToAmplitude(eventData);
    
    // Store locally for offline support
    this.storeEventLocally(eventData);
  }

  // Update user properties
  async updateUserProperties(properties: Partial<UserProperties>) {
    this.userProperties = {
      ...this.userProperties,
      ...properties,
      lastActive: new Date().toISOString(),
    };
    
    // Update in analytics providers
    if (this.isInitialized) {
      await this.updateMixpanelUser(this.userProperties);
      await this.updateSegmentUser(this.userProperties);
      await this.updateAmplitudeUser(this.userProperties);
    }
  }

  // A/B Testing
  getExperiment(experimentKey: string): string {
    return this.experiments.get(experimentKey) || 'control';
  }

  setExperiment(experimentKey: string, variant: string) {
    this.experiments.set(experimentKey, variant);
    this.track(EventType.EXPERIMENT_EXPOSURE as any, {
      experiment: experimentKey,
      variant,
    });
  }

  // Retention tracking
  async trackRetention() {
    const retentionData = await this.getRetentionData();
    
    this.track(EventType.RETENTION_CHECK as any, {
      daysSinceInstall: retentionData.daysSinceInstall,
      daysSinceLastUse: retentionData.daysSinceLastUse,
      totalSessions: retentionData.totalSessions,
      isReturningUser: retentionData.isReturningUser,
    });
  }

  // Funnel tracking
  trackFunnelStep(funnelName: string, step: number, stepName: string, properties?: EventProperties) {
    this.track(EventType.FUNNEL_STEP as any, {
      funnelName,
      step,
      stepName,
      ...properties,
    });
  }

  // Revenue tracking
  trackRevenue(amount: number, currency: string, productId: string, properties?: EventProperties) {
    this.track(EventType.REVENUE as any, {
      amount,
      currency,
      productId,
      ...properties,
    });
  }

  // Screen tracking
  trackScreen(screenName: string, properties?: EventProperties) {
    this.track(EventType.SCREEN_VIEW as any, {
      screenName,
      ...properties,
    });
  }

  // Error tracking
  trackError(error: Error, context?: any) {
    this.track(EventType.ERROR_OCCURRED, {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
    });
  }

  // Private methods
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getAnonymousId(): Promise<string> {
    let anonymousId = await AsyncStorage.getItem('anonymousId');
    if (!anonymousId) {
      anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('anonymousId', anonymousId);
    }
    return anonymousId;
  }

  private getContextProperties() {
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
      manufacturer: Device.manufacturer,
      brand: Device.brand,
      systemName: Device.osName,
      bundleId: Application.applicationId,
      buildNumber: Application.nativeBuildVersion,
    };
  }

  private async getLastSessionDuration(): Promise<number> {
    const lastDuration = await AsyncStorage.getItem('lastSessionDuration');
    return lastDuration ? parseInt(lastDuration, 10) : 0;
  }

  private async getRetentionData() {
    const installDate = await AsyncStorage.getItem('installDate');
    const lastUseDate = await AsyncStorage.getItem('lastUseDate');
    const totalSessions = await AsyncStorage.getItem('totalSessions');
    
    const now = Date.now();
    const daysSinceInstall = installDate ? 
      Math.floor((now - parseInt(installDate, 10)) / (1000 * 60 * 60 * 24)) : 0;
    const daysSinceLastUse = lastUseDate ? 
      Math.floor((now - parseInt(lastUseDate, 10)) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      daysSinceInstall,
      daysSinceLastUse,
      totalSessions: totalSessions ? parseInt(totalSessions, 10) : 1,
      isReturningUser: daysSinceLastUse > 0,
    };
  }

  private async loadExperiments() {
    // Load experiments from remote config or local storage
    const experiments = await AsyncStorage.getItem('experiments');
    if (experiments) {
      const parsed = JSON.parse(experiments);
      Object.entries(parsed).forEach(([key, value]) => {
        this.experiments.set(key, value as string);
      });
    }
  }

  private async flushEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this.sendToMixpanel(event);
      this.sendToSegment(event);
      this.sendToAmplitude(event);
    }
  }

  private async storeEventLocally(eventData: any) {
    try {
      const events = await AsyncStorage.getItem('analyticsEvents');
      const eventsList = events ? JSON.parse(events) : [];
      eventsList.push(eventData);
      
      // Keep only last 1000 events
      if (eventsList.length > 1000) {
        eventsList.shift();
      }
      
      await AsyncStorage.setItem('analyticsEvents', JSON.stringify(eventsList));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  // Analytics provider integrations (implement based on your chosen providers)
  private async initializeMixpanel() {
    // Mixpanel initialization
    if (this.MIXPANEL_TOKEN) {
      // Initialize Mixpanel SDK
    }
  }

  private async initializeSegment() {
    // Segment initialization
    if (this.SEGMENT_WRITE_KEY) {
      // Initialize Segment SDK
    }
  }

  private async initializeAmplitude() {
    // Amplitude initialization
    if (this.AMPLITUDE_API_KEY) {
      // Initialize Amplitude SDK
    }
  }

  private sendToMixpanel(eventData: any) {
    if (!this.MIXPANEL_TOKEN) return;
    // Send event to Mixpanel
  }

  private sendToSegment(eventData: any) {
    if (!this.SEGMENT_WRITE_KEY) return;
    // Send event to Segment
  }

  private sendToAmplitude(eventData: any) {
    if (!this.AMPLITUDE_API_KEY) return;
    // Send event to Amplitude
  }

  private async updateMixpanelUser(properties: UserProperties) {
    // Update user in Mixpanel
  }

  private async updateSegmentUser(properties: UserProperties) {
    // Update user in Segment
  }

  private async updateAmplitudeUser(properties: UserProperties) {
    // Update user in Amplitude
  }

  // Session management
  async endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    await AsyncStorage.setItem('lastSessionDuration', sessionDuration.toString());
    
    this.track(EventType.SESSION_END, {
      duration: sessionDuration,
    });
    
    // Update last use date
    await AsyncStorage.setItem('lastUseDate', Date.now().toString());
    
    // Increment total sessions
    const totalSessions = await AsyncStorage.getItem('totalSessions');
    const newTotal = totalSessions ? parseInt(totalSessions, 10) + 1 : 1;
    await AsyncStorage.setItem('totalSessions', newTotal.toString());
  }
}

export default AnalyticsService.getInstance();
