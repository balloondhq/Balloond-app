/**
 * Location Service
 * Handles location updates and queries
 */

import * as Location from 'expo-location';
import { apiService } from './apiService';
import { API_ENDPOINTS } from '../config/api';

interface LocationData {
  latitude: number;
  longitude: number;
  radius?: number;
}

interface NearbyUser {
  id: string;
  name: string;
  photos: string[];
  bio?: string;
  age?: number;
  distance: number;
}

class LocationService {
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  async updateLocation(locationData: LocationData) {
    return apiService.put(API_ENDPOINTS.UPDATE_LOCATION, locationData);
  }

  async getNearbyUsers(radius?: number): Promise<NearbyUser[]> {
    const params = radius ? { radius } : {};
    return apiService.get<NearbyUser[]>(API_ENDPOINTS.GET_NEARBY, { params });
  }

  async getDistanceToUser(targetUserId: string): Promise<{ distance: number; unit: string }> {
    return apiService.get(API_ENDPOINTS.GET_DISTANCE, {
      params: { targetUserId },
    });
  }

  async startLocationTracking(callback: (location: LocationData) => void) {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 60000, // Update every minute
        distanceInterval: 100, // Or every 100 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return subscription;
  }
}

export const locationService = new LocationService();
