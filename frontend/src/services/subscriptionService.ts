/**
 * Subscription Service
 * Handles subscription management, billing, and IAP
 */

import { Platform } from 'react-native';
import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'FREE' | 'GOLD' | 'GLOWING';

interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: Date;
  autoRenew: boolean;
  platform?: 'STRIPE' | 'APPLE' | 'GOOGLE';
  features: {
    dailyPops: number;
    seeWhoLiked: boolean;
    voiceMessageDuration: number;
    themedBalloons: boolean;
    superPops: boolean;
    dailyBoosts: boolean;
    advancedFilters: boolean;
  };
}

class SubscriptionService {
  private currentSubscription: SubscriptionStatus | null = null;
  private readonly CACHE_KEY = 'subscription_status';

  /**
   * Initialize subscription service
   */
  async initialize() {
    try {
      // Load cached subscription status
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.currentSubscription = JSON.parse(cached);
      }

      // Fetch latest status from server
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('Failed to initialize subscription service:', error);
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await apiService.get<SubscriptionStatus>('/subscriptions/status');
      this.currentSubscription = response;
      
      // Cache the status
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(response));
      
      return response;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      
      // Return free tier as fallback
      return this.getFreeTierStatus();
    }
  }

  /**
   * Subscribe to a tier
   */
  async subscribe(tierId: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Use Stripe for web
      return this.subscribeWithStripe(tierId);
    } else if (Platform.OS === 'ios') {
      // Use Apple IAP for iOS
      return this.subscribeWithAppleIAP(tierId);
    } else {
      // Use Google Play Billing for Android
      return this.subscribeWithGooglePlay(tierId);
    }
  }

  /**
   * Subscribe using Stripe (Web)
   */
  private async subscribeWithStripe(tierId: string): Promise<void> {
    try {
      // Create checkout session
      const response = await apiService.post('/subscriptions/create-checkout-session', {
        tierId,
        successUrl: window.location.origin + '/subscription-success',
        cancelUrl: window.location.origin + '/subscription-cancel',
      });

      // Redirect to Stripe Checkout
      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      }
    } catch (error) {
      console.error('Stripe subscription failed:', error);
      throw new Error('Failed to process payment');
    }
  }

  /**
   * Subscribe using Apple In-App Purchase
   */
  private async subscribeWithAppleIAP(tierId: string): Promise<void> {
    try {
      // Note: This requires expo-in-app-purchases or react-native-iap
      // Implementation would depend on the specific library used
      
      // 1. Request products from App Store
      // 2. Purchase the product
      // 3. Verify receipt with backend
      
      const receipt = 'mock-receipt'; // Get from IAP library
      
      // Verify with backend
      const response = await apiService.post('/subscriptions/verify-apple-receipt', {
        receipt,
        tierId,
      });

      if (response.success) {
        await this.checkSubscriptionStatus();
      } else {
        throw new Error('Receipt verification failed');
      }
    } catch (error) {
      console.error('Apple IAP failed:', error);
      throw new Error('Purchase failed');
    }
  }

  /**
   * Subscribe using Google Play Billing
   */
  private async subscribeWithGooglePlay(tierId: string): Promise<void> {
    try {
      // Note: This requires expo-in-app-purchases or react-native-iap
      // Implementation would depend on the specific library used
      
      // 1. Connect to Google Play Billing
      // 2. Purchase the subscription
      // 3. Verify with backend
      
      const purchaseToken = 'mock-purchase-token'; // Get from billing library
      
      // Verify with backend
      const response = await apiService.post('/subscriptions/verify-google-purchase', {
        purchaseToken,
        tierId,
        productId: this.getGoogleProductId(tierId),
      });

      if (response.success) {
        await this.checkSubscriptionStatus();
      } else {
        throw new Error('Purchase verification failed');
      }
    } catch (error) {
      console.error('Google Play Billing failed:', error);
      throw new Error('Purchase failed');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<void> {
    try {
      await apiService.post('/subscriptions/cancel');
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Restore Apple purchases
        // Get receipts from IAP library and verify
        await apiService.post('/subscriptions/restore-apple');
      } else if (Platform.OS === 'android') {
        // Restore Google purchases
        // Get purchase history and verify
        await apiService.post('/subscriptions/restore-google');
      }
      
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw new Error('No purchases to restore');
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Create Stripe portal session
        const response = await apiService.post('/subscriptions/create-portal-session');
        if (response.portalUrl) {
          window.location.href = response.portalUrl;
        }
      } else {
        // For mobile, redirect to app store subscription management
        if (Platform.OS === 'ios') {
          // Open iOS subscription management
          // Linking.openURL('https://apps.apple.com/account/subscriptions');
        } else {
          // Open Google Play subscription management
          // Linking.openURL('https://play.google.com/store/account/subscriptions');
        }
      }
    } catch (error) {
      console.error('Failed to update payment method:', error);
      throw error;
    }
  }

  /**
   * Get current subscription
   */
  getCurrentSubscription(): SubscriptionStatus | null {
    return this.currentSubscription;
  }

  /**
   * Check if user has premium features
   */
  isPremium(): boolean {
    return this.currentSubscription?.tier !== 'FREE' && 
           this.currentSubscription?.isActive === true;
  }

  /**
   * Check if user has specific tier
   */
  hasTier(tier: SubscriptionTier): boolean {
    if (!this.currentSubscription?.isActive) return false;
    
    const tierLevels = { FREE: 0, GOLD: 1, GLOWING: 2 };
    const currentLevel = tierLevels[this.currentSubscription.tier];
    const requiredLevel = tierLevels[tier];
    
    return currentLevel >= requiredLevel;
  }

  /**
   * Get feature availability
   */
  canUseFeature(feature: keyof SubscriptionStatus['features']): boolean {
    return this.currentSubscription?.features[feature] || false;
  }

  /**
   * Get daily pop limit
   */
  getDailyPopLimit(): number {
    return this.currentSubscription?.features.dailyPops || 5;
  }

  /**
   * Get free tier status
   */
  private getFreeTierStatus(): SubscriptionStatus {
    return {
      tier: 'FREE',
      isActive: true,
      autoRenew: false,
      features: {
        dailyPops: 5,
        seeWhoLiked: false,
        voiceMessageDuration: 30,
        themedBalloons: false,
        superPops: false,
        dailyBoosts: false,
        advancedFilters: false,
      },
    };
  }

  /**
   * Get Google Play product ID for tier
   */
  private getGoogleProductId(tierId: string): string {
    const productIds: Record<string, string> = {
      gold: 'com.balloond.subscription.gold',
      glowing: 'com.balloond.subscription.glowing',
    };
    return productIds[tierId] || '';
  }

  /**
   * Get Apple product ID for tier
   */
  private getAppleProductId(tierId: string): string {
    const productIds: Record<string, string> = {
      gold: 'com.balloond.subscription.gold',
      glowing: 'com.balloond.subscription.glowing',
    };
    return productIds[tierId] || '';
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Assuming amount is in cents
  }

  /**
   * Calculate savings for annual vs monthly
   */
  calculateAnnualSavings(monthlyPrice: number): number {
    const annualPrice = monthlyPrice * 10; // e.g., 2 months free
    const regularAnnualPrice = monthlyPrice * 12;
    return regularAnnualPrice - annualPrice;
  }
}

export const subscriptionService = new SubscriptionService();
