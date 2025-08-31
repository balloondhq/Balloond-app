/**
 * PaywallScreen
 * Subscription paywall with tier selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { subscriptionService } from '../../services/subscriptionService';

interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
  gradient?: string[];
  badge?: string;
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'gold',
    name: 'Gold',
    price: '$9.99',
    period: 'month',
    features: [
      '15 daily balloon pops',
      'See who liked you',
      'Priority in search results',
      'Advanced filters',
      '60-second voice messages',
      'Read receipts',
    ],
    gradient: ['#FFD700', '#FFA500'],
  },
  {
    id: 'glowing',
    name: 'Glowing',
    price: '$19.99',
    period: 'month',
    features: [
      'Unlimited balloon pops',
      'All Gold features',
      'Themed balloon designs',
      'Super Pops (instant reveal)',
      'Daily profile boosts',
      'Advanced analytics',
      'Priority support',
    ],
    highlighted: true,
    gradient: ['#FF69B4', '#FFD700', '#87CEEB'],
    badge: 'MOST POPULAR',
  },
];

export const PaywallScreen = () => {
  const navigation = useNavigation();
  const [selectedTier, setSelectedTier] = useState<string>('glowing');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const tier = SUBSCRIPTION_TIERS.find(t => t.id === selectedTier);
      if (!tier) return;

      // Process subscription
      await subscriptionService.subscribe(selectedTier);
      
      Alert.alert(
        'Welcome to ' + tier.name + '!',
        'Your subscription is now active. Enjoy your premium features!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Subscription Failed', error.message || 'Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await subscriptionService.restorePurchases();
      Alert.alert('Purchases Restored', 'Your previous purchases have been restored.');
    } catch (error) {
      Alert.alert('Restore Failed', 'No previous purchases found.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        {/* Logo Placeholder */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>🎈</Text>
          </View>
          <Text style={styles.brandName}>Balloon'd Premium</Text>
          <Text style={styles.tagline}>Pop more balloons, find better matches</Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitTitle}>Why Go Premium?</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="infinite" size={24} color="#8B1A1A" />
              <Text style={styles.benefitText}>More Daily Pops</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="eye" size={24} color="#8B1A1A" />
              <Text style={styles.benefitText}>See Who Liked You</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="rocket" size={24} color="#8B1A1A" />
              <Text style={styles.benefitText}>Priority Visibility</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="star" size={24} color="#8B1A1A" />
              <Text style={styles.benefitText}>Premium Features</Text>
            </View>
          </View>
        </View>

        {/* Subscription Tiers */}
        <View style={styles.tiersContainer}>
          {SUBSCRIPTION_TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              onPress={() => setSelectedTier(tier.id)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={tier.gradient || ['#F5F5DC', '#F5F5DC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.tierCard,
                  selectedTier === tier.id && styles.tierCardSelected,
                  tier.highlighted && styles.tierCardHighlighted,
                ]}
              >
                {tier.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tier.badge}</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <Text style={[
                    styles.tierName,
                    tier.id === 'glowing' && styles.glowingText
                  ]}>
                    {tier.name}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{tier.price}</Text>
                    <Text style={styles.period}>/{tier.period}</Text>
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={20} 
                        color={tier.id === 'glowing' ? '#FFD700' : '#4CAF50'} 
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={[
                  styles.selectIndicator,
                  selectedTier === tier.id && styles.selectIndicatorActive,
                ]}>
                  <Ionicons 
                    name={selectedTier === tier.id ? "checkmark-circle" : "ellipse-outline"} 
                    size={24} 
                    color={selectedTier === tier.id ? '#8B1A1A' : '#999'} 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free Tier Info */}
        <View style={styles.freeTierInfo}>
          <Text style={styles.freeTierTitle}>Continue with Free</Text>
          <Text style={styles.freeTierText}>
            • 5 daily balloon pops{'\n'}
            • Basic chat features{'\n'}
            • 30-second voice messages
          </Text>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew unless cancelled 24 hours before the end of the period.
        </Text>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeText}>
              Subscribe to {SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  closeButton: {
    padding: 5,
  },
  restoreText: {
    fontSize: 14,
    color: '#8B1A1A',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 40,
  },
  brandName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B1A1A',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  benefitsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  benefitsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  tiersContainer: {
    paddingHorizontal: 20,
    gap: 15,
  },
  tierCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierCardSelected: {
    borderColor: '#8B1A1A',
    shadowColor: '#8B1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tierCardHighlighted: {
    transform: [{ scale: 1.02 }],
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tierHeader: {
    marginBottom: 15,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  glowingText: {
    color: '#FF69B4',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  selectIndicatorActive: {
    transform: [{ scale: 1.2 }],
  },
  freeTierInfo: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    borderRadius: 10,
  },
  freeTierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  freeTierText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  terms: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  subscribeButton: {
    backgroundColor: '#8B1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  subscribeText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 15,
  },
});
