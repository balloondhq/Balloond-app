/**
 * ChatDetailsScreen
 * Displays chat details, settings, and moderation options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { chatService } from '../../services/chatService';
import { ReportModal } from '../../components/ReportModal';

interface ChatDetailsProps {
  chat: any;
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    bio?: string;
    age?: number;
    location?: string;
    isVerified?: boolean;
    subscriptionTier?: string;
  };
}

export const ChatDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { chat, otherUser } = route.params as ChatDetailsProps;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'USER' | 'MESSAGE'>('USER');
  const [reportContentId, setReportContentId] = useState('');

  const handleToggleNotifications = async () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Update notification preferences on backend
  };

  const handleBlockUser = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser.name}? You won't be able to send or receive messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.blockUser(otherUser.id);
              setIsBlocked(true);
              Alert.alert('User Blocked', `${otherUser.name} has been blocked.`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    try {
      await chatService.unblockUser(otherUser.id);
      setIsBlocked(false);
      Alert.alert('User Unblocked', `${otherUser.name} has been unblocked.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    }
  };

  const handleReportUser = () => {
    setReportType('USER');
    setReportContentId(otherUser.id);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reason: string, description?: string) => {
    try {
      await chatService.reportContent({
        contentType: reportType,
        contentId: reportContentId,
        reason,
        description,
      });
      setShowReportModal(false);
      Alert.alert('Report Submitted', 'Thank you for your report. Our team will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages in this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Implement clear chat functionality
            Alert.alert('Chat Cleared', 'All messages have been removed.');
          },
        },
      ]
    );
  };

  const handleViewProfile = () => {
    navigation.navigate('UserProfile', { userId: otherUser.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#8B1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Info</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Info Section */}
        <TouchableOpacity 
          style={styles.userInfoSection}
          onPress={handleViewProfile}
        >
          <Image
            source={{ uri: otherUser.photos[0] }}
            style={styles.userPhoto}
          />
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{otherUser.name}</Text>
              {otherUser.isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
              {otherUser.subscriptionTier === 'GLOWING' && (
                <Ionicons name="star" size={18} color="#FFD700" />
              )}
            </View>
            {otherUser.bio && (
              <Text style={styles.userBio} numberOfLines={2}>
                {otherUser.bio}
              </Text>
            )}
            <Text style={styles.viewProfile}>View Profile →</Text>
          </View>
        </TouchableOpacity>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#333" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E0E0E0', true: '#FFB6C1' }}
              thumbColor={notificationsEnabled ? '#8B1A1A' : '#999'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-palette-outline" size={22} color="#333" />
              <Text style={styles.settingText}>Chat Theme</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="image-outline" size={22} color="#333" />
              <Text style={styles.settingText}>Media & Files</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Safety</Text>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={handleClearChat}
          >
            <Ionicons name="trash-outline" size={22} color="#FF9500" />
            <Text style={[styles.actionText, { color: '#FF9500' }]}>
              Clear Chat History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={handleReportUser}
          >
            <Ionicons name="flag-outline" size={22} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>
              Report User
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={isBlocked ? handleUnblockUser : handleBlockUser}
          >
            <Ionicons 
              name={isBlocked ? "lock-open-outline" : "ban-outline"} 
              size={22} 
              color="#FF0000" 
            />
            <Text style={[styles.actionText, { color: '#FF0000' }]}>
              {isBlocked ? 'Unblock User' : 'Block User'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shared Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Media</Text>
          
          <View style={styles.mediaGrid}>
            <TouchableOpacity style={styles.mediaItem}>
              <Ionicons name="image" size={24} color="#999" />
              <Text style={styles.mediaCount}>12 Photos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaItem}>
              <Ionicons name="mic" size={24} color="#999" />
              <Text style={styles.mediaCount}>5 Voice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaItem}>
              <Ionicons name="link" size={24} color="#999" />
              <Text style={styles.mediaCount}>3 Links</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Match Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Info</Text>
          <View style={styles.matchInfo}>
            <Text style={styles.matchText}>Matched on</Text>
            <Text style={styles.matchDate}>December 15, 2024</Text>
          </View>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        contentType={reportType}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
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
  userInfoSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  userBio: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  viewProfile: {
    fontSize: 14,
    color: '#8B1A1A',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mediaItem: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  mediaCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  matchInfo: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  matchText: {
    fontSize: 14,
    color: '#666',
  },
  matchDate: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
  },
});
