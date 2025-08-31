/**
 * Users service
 * Handles user data operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateLocationDto } from './dto/user.dto';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(data: any) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        provider: data.provider || AuthProvider.LOCAL,
        providerId: data.providerId,
        photos: data.photos || [],
      },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        age: true,
        photos: true,
        prompts: true,
        latitude: true,
        longitude: true,
        radius: true,
        minAge: true,
        maxAge: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        age: data.age,
        prompts: data.prompts,
        minAge: data.minAge,
        maxAge: data.maxAge,
      },
    });
  }

  /**
   * Update user photos
   */
  async updatePhotos(userId: string, photos: string[]) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { photos },
    });
  }

  /**
   * Update user location
   */
  async updateLocation(userId: string, locationDto: UpdateLocationDto) {
    const { latitude, longitude, radius } = locationDto;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude,
        radius,
        location: { lat: latitude, lng: longitude },
        lastLocationUpdate: new Date(),
      },
    });
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });
  }

  /**
   * Get nearby users within radius
   */
  async getNearbyUsers(userId: string) {
    const user = await this.findById(userId);
    
    if (!user.latitude || !user.longitude) {
      return [];
    }

    // Use PostGIS to find nearby users
    const nearbyUsers = await this.prisma.findNearbyUsers(
      user.latitude,
      user.longitude,
      user.radius,
      userId
    );

    return nearbyUsers;
  }
}
