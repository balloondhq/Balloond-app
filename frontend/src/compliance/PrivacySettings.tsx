import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface PrivacySetting {
  key: string;
  title: string;
  description: string;
  required: boolean;
  defaultValue: boolean;
}

const privacySettings: PrivacySetting[] = [
  {
    key: 'analytics',
    title: 'Analytics & Performance',
    description: 'Help us improve the app by sharing anonymous usage data',
    required: false,
    defaultValue: true,
  },
  {
    key: 'personalization',
    title: 'Personalization',
    description: 'Use your data to personalize your experience and improve matches',
    required: false,
    defaultValue: true,
  },
  {
    key: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive updates about new features and special offers',
    required: false,
    defaultValue: false,
  },
  {
    key: 'crashReporting',
    title: 'Crash Reports',
    description: 'Automatically send crash reports to help us fix issues',
    required: false,
    defaultValue: true,
  },
  {
    key: 'locationTracking',
    title: 'Location Services',
    description: 'Use your location to find matches nearby',
    required: false,
    defaultValue: true,
  },
  {
    key: 'thirdPartySharing',
    title: 'Third-Party Sharing',
    description: 'Share data with partners for enhanced features (you can opt out)',
    required: false,
    defaultValue: false,
  },
];

interface Props {
  onComplete: (settings: { [key: string]: boolean }) => void;
  isInitialSetup?: boolean;
}

export default function PrivacySettings({ onComplete, isInitialSetup = false }: Props) {
  const [settings, setSettings] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    privacySettings.forEach(setting => {
      initial[setting.key] = setting.defaultValue;
    });
    return initial;
  });
  
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const handleToggle = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAcceptAll = () => {
    const newSettings: { [key: string]: boolean } = {};
    privacySettings.forEach(setting => {
      newSettings[setting.key] = true;
    });
    setSettings(newSettings);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRejectNonEssential = () => {
    const newSettings: { [key: string]: boolean } = {};
    privacySettings.forEach(setting => {
      newSettings[setting.key] = setting.required;
    });
    setSettings(newSettings);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleSave = async () => {
    // Save privacy settings
    await AsyncStorage.setItem('privacySettings', JSON.stringify(settings));
    await AsyncStorage.setItem('privacySettingsVersion', '1.0');
    await AsyncStorage.setItem('privacySettingsDate', new Date().toISOString());
    
    // Track consent
    if (settings.analytics) {
      // Initialize analytics with consent
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(settings);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://balloond.app/privacy-policy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://balloond.app/terms-of-service');
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F5DC', '#FFF8DC']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={60} color="#8B1538" />
          <Text style={styles.title}>Privacy Settings</Text>
          <Text style={styles.subtitle}>
            {isInitialSetup 
              ? "Let's set up your privacy preferences"
              : "Manage how your data is used"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickButton} onPress={handleAcceptAll}>
            <Text style={styles.quickButtonText}>Accept All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickButton, styles.quickButtonSecondary]} 
            onPress={handleRejectNonEssential}
          >
            <Text style={styles.quickButtonTextSecondary}>Essential Only</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={styles.settingsContainer}>
          {privacySettings.map((setting) => (
            <View key={setting.key} style={styles.settingItem}>
              <TouchableOpacity 
                style={styles.settingHeader}
                onPress={() => toggleSection(setting.key)}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    {setting.title}
                    {setting.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <Text style={styles.settingDescription}>{setting.description}</Text>
                </View>
                <Switch
                  value={settings[setting.key]}
                  onValueChange={(value) => handleToggle(setting.key, value)}
                  disabled={setting.required}
                  trackColor={{ false: '#DDD', true: '#8B1538' }}
                  thumbColor={settings[setting.key] ? '#FFF' : '#F4F3F4'}
                />
              </TouchableOpacity>
              
              {expandedSections[setting.key] && (
                <View style={styles.expandedContent}>
                  <Text style={styles.expandedText}>
                    {getExpandedDescription(setting.key)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity style={styles.legalLink} onPress={openPrivacyPolicy}>
            <Ionicons name="document-text" size={20} color="#8B1538" />
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#8B1538" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.legalLink} onPress={openTermsOfService}>
            <Ionicons name="document" size={20} color="#8B1538" />
            <Text style={styles.legalLinkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#8B1538" />
          </TouchableOpacity>
        </View>

        {/* Data Rights */}
        <View style={styles.dataRights}>
          <Text style={styles.dataRightsTitle}>Your Data Rights</Text>
          <Text style={styles.dataRightsText}>
            You have the right to access, correct, delete, or export your data at any time. 
            Visit your account settings to manage your data.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={['#8B1538', '#D2691E']}
            style={styles.saveButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>
              {isInitialSetup ? 'Continue' : 'Save Settings'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getExpandedDescription(key: string): string {
  const descriptions: { [key: string]: string } = {
    analytics: 'We collect anonymous usage data to understand how users interact with the app. This helps us identify bugs, improve performance, and develop new features. No personally identifiable information is included.',
    personalization: 'Your preferences, interactions, and profile data are used to improve match quality and customize your experience. This data is never sold to third parties.',
    marketing: 'Receive notifications about new features, special promotions, and app updates. You can unsubscribe at any time.',
    crashReporting: 'When the app crashes, technical information about the error is sent to help us fix the issue. This may include device information but never includes personal data.',
    locationTracking: 'Your location is used to find matches in your area. Location data is only collected while using the app and is never shared with other users beyond the distance shown.',
    thirdPartySharing: 'Some features require sharing data with trusted partners (e.g., payment processors, cloud services). We only share the minimum necessary data and require partners to protect your information.',
  };
  return descriptions[key] || '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#8B1538',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickButtonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8B1538',
  },
  quickButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickButtonTextSecondary: {
    color: '#8B1538',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  settingItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  required: {
    color: '#FF0000',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  expandedText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  legalSection: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  legalLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  dataRights: {
    backgroundColor: '#F5F5DC',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
  },
  dataRightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dataRightsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 20,
  },
  saveButtonGradient: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
