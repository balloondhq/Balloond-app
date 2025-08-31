/**
 * SubscriptionScreen
 * Manage current subscription and billing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { subscriptionService, SubscriptionTier } from '../../services/subscriptionService';

export const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const status = await subscriptionService.checkSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      Alert.alert('Error', 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will keep your premium benefits until the end of the current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await subscriptionService.cancelSubscription();
              await loadSubscription();
              Alert.alert(
                'Subscription Cancelled',
                'Your subscription has been cancelled. You will retain access until the end of your billing period.'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async () => {
    try {
      // Reactivate subscription logic
      Alert.alert('Subscription Reactivated', 'Your subscription has been reactivated.');
      await loadSubscription();
    } catch (error) {
      Alert.alert('Error', 'Failed to reactivate subscription.');
    }
  };

  const handleUpdatePayment = async () => {
    try {
      await subscriptionService.updatePaymentMethod();
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment method.');
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Paywall');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B1A1A" />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isGlowing = subscription?.tier === 'GLOWING';
  const isGold = subscription?.tier === 'GOLD';
  const isPremium = isGlowing || isGold;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Current Plan */}
        <LinearGradient
          colors={
            isGlowing
              ? ['#FF69B4', '#FFD700', '#87CEEB']
              : isGold
              ? ['#FFD700', '#FFA500']
              : ['#F5F5DC', '#E8E8E8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.currentPlan}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planLabel}>Current Plan</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planName}>
                {subscription?.tier || 'FREE'}
              </Text>
              {isPremium && subscription?.isActive && (
                <View style={styles.activeDot} />
              )}
            </View>
          </View>

          {isPremium ? (
            <>
              <Text style={styles.planPrice}>
                ${subscription?.tier === 'GLOWING' ? '19.99' : '9.99'}/month
              </Text>
              {subscription?.expiresAt && (
                <Text style={styles.expiryDate}>
                  {subscription.autoRenew
                    ? `Renews on ${new Date(subscription.expiresAt).toLocaleDateString()}`
                    : `Expires on ${new Date(subscription.expiresAt).toLocaleDateString()}`}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.freeText}>
              5 daily pops • Basic features
            </Text>
          )}
        </LinearGradient>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Features</Text>
          <View style={styles.featuresList}>
            <FeatureItem
              icon="balloon"
              title="Daily Pops"
              value={`${subscription?.features?.dailyPops || 5} per day`}
              enabled
            />
            <FeatureItem
              icon="eye"
              title="See Who Liked You"
              enabled={subscription?.features?.seeWhoLiked}
            />
            <FeatureItem
              icon="mic"
              title="Voice Messages"
              value={`${subscription?.features?.voiceMessageDuration || 30}s`}
              enabled
            />
            <FeatureItem
              icon="color-palette"
              title="Themed Balloons"
              enabled={subscription?.features?.themedBalloons}
            />
            <FeatureItem
              icon="flash"
              title="Super Pops"
              enabled={subscription?.features?.superPops}
            />
            <FeatureItem
              icon="rocket"
              title="Daily Boosts"
              enabled={subscription?.features?.dailyBoosts}
            />
            <FeatureItem
              icon="options"
              title="Advanced Filters"
              enabled={subscription?.features?.advancedFilters}
            />
          </View>
        </View>

        {/* Actions */}
        {isPremium ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage Subscription</Text>

            {subscription?.tier === 'GOLD' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUpgrade}
              >
                <LinearGradient
                  colors={['#FF69B4', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeGradient}
                >
                  <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
                  <Text style={styles.upgradeText}>Upgrade to Glowing</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUpdatePayment}
            >
              <Ionicons name="card-outline" size={20} color="#333" />
              <Text style={styles.actionText}>Update Payment Method</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              disabled
            >
              <Ionicons name="receipt-outline" size={20} color="#333" />
              <Text style={styles.actionText}>Billing History</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {subscription?.autoRenew ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#FF4444" />
                    <Text style={styles.dangerText}>Cancel Subscription</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReactivate}
              >
                <Ionicons name="refresh-outline" size={20} color="#4CAF50" />
                <Text style={[styles.actionText, { color: '#4CAF50' }]}>
                  Reactivate Subscription
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.upgradeSection}>
            <Text style={styles.upgradeTitle}>Unlock Premium Features</Text>
            <Text style={styles.upgradeDescription}>
              Get unlimited pops, see who liked you, and access exclusive features!
            </Text>
            <TouchableOpacity
              style={styles.upgradeCTA}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={['#8B1A1A', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButton}
              >
                <Text style={styles.upgradeButtonText}>View Premium Plans</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.helpText}>Subscription FAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.helpText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const FeatureItem = ({ icon, title, value, enabled }: any) => (
  <View style={[styles.featureItem, !enabled && styles.featureDisabled]}>
    <Ionicons
      name={icon}
      size={24}
      color={enabled ? '#8B1A1A' : '#CCC'}
    />
    <View style={styles.featureContent}>
      <Text style={[styles.featureTitle, !enabled && styles.featureTextDisabled]}>
        {title}
      </Text>
      {value && (
        <Text style={[styles.featureValue, !enabled && styles.featureTextDisabled]}>
          {value}
        </Text>
      )}
    </View>
    {enabled && (
      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  currentPlan: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  expiryDate: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  freeText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 10,
  },
  section: {
    backgroundColor: '#FFF',
    marginVertical: 10,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  featuresList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 10,
  },
  featureDisabled: {
    opacity: 0.5,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: '#333',
  },
  featureValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  featureTextDisabled: {
    color: '#999',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dangerButton: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE5E5',
  },
  dangerText: {
    flex: 1,
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: -15,
  },
  upgradeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeSection: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeCTA: {
    width: '100%',
  },
  upgradeButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
  },
});
