/**
 * Location controller
 * Handles location-based operations
 */

import { Controller, Post, Body, Get, Request, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { UpdateLocationDto } from '../users/dto/user.dto';

@ApiTags('location')
@Controller('location')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Post('update')
  @ApiOperation({ summary: 'Update user location' })
  async updateLocation(@Request() req, @Body() locationDto: UpdateLocationDto) {
    return this.locationService.updateUserLocation(req.user.id, locationDto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users within radius' })
  async getNearbyUsers(
    @Request() req,
    @Query('radius') radius?: number,
  ) {
    return this.locationService.findNearbyUsers(
      req.user.id,
      radius ? parseInt(radius.toString()) : undefined,
    );
  }

  @Get('distance')
  @ApiOperation({ summary: 'Calculate distance between two users' })
  async getDistance(
    @Request() req,
    @Query('targetUserId') targetUserId: string,
  ) {
    return this.locationService.calculateDistance(req.user.id, targetUserId);
  }
}
