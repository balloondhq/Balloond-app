// Premium Features Service - Super Pops, Boosts, Advanced Filters
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PremiumService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  // =================== SUPER POPS ===================

  async sendSuperPop(
    senderId: string,
    receiverId: string,
    message?: string,
    themeId?: string
  ): Promise<any> {
    // Check if user has super pops available
    const user = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: { subscription: true },
    });

    if (!user?.subscription) {
      throw new ForbiddenException('Premium subscription required for Super Pops');
    }

    // Check super pop limits
    const todaysPops = await this.prisma.superPop.count({
      where: {
        senderId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const dailyLimit = this.getSuperPopLimit(user.subscription.tier);
    if (todaysPops >= dailyLimit) {
      throw new BadRequestException(`Daily limit of ${dailyLimit} Super Pops reached`);
    }

    // Check if already sent to this user recently
    const recentPop = await this.prisma.superPop.findFirst({
      where: {
        senderId,
        receiverId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours
        },
      },
    });

    if (recentPop) {
      throw new BadRequestException('You can only send one Super Pop per user per day');
    }

    // Create super pop
    const superPop = await this.prisma.superPop.create({
      data: {
        senderId,
        receiverId,
        message: message?.substring(0, 500), // Limit message length
        themeId,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photos: { take: 1 },
          },
        },
        theme: true,
      },
    });

    // Notify receiver
    this.eventEmitter.emit('super-pop.received', {
      superPop,
      receiverId,
    });

    // Track analytics
    await this.trackPremiumAction(senderId, 'super_pop_sent');

    return superPop;
  }

  private getSuperPopLimit(tier: string): number {
    switch (tier) {
      case 'gold':
        return 5;
      case 'premium':
        return 3;
      case 'plus':
        return 1;
      default:
        return 0;
    }
  }

  async respondToSuperPop(
    userId: string,
    superPopId: string,
    accept: boolean
  ): Promise<any> {
    const superPop = await this.prisma.superPop.findUnique({
      where: { id: superPopId },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!superPop) {
      throw new BadRequestException('Super Pop not found');
    }

    if (superPop.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to respond to this Super Pop');
    }

    if (superPop.status !== 'pending') {
      throw new BadRequestException('Super Pop already responded to');
    }

    // Update status
    const updatedPop = await this.prisma.superPop.update({
      where: { id: superPopId },
      data: {
        status: accept ? 'accepted' : 'declined',
        viewedAt: superPop.viewedAt || new Date(),
        respondedAt: new Date(),
      },
    });

    if (accept) {
      // Create a match
      await this.createMatchFromSuperPop(superPop);
    }

    // Notify sender
    this.eventEmitter.emit('super-pop.responded', {
      superPopId,
      senderId: superPop.senderId,
      accepted: accept,
    });

    return updatedPop;
  }

  private async createMatchFromSuperPop(superPop: any): Promise<void> {
    const match = await this.prisma.match.create({
      data: {
        userAId: superPop.senderId,
        userBId: superPop.receiverId,
        matchedAt: new Date(),
        matchType: 'super_pop',
      },
    });

    this.eventEmitter.emit('match.created', {
      match,
      source: 'super_pop',
    });
  }

  // =================== BOOSTS ===================

  async activateBoost(userId: string, boostType: string): Promise<any> {
    // Check subscription
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription || !['premium', 'gold'].includes(user.subscription.tier)) {
      throw new ForbiddenException('Premium subscription required for Boosts');
    }

    // Check if already has active boost
    const activeBoost = await this.prisma.userBoost.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeBoost) {
      throw new BadRequestException('You already have an active boost');
    }

    // Check boost limits
    const thisWeekBoosts = await this.prisma.userBoost.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const weeklyLimit = user.subscription.tier === 'gold' ? 3 : 1;
    if (thisWeekBoosts >= weeklyLimit) {
      throw new BadRequestException(`Weekly limit of ${weeklyLimit} boosts reached`);
    }

    // Create boost
    const boostConfig = this.getBoostConfig(boostType, user.subscription.tier);
    
    const boost = await this.prisma.userBoost.create({
      data: {
        userId,
        boostType,
        expiresAt: new Date(Date.now() + boostConfig.duration),
        boostMultiplier: boostConfig.multiplier,
        remainingViews: boostConfig.views,
      },
    });

    // Track analytics
    await this.trackPremiumAction(userId, 'boost_activated', { boostType });

    // Notify matching service
    this.eventEmitter.emit('boost.activated', {
      userId,
      boostType,
      multiplier: boostConfig.multiplier,
    });

    return boost;
  }

  private getBoostConfig(boostType: string, tier: string): any {
    const configs = {
      visibility: {
        duration: tier === 'gold' ? 60 * 60 * 1000 : 30 * 60 * 1000, // 60 or 30 minutes
        multiplier: tier === 'gold' ? 10 : 5,
        views: tier === 'gold' ? 1000 : 500,
      },
      super: {
        duration: 15 * 60 * 1000, // 15 minutes
        multiplier: 20,
        views: 2000,
      },
      event: {
        duration: 3 * 60 * 60 * 1000, // 3 hours for events
        multiplier: 3,
        views: 300,
      },
    };

    return configs[boostType] || configs.visibility;
  }

  async getActiveBoost(userId: string): Promise<any> {
    return await this.prisma.userBoost.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // =================== ADVANCED FILTERS ===================

  async setAdvancedFilters(userId: string, filters: any): Promise<any> {
    // Check subscription
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription || !['premium', 'gold'].includes(user.subscription.tier)) {
      throw new ForbiddenException('Premium subscription required for Advanced Filters');
    }

    // Validate filters
    const validatedFilters = this.validateFilters(filters);

    // Upsert filters
    const advancedFilters = await this.prisma.userAdvancedFilter.upsert({
      where: { userId },
      create: {
        userId,
        ...validatedFilters,
        active: true,
      },
      update: {
        ...validatedFilters,
        active: true,
        updatedAt: new Date(),
      },
    });

    // Track analytics
    await this.trackPremiumAction(userId, 'filters_updated');

    return advancedFilters;
  }

  private validateFilters(filters: any): any {
    const validated: any = {};

    // Height filters
    if (filters.minHeight !== undefined) {
      validated.minHeight = Math.max(120, Math.min(250, filters.minHeight));
    }
    if (filters.maxHeight !== undefined) {
      validated.maxHeight = Math.max(120, Math.min(250, filters.maxHeight));
    }

    // Age filters
    if (filters.minAge !== undefined) {
      validated.minAge = Math.max(18, Math.min(100, filters.minAge));
    }
    if (filters.maxAge !== undefined) {
      validated.maxAge = Math.max(18, Math.min(100, filters.maxAge));
    }

    // Distance filter
    if (filters.maxDistance !== undefined) {
      validated.maxDistance = Math.max(1, Math.min(500, filters.maxDistance));
    }

    // Array filters
    const arrayFields = [
      'educationLevels',
      'lifestyleTags',
      'interests',
      'languages',
      'relationshipGoals',
      'religionPreferences',
      'politicalPreferences',
    ];

    arrayFields.forEach(field => {
      if (Array.isArray(filters[field])) {
        validated[field] = filters[field].slice(0, 20); // Limit array size
      }
    });

    // String filters
    const stringFields = [
      'hasChildrenPreference',
      'wantsChildrenPreference',
      'smokingPreference',
      'drinkingPreference',
    ];

    stringFields.forEach(field => {
      if (filters[field]) {
        validated[field] = filters[field].substring(0, 50);
      }
    });

    // Boolean filters
    if (typeof filters.verifiedOnly === 'boolean') {
      validated.verifiedOnly = filters.verifiedOnly;
    }

    return validated;
  }

  async getAdvancedFilters(userId: string): Promise<any> {
    return await this.prisma.userAdvancedFilter.findUnique({
      where: { userId },
    });
  }

  // =================== WHO POPPED YOU ===================

  async getWhoPoppedYou(userId: string, limit: number = 20): Promise<any[]> {
    // Check subscription
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const canSeeAll = user?.subscription?.tier && ['premium', 'gold'].includes(user.subscription.tier);

    const pops = await this.prisma.balloonPopHistory.findMany({
      where: {
        poppedUserId: userId,
      },
      include: {
        popper: {
          select: {
            id: true,
            name: canSeeAll ? true : false,
            photos: canSeeAll ? { take: 1 } : false,
            age: canSeeAll ? true : false,
            bio: canSeeAll ? true : false,
          },
        },
        balloonTheme: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // For non-premium users, blur/hide some information
    if (!canSeeAll) {
      return pops.map(pop => ({
        ...pop,
        popper: {
          id: pop.popper.id,
          name: '???',
          blurred: true,
        },
      }));
    }

    return pops;
  }

  // =================== DAILY BONUSES ===================

  async claimDailyBonus(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed today
    const existingBonus = await this.prisma.dailyBonus.findUnique({
      where: {
        userId_bonusDate: {
          userId,
          bonusDate: today,
        },
      },
    });

    if (existingBonus?.claimed) {
      throw new BadRequestException('Daily bonus already claimed');
    }

    // Get yesterday's streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayBonus = await this.prisma.dailyBonus.findUnique({
      where: {
        userId_bonusDate: {
          userId,
          bonusDate: yesterday,
        },
      },
    });

    const streakDay = yesterdayBonus?.claimed ? (yesterdayBonus.streakDay || 0) + 1 : 1;
    const bonusPops = this.calculateBonusPops(streakDay);

    // Create or update bonus
    const bonus = await this.prisma.dailyBonus.upsert({
      where: {
        userId_bonusDate: {
          userId,
          bonusDate: today,
        },
      },
      create: {
        userId,
        bonusDate: today,
        streakDay,
        bonusPops,
        claimed: true,
        claimedAt: new Date(),
      },
      update: {
        claimed: true,
        claimedAt: new Date(),
        streakDay,
        bonusPops,
      },
    });

    // Update user's available pops
    await this.addBonusPops(userId, bonusPops);

    // Update engagement metrics
    await this.updateEngagementStreak(userId, streakDay);

    return {
      bonus,
      streakDay,
      bonusPops,
      nextBonusPops: this.calculateBonusPops(streakDay + 1),
    };
  }

  private calculateBonusPops(streakDay: number): number {
    if (streakDay >= 30) return 10;
    if (streakDay >= 14) return 7;
    if (streakDay >= 7) return 5;
    if (streakDay >= 3) return 3;
    return 1;
  }

  private async addBonusPops(userId: string, pops: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        availablePops: {
          increment: pops,
        },
      },
    });
  }

  private async updateEngagementStreak(userId: string, streak: number): Promise<void> {
    await this.prisma.userEngagementMetrics.upsert({
      where: { userId },
      create: {
        userId,
        dailyActiveStreak: streak,
        lastActive: new Date(),
      },
      update: {
        dailyActiveStreak: streak,
        lastActive: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // =================== ANALYTICS ===================

  private async trackPremiumAction(
    userId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    // Track premium feature usage for analytics
    await this.prisma.analyticsEvent.create({
      data: {
        userId,
        eventType: 'premium_action',
        eventName: action,
        metadata,
        createdAt: new Date(),
      },
    });
  }

  // =================== SCHEDULED TASKS ===================

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredBoosts(): Promise<void> {
    const expired = await this.prisma.userBoost.findMany({
      where: {
        expiresAt: { lt: new Date() },
        remainingViews: { gt: 0 },
      },
    });

    for (const boost of expired) {
      this.eventEmitter.emit('boost.expired', {
        userId: boost.userId,
        boostType: boost.boostType,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyLimits(): Promise<void> {
    // Reset daily super pop counts (handled by date filtering in queries)
    console.log('Daily limits reset');
  }
}