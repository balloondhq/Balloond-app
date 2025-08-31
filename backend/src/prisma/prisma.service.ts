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
    
    // Enable PostGIS extension
    await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis;`;
    
    console.log('✅ Database connected with PostGIS enabled');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Find users within a specific radius using PostGIS
   * @param lat User's latitude
   * @param lng User's longitude
   * @param radiusKm Search radius in kilometers
   */
  async findNearbyUsers(lat: number, lng: number, radiusKm: number, userId: string) {
    const radiusMeters = radiusKm * 1000;
    
    // Using raw query for PostGIS ST_DWithin function
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
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) as distance
      FROM "User"
      WHERE 
        id != ${userId}
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
        AND "isActive" = true
      ORDER BY distance
      LIMIT 50;
    `;
    
    return nearbyUsers;
  }
}
