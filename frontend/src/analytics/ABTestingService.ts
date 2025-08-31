import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnalyticsService from './AnalyticsService';

// A/B Test Configuration
export interface ABTest {
  key: string;
  name: string;
  description: string;
  variants: {
    [key: string]: {
      weight: number;
      config: any;
    };
  };
  enabled: boolean;
  audience?: {
    percentage: number;
    criteria?: {
      isPremium?: boolean;
      daysSinceInstall?: number;
      platform?: string;
    };
  };
}

// Active A/B Tests
export const AB_TESTS: { [key: string]: ABTest } = {
  BALLOON_REVEAL_ANIMATION: {
    key: 'balloon_reveal_animation',
    name: 'Balloon Reveal Animation Test',
    description: 'Testing different balloon pop animations',
    variants: {
      control: {
        weight: 0.5,
        config: {
          animationType: 'pop',
          duration: 500,
          hapticFeedback: true,
        },
      },
      burst: {
        weight: 0.25,
        config: {
          animationType: 'burst',
          duration: 700,
          hapticFeedback: true,
          particles: true,
        },
      },
      fade: {
        weight: 0.25,
        config: {
          animationType: 'fade',
          duration: 400,
          hapticFeedback: false,
        },
      },
    },
    enabled: true,
    audience: {
      percentage: 1.0,
    },
  },
  
  SUBSCRIPTION_UPSELL_TIMING: {
    key: 'subscription_upsell_timing',
    name: 'Subscription Upsell Timing',
    description: 'When to show subscription upsell',
    variants: {
      control: {
        weight: 0.33,
        config: {
          trigger: 'after_3_pops',
          delay: 0,
        },
      },
      immediate: {
        weight: 0.33,
        config: {
          trigger: 'after_1_pop',
          delay: 0,
        },
      },
      delayed: {
        weight: 0.34,
        config: {
          trigger: 'after_5_pops',
          delay: 2000,
        },
      },
    },
    enabled: true,
    audience: {
      percentage: 1.0,
      criteria: {
        isPremium: false,
      },
    },
  },
  
  ONBOARDING_FLOW: {
    key: 'onboarding_flow',
    name: 'Onboarding Flow Optimization',
    description: 'Testing different onboarding experiences',
    variants: {
      control: {
        weight: 0.5,
        config: {
          showTutorial: true,
          videoProfile: false,
          instantMatch: false,
        },
      },
      streamlined: {
        weight: 0.5,
        config: {
          showTutorial: false,
          videoProfile: true,
          instantMatch: true,
        },
      },
    },
    enabled: true,
    audience: {
      percentage: 1.0,
    },
  },
  
  MATCH_ALGORITHM: {
    key: 'match_algorithm',
    name: 'Matching Algorithm Test',
    description: 'Testing different matching algorithms',
    variants: {
      control: {
        weight: 0.5,
        config: {
          algorithm: 'standard',
          diversityWeight: 0.3,
          locationWeight: 0.4,
          interestWeight: 0.3,
        },
      },
      ai_enhanced: {
        weight: 0.5,
        config: {
          algorithm: 'ai_enhanced',
          diversityWeight: 0.2,
          locationWeight: 0.3,
          interestWeight: 0.5,
        },
      },
    },
    enabled: true,
  },
  
  PREMIUM_PRICING: {
    key: 'premium_pricing',
    name: 'Premium Pricing Test',
    description: 'Testing different price points',
    variants: {
      control: {
        weight: 0.33,
        config: {
          monthly: 9.99,
          yearly: 79.99,
          showDiscount: false,
        },
      },
      higher: {
        weight: 0.33,
        config: {
          monthly: 14.99,
          yearly: 119.99,
          showDiscount: true,
        },
      },
      lower: {
        weight: 0.34,
        config: {
          monthly: 6.99,
          yearly: 59.99,
          showDiscount: false,
        },
      },
    },
    enabled: true,
    audience: {
      percentage: 1.0,
      criteria: {
        isPremium: false,
      },
    },
  },
};

class ABTestingService {
  private static instance: ABTestingService;
  private userVariants: Map<string, string> = new Map();
  private userId: string | null = null;
  
  private constructor() {}
  
  static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }
  
  async initialize(userId: string) {
    this.userId = userId;
    await this.loadUserVariants();
    await this.assignVariants();
  }
  
  private async loadUserVariants() {
    try {
      const stored = await AsyncStorage.getItem('abTestVariants');
      if (stored) {
        const variants = JSON.parse(stored);
        Object.entries(variants).forEach(([key, value]) => {
          this.userVariants.set(key, value as string);
        });
      }
    } catch (error) {
      console.error('Failed to load AB test variants:', error);
    }
  }
  
  private async assignVariants() {
    for (const [key, test] of Object.entries(AB_TESTS)) {
      if (!test.enabled) continue;
      
      // Check if user already has a variant
      if (this.userVariants.has(key)) continue;
      
      // Check audience criteria
      if (!(await this.isInAudience(test))) continue;
      
      // Assign variant
      const variant = this.selectVariant(test);
      this.userVariants.set(key, variant);
      
      // Track assignment
      AnalyticsService.setExperiment(key, variant);
    }
    
    // Save variants
    await this.saveUserVariants();
  }
  
  private async isInAudience(test: ABTest): Promise<boolean> {
    if (!test.audience) return true;
    
    // Check percentage
    const hash = this.hashUserId(this.userId + test.key);
    const percentage = (hash % 100) / 100;
    if (percentage > test.audience.percentage) return false;
    
    // Check criteria
    if (test.audience.criteria) {
      // Implement criteria checking based on user properties
      // This would check things like isPremium, daysSinceInstall, etc.
    }
    
    return true;
  }
  
  private selectVariant(test: ABTest): string {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [variant, config] of Object.entries(test.variants)) {
      cumulative += config.weight;
      if (random <= cumulative) {
        return variant;
      }
    }
    
    return 'control';
  }
  
  private hashUserId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  private async saveUserVariants() {
    try {
      const variants: { [key: string]: string } = {};
      this.userVariants.forEach((value, key) => {
        variants[key] = value;
      });
      await AsyncStorage.setItem('abTestVariants', JSON.stringify(variants));
    } catch (error) {
      console.error('Failed to save AB test variants:', error);
    }
  }
  
  getVariant(testKey: string): string {
    return this.userVariants.get(testKey) || 'control';
  }
  
  getConfig(testKey: string): any {
    const variant = this.getVariant(testKey);
    const test = AB_TESTS[testKey];
    return test?.variants[variant]?.config || {};
  }
  
  isInVariant(testKey: string, variant: string): boolean {
    return this.getVariant(testKey) === variant;
  }
  
  // Force a specific variant (for testing)
  async forceVariant(testKey: string, variant: string) {
    this.userVariants.set(testKey, variant);
    await this.saveUserVariants();
    AnalyticsService.setExperiment(testKey, variant);
  }
  
  // Clear all variants (for testing)
  async clearVariants() {
    this.userVariants.clear();
    await AsyncStorage.removeItem('abTestVariants');
  }
}

// React Hook for A/B Testing
export function useABTest(testKey: string) {
  const [variant, setVariant] = useState('control');
  const [config, setConfig] = useState<any>({});
  
  useEffect(() => {
    const service = ABTestingService.getInstance();
    const testVariant = service.getVariant(testKey);
    const testConfig = service.getConfig(testKey);
    
    setVariant(testVariant);
    setConfig(testConfig);
  }, [testKey]);
  
  return { variant, config };
}

// React Hook for checking specific variant
export function useIsInVariant(testKey: string, variant: string): boolean {
  const [isInVariant, setIsInVariant] = useState(false);
  
  useEffect(() => {
    const service = ABTestingService.getInstance();
    setIsInVariant(service.isInVariant(testKey, variant));
  }, [testKey, variant]);
  
  return isInVariant;
}

export default ABTestingService.getInstance();
