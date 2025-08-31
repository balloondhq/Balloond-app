/**
 * Matching service
 * Handles balloon pop logic and match creation
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PopBalloonDto } from './dto/matching.dto';
import { PopType } from '@prisma/client';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  /**
   * Get available balloons (nearby users) for the current user
   */
  async getAvailableBalloons(userId: string) {
    // Get nearby users
    const nearbyUsers = await this.usersService.getNearbyUsers(userId);
    
    // Get existing pops by this user
    const existingPops = await this.prisma.pop.findMany({
      where: { userId },
      select: { targetUserId: true, popType: true },
    });

    // Filter out users already double-popped
    const poppedUserIds = new Set(
      existingPops
        .filter(pop => pop.popType === PopType.DOUBLE)
        .map(pop => pop.targetUserId)
    );

    // Transform to balloon format
    const balloons = nearbyUsers
      .filter(user => !poppedUserIds.has(user.id))
      .map(user => {
        const existingPop = existingPops.find(p => p.targetUserId === user.id);
        return {
          userId: user.id,
          isPopped: !!existingPop,
          popType: existingPop?.popType || null,
          // For single pop, show preview (limited info)
          preview: existingPop?.popType === PopType.SINGLE ? {
            photos: [user.photos[0]], // Only first photo, blurred on frontend
            name: user.name.charAt(0) + '***', // First letter only
          } : null,
          // For double pop, full info is available via matches endpoint
        };
      });

    return balloons;
  }

  /**
   * Pop a balloon (single or double)
   */
  async popBalloon(userId: string, popDto: PopBalloonDto) {
    const { targetUserId, popType } = popDto;

    // Check daily allocation
    const allocation = await this.checkBalloonAllocation(userId);
    if (allocation.balloonsUsed >= allocation.maxBalloons) {
      throw new BadRequestException('Daily balloon limit reached');
    }

    // Check if already popped
    const existingPop = await this.prisma.pop.findUnique({
      where: {
        userId_targetUserId: { userId, targetUserId },
      },
    });

    if (existingPop) {
      if (existingPop.popType === PopType.DOUBLE) {
        throw new BadRequestException('Already double-popped this balloon');
      }
      
      if (popType === PopType.DOUBLE) {
        // Upgrade from single to double pop
        const updatedPop = await this.prisma.pop.update({
          where: { id: existingPop.id },
          data: { 
            popType: PopType.DOUBLE,
            revealed: true,
          },
        });

        // Check for mutual match
        await this.checkAndCreateMatch(userId, targetUserId);

        // Update balloon allocation
        await this.updateBalloonAllocation(userId);

        return updatedPop;
      }
    }

    // Create new pop
    const newPop = await this.prisma.pop.create({
      data: {
        userId,
        targetUserId,
        popType,
        revealed: popType === PopType.DOUBLE,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            photos: true,
            bio: true,
            age: true,
          },
        },
      },
    });

    // Check for mutual match if double pop
    if (popType === PopType.DOUBLE) {
      await this.checkAndCreateMatch(userId, targetUserId);
    }

    // Update balloon allocation
    await this.updateBalloonAllocation(userId);

    return newPop;
  }

  /**
   * Check and create match if both users double-popped each other
   */
  private async checkAndCreateMatch(userId: string, targetUserId: string) {
    // Check if both users have double-popped each other
    const mutualPops = await this.prisma.pop.findMany({
      where: {
        OR: [
          { userId, targetUserId, popType: PopType.DOUBLE },
          { userId: targetUserId, targetUserId: userId, popType: PopType.DOUBLE },
        ],
      },
    });

    if (mutualPops.length === 2) {
      // Check if match already exists
      const existingMatch = await this.prisma.match.findFirst({
        where: {
          OR: [
            { userId, matchedUserId: targetUserId },
            { userId: targetUserId, matchedUserId: userId },
          ],
        },
      });

      if (!existingMatch) {
        // Create match
        const match = await this.prisma.match.create({
          data: {
            userId,
            matchedUserId: targetUserId,
          },
        });

        // Create chat for the match
        await this.prisma.chat.create({
          data: {
            matchId: match.id,
            participants: {
              create: [
                { userId },
                { userId: targetUserId },
              ],
            },
          },
        });

        return match;
      }
    }

    return null;
  }

  /**
   * Get user's matches
   */
  async getUserMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [
          { userId },
          { matchedUserId: userId },
        ],
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photos: true,
            bio: true,
            age: true,
          },
        },
        matchedUser: {
          select: {
            id: true,
            name: true,
            photos: true,
            bio: true,
            age: true,
          },
        },
        chat: true,
      },
    });

    // Format matches to always show the other user
    return matches.map(match => ({
      ...match,
      otherUser: match.userId === userId ? match.matchedUser : match.user,
    }));
  }

  /**
   * Get pops sent by user
   */
  async getSentPops(userId: string) {
    return this.prisma.pop.findMany({
      where: { userId },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            photos: true,
          },
        },
      },
    });
  }

  /**
   * Get pops received by user
   */
  async getReceivedPops(userId: string) {
    return this.prisma.pop.findMany({
      where: { targetUserId: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photos: true,
          },
        },
      },
    });
  }

  /**
   * Check daily balloon allocation
   */
  private async checkBalloonAllocation(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let allocation = await this.prisma.balloonAllocation.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (!allocation) {
      allocation = await this.prisma.balloonAllocation.create({
        data: {
          userId,
          date: today,
          balloonsUsed: 0,
          maxBalloons: 10, // Free tier limit
        },
      });
    }

    return allocation;
  }

  /**
   * Update balloon allocation
   */
  private async updateBalloonAllocation(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.balloonAllocation.update({
      where: {
        userId_date: { userId, date: today },
      },
      data: {
        balloonsUsed: { increment: 1 },
      },
    });
  }

  /**
   * Get balloon allocation status
   */
  async getBalloonAllocation(userId: string) {
    return this.checkBalloonAllocation(userId);
  }
}
