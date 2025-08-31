/**
 * Matching controller
 * Handles balloon pop interactions and matching
 */

import { Controller, Post, Get, Body, Request, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { PopBalloonDto } from './dto/matching.dto';

@ApiTags('matching')
@Controller('matching')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  @Get('balloons')
  @ApiOperation({ summary: 'Get available balloons for user' })
  async getBalloons(@Request() req) {
    return this.matchingService.getAvailableBalloons(req.user.id);
  }

  @Post('pop')
  @ApiOperation({ summary: 'Pop a balloon (single or double)' })
  async popBalloon(@Request() req, @Body() popDto: PopBalloonDto) {
    return this.matchingService.popBalloon(req.user.id, popDto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Get all matches for user' })
  async getMatches(@Request() req) {
    return this.matchingService.getUserMatches(req.user.id);
  }

  @Get('pops/sent')
  @ApiOperation({ summary: 'Get balloons user has popped' })
  async getSentPops(@Request() req) {
    return this.matchingService.getSentPops(req.user.id);
  }

  @Get('pops/received')
  @ApiOperation({ summary: 'Get users who popped your balloon' })
  async getReceivedPops(@Request() req) {
    return this.matchingService.getReceivedPops(req.user.id);
  }

  @Get('allocation')
  @ApiOperation({ summary: 'Get daily balloon allocation status' })
  async getBalloonAllocation(@Request() req) {
    return this.matchingService.getBalloonAllocation(req.user.id);
  }
}
