/**
 * Moderation Service
 * Handles reporting, blocking, and verification
 */

import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReportData {
  contentType: 'USER' | 'MESSAGE';
  contentId: string;
  reason: string;
  description?: string;
}

interface VerificationData {
  selfieData: string; // Base64 encoded
  deviceId?: string;
}

interface VerificationResult {
  verified: boolean;
  similarity: number;
  message: string;
}

interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: Date;
}

class ModerationService {
  private blockedUsers: Set<string> = new Set();
  private readonly BLOCKED_USERS_KEY = 'blocked_users';

  /**
   * Initialize moderation service
   */
  async initialize() {
    try {
      // Load blocked users from local storage
      const stored = await AsyncStorage.getItem(this.BLOCKED_USERS_KEY);
      if (stored) {
        const blocked = JSON.parse(stored);
        this.blockedUsers = new Set(blocked);
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }
  }

  /**
   * Report content (user or message)
   */
  async reportContent(data: ReportData): Promise<{ success: boolean; reportId?: string }> {
    try {
      const response = await apiService.post('/moderation/report', data);
      return { success: true, reportId: response.id };
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('You have already reported this content');
      }
      throw new Error('Failed to submit report');
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiService.post('/moderation/block', { userId });
      
      // Update local cache
      this.blockedUsers.add(userId);
      await this.saveBlockedUsers();
      
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('User already blocked');
      }
      throw new Error('Failed to block user');
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiService.delete(`/moderation/block/${userId}`);
      
      // Update local cache
      this.blockedUsers.delete(userId);
      await this.saveBlockedUsers();
      
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('User is not blocked');
      }
      throw new Error('Failed to unblock user');
    }
  }

  /**
   * Get blocked users list
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const response = await apiService.get<BlockedUser[]>('/moderation/blocks');
      
      // Update local cache
      this.blockedUsers = new Set(response.map(b => b.blockedUserId));
      await this.saveBlockedUsers();
      
      return response;
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
      return [];
    }
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }

  /**
   * Verify profile with selfie
   */
  async verifyProfile(data: VerificationData): Promise<VerificationResult> {
    try {
      const response = await apiService.post<VerificationResult>('/moderation/verify-profile', data);
      return response;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Verification failed');
      }
      throw new Error('Failed to verify profile. Please try again.');
    }
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(): Promise<{
    isVerified: boolean;
    verifiedAt?: Date;
    similarity?: number;
  }> {
    try {
      const response = await apiService.get('/moderation/verification-status');
      return response;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return { isVerified: false };
    }
  }

  /**
   * Scan image for inappropriate content
   */
  async scanImage(imageUrl: string): Promise<{
    safe: boolean;
    confidence: number;
    details?: any;
  }> {
    try {
      const response = await apiService.post('/moderation/scan-image', { imageUrl });
      return response;
    } catch (error) {
      console.error('Failed to scan image:', error);
      // Default to unsafe if scan fails
      return { safe: false, confidence: 0 };
    }
  }

  /**
   * Upload photo with moderation
   */
  async uploadPhotoWithModeration(photoData: string, position?: number): Promise<{
    approved: boolean;
    photoUrl: string;
    message?: string;
  }> {
    try {
      const response = await apiService.post('/moderation/upload-photo', {
        photoData,
        photoType: 'profile',
        position,
      });
      
      return response;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Photo contains inappropriate content');
      }
      throw new Error('Failed to upload photo');
    }
  }

  /**
   * Get moderation history
   */
  async getModerationHistory(): Promise<{
    reports: any[];
    blocks: any[];
    verification: any;
  }> {
    try {
      const response = await apiService.get('/moderation/history');
      return response;
    } catch (error) {
      console.error('Failed to get moderation history:', error);
      return { reports: [], blocks: [], verification: null };
    }
  }

  /**
   * Appeal a moderation decision
   */
  async appealDecision(decisionId: string, reason: string): Promise<{ success: boolean }> {
    try {
      const response = await apiService.post('/moderation/appeal', {
        decisionId,
        reason,
      });
      return { success: true };
    } catch (error) {
      throw new Error('Failed to submit appeal');
    }
  }

  /**
   * Save blocked users to local storage
   */
  private async saveBlockedUsers() {
    try {
      const blocked = Array.from(this.blockedUsers);
      await AsyncStorage.setItem(this.BLOCKED_USERS_KEY, JSON.stringify(blocked));
    } catch (error) {
      console.error('Failed to save blocked users:', error);
    }
  }

  /**
   * Report reasons for UI
   */
  getReportReasons(type: 'USER' | 'MESSAGE') {
    if (type === 'USER') {
      return [
        { id: 'fake_profile', label: 'Fake Profile' },
        { id: 'inappropriate_photos', label: 'Inappropriate Photos' },
        { id: 'harassment', label: 'Harassment or Bullying' },
        { id: 'spam', label: 'Spam or Scam' },
        { id: 'underage', label: 'Under 18' },
        { id: 'violence', label: 'Violence or Threats' },
        { id: 'hate_speech', label: 'Hate Speech' },
        { id: 'other', label: 'Other' },
      ];
    } else {
      return [
        { id: 'inappropriate', label: 'Inappropriate Content' },
        { id: 'harassment', label: 'Harassment' },
        { id: 'spam', label: 'Spam' },
        { id: 'violence', label: 'Violence or Threats' },
        { id: 'hate_speech', label: 'Hate Speech' },
        { id: 'sexual', label: 'Sexual Content' },
        { id: 'other', label: 'Other' },
      ];
    }
  }

  /**
   * Format report for display
   */
  formatReport(report: any) {
    const reasonMap: Record<string, string> = {
      fake_profile: 'Fake Profile',
      inappropriate_photos: 'Inappropriate Photos',
      harassment: 'Harassment',
      spam: 'Spam',
      underage: 'Underage User',
      violence: 'Violence/Threats',
      hate_speech: 'Hate Speech',
      inappropriate: 'Inappropriate Content',
      sexual: 'Sexual Content',
      other: 'Other',
    };

    return {
      ...report,
      reasonDisplay: reasonMap[report.reason] || report.reason,
      statusDisplay: report.status.charAt(0) + report.status.slice(1).toLowerCase(),
      createdAtDisplay: new Date(report.createdAt).toLocaleDateString(),
    };
  }
}

export const moderationService = new ModerationService();
