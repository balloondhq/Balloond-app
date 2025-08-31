/**
 * Matching Service
 * Handles balloon pop and matching API calls
 */

import { apiService } from './apiService';
import { API_ENDPOINTS } from '../config/api';

export enum PopType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
}

interface Balloon {
  userId: string;
  isPopped: boolean;
  popType: PopType | null;
  preview?: {
    photos: string[];
    name: string;
  };
}

interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    bio?: string;
    age?: number;
  };
  chatId?: string;
  createdAt: Date;
}

interface BalloonAllocation {
  balloonsUsed: number;
  maxBalloons: number;
}

class MatchingService {
  async getBalloons(): Promise<Balloon[]> {
    return apiService.get<Balloon[]>(API_ENDPOINTS.GET_BALLOONS);
  }

  async popBalloon(targetUserId: string, popType: PopType) {
    return apiService.post(API_ENDPOINTS.POP_BALLOON, {
      targetUserId,
      popType,
    });
  }

  async getMatches(): Promise<Match[]> {
    return apiService.get<Match[]>(API_ENDPOINTS.GET_MATCHES);
  }

  async getAllocation(): Promise<BalloonAllocation> {
    return apiService.get<BalloonAllocation>(API_ENDPOINTS.GET_ALLOCATION);
  }
}

export const matchingService = new MatchingService();
