/**
 * Prisma service for database operations
 * Handles connection lifecycle and provides PostGIS support
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Find users within a specific radius using standard PostgreSQL
   * @param lat User's latitude
   * @param lng User's longitude
   * @param radiusKm Search radius in kilometers
   */
  async findNearbyUsers(lat: number, lng: number, radiusKm: number, userId: string) {
    // Using Haversine formula approximation for distance calculation
    // This works with standard PostgreSQL without PostGIS
    const nearbyUsers = await this.$queryRaw`
      SELECT 
        id, 
        name, 
        bio, 
        age, 
        photos, 
        prompts,
        latitude,
        longitude,
        (
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(latitude))
          )
        ) AS distance
      FROM "User"
      WHERE 
        id != ${userId}
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND "isActive" = true
        AND (
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(latitude))
          )
        ) <= ${radiusKm}
      ORDER BY distance
      LIMIT 50;
    `;
    
    return nearbyUsers;
  }
}
