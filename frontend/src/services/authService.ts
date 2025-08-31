/**
 * Authentication Service
 * Handles authentication API calls
 */

import { apiService } from './apiService';
import { API_ENDPOINTS } from '../config/api';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    photos: string[];
    isVerified: boolean;
  };
  token: string;
}

interface SignupResponse extends LoginResponse {}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiService.post<LoginResponse>(API_ENDPOINTS.LOGIN, {
      email,
      password,
    });
  }

  async signup(email: string, password: string, name: string): Promise<SignupResponse> {
    return apiService.post<SignupResponse>(API_ENDPOINTS.SIGNUP, {
      email,
      password,
      name,
    });
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      await apiService.get(API_ENDPOINTS.PROFILE);
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiService.post<{ token: string }>(API_ENDPOINTS.REFRESH);
  }

  async getProfile() {
    return apiService.get(API_ENDPOINTS.PROFILE);
  }
}

export const authService = new AuthService();
