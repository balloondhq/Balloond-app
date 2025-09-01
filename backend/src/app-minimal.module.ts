/**
 * Minimal app module for Railway deployment
 * Only includes essential features that will build successfully
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Health check
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class MinimalAppModule {}
