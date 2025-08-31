/**
 * Location service
 * Handles geolocation calculations and queries
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateLocationDto } from '../users/dto/user.dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update user's location
   */
  async updateUserLocation(userId: string, locationDto: UpdateLocationDto) {
    const { latitude, longitude, radius } = locationDto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude,
        location: { lat: latitude, lng: longitude },
        radius: radius || 50,
        lastLocationUpdate: new Date(),
      },
    });

    return {
      success: true,
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        radius: user.radius,
        lastUpdated: user.lastLocationUpdate,
      },
    };
  }

  /**
   * Find nearby users within radius
   */
  async findNearbyUsers(userId: string, radiusOverride?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        radius: true,
        minAge: true,
        maxAge: true,
      },
    });

    if (!user || !user.latitude || !user.longitude) {
      throw new NotFoundException('User location not set');
    }

    const radius = radiusOverride || user.radius;
    
    // Use PostGIS for efficient spatial queries
    const nearbyUsers = await this.prisma.findNearbyUsers(
      user.latitude,
      user.longitude,
      radius,
      userId,
    );

    // Filter by age preferences
    const filteredUsers = nearbyUsers.filter(u => {
      if (!u.age) return true;
      return u.age >= user.minAge && u.age <= user.maxAge;
    });

    return filteredUsers;
  }

  /**
   * Calculate distance between two users using Haversine formula
   */
  async calculateDistance(userId: string, targetUserId: string) {
    const [user, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { latitude: true, longitude: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { latitude: true, longitude: true, name: true },
      }),
    ]);

    if (!user || !user.latitude || !user.longitude) {
      throw new NotFoundException('User location not set');
    }

    if (!targetUser || !targetUser.latitude || !targetUser.longitude) {
      throw new NotFoundException('Target user location not available');
    }

    const distance = this.calculateHaversineDistance(
      user.latitude,
      user.longitude,
      targetUser.latitude,
      targetUser.longitude,
    );

    return {
      targetUser: {
        id: targetUserId,
        name: targetUser.name,
      },
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      unit: 'km',
    };
  }

  /**
   * Haversine formula to calculate distance between two points
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degree: number): number {
    return degree * (Math.PI / 180);
  }
}
