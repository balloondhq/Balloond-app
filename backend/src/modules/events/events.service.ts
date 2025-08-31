// Group Events Service for Speed Dating and Mixers
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateEventDto, JoinEventDto, SpeedDatingMatchDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async createEvent(userId: string, dto: CreateEventDto): Promise<any> {
    // Verify user is premium or event host
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription?.tier || !['premium', 'gold'].includes(user.subscription.tier)) {
      throw new BadRequestException('Premium subscription required to host events');
    }

    // Create event
    const event = await this.prisma.groupEvent.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        hostId: userId,
        maxParticipants: dto.maxParticipants,
        minParticipants: dto.minParticipants,
        startTime: new Date(dto.startTime),
        duration: dto.duration,
        locationLat: dto.location?.lat,
        locationLon: dto.location?.lon,
        locationName: dto.location?.name,
        isVirtual: dto.isVirtual,
        roomUrl: dto.isVirtual ? this.generateRoomUrl() : null,
        themeId: dto.themeId,
        entryFee: dto.entryFee || 0,
        status: 'upcoming',
      },
    });

    // Auto-join host
    await this.joinEvent(userId, event.id);

    // Schedule event start
    this.scheduleEventStart(event);

    return event;
  }

  async joinEvent(userId: string, eventId: string): Promise<any> {
    const event = await this.prisma.groupEvent.findUnique({
      where: { id: eventId },
      include: { _count: { select: { participants: true } } },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'upcoming') {
      throw new BadRequestException('Event has already started or ended');
    }

    if (event._count.participants >= event.maxParticipants) {
      throw new BadRequestException('Event is full');
    }

    // Check if already joined
    const existing = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already joined this event');
    }

    // Process payment if required
    if (event.entryFee > 0) {
      await this.processEventPayment(userId, event.entryFee);
    }

    // Join event
    const participant = await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
        status: 'registered',
      },
    });

    // Emit event
    this.eventEmitter.emit('event.joined', {
      userId,
      eventId,
      event,
    });

    return participant;
  }

  async startSpeedDating(eventId: string): Promise<void> {
    const event = await this.prisma.groupEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          where: { status: 'registered' },
          include: { user: true },
        },
      },
    });

    if (!event || event.type !== 'speed_dating') {
      throw new BadRequestException('Invalid speed dating event');
    }

    // Update event status
    await this.prisma.groupEvent.update({
      where: { id: eventId },
      data: { status: 'active' },
    });

    // Create rounds
    const rounds = await this.createSpeedDatingRounds(event);
    
    // Start first round
    await this.startRound(rounds[0]);
  }

  private async createSpeedDatingRounds(event: any): Promise<any[]> {
    const participants = event.participants.map(p => p.user);
    const rounds = [];
    const roundDuration = 180; // 3 minutes per round
    const totalRounds = Math.min(participants.length - 1, 10); // Max 10 rounds

    for (let i = 0; i < totalRounds; i++) {
      const round = await this.prisma.speedDatingRound.create({
        data: {
          eventId: event.id,
          roundNumber: i + 1,
          duration: roundDuration,
        },
      });

      // Create pairings for this round
      const pairings = this.generateRoundPairings(participants, i);
      
      for (const pair of pairings) {
        await this.prisma.speedDatingMatch.create({
          data: {
            roundId: round.id,
            userAId: pair.userA.id,
            userBId: pair.userB.id,
          },
        });
      }

      rounds.push(round);
    }

    return rounds;
  }

  private generateRoundPairings(participants: any[], roundIndex: number): any[] {
    const pairings = [];
    const shuffled = this.rotateArray(participants, roundIndex);
    
    for (let i = 0; i < shuffled.length / 2; i++) {
      if (shuffled[i] && shuffled[shuffled.length - 1 - i]) {
        pairings.push({
          userA: shuffled[i],
          userB: shuffled[shuffled.length - 1 - i],
        });
      }
    }

    return pairings;
  }

  private rotateArray(arr: any[], positions: number): any[] {
    if (arr.length <= 1) return arr;
    
    // Keep first element fixed (for round-robin)
    const fixed = arr[0];
    const rotating = arr.slice(1);
    
    const rotated = [
      ...rotating.slice(positions % rotating.length),
      ...rotating.slice(0, positions % rotating.length),
    ];
    
    return [fixed, ...rotated];
  }

  async startRound(round: any): Promise<void> {
    // Update round status
    await this.prisma.speedDatingRound.update({
      where: { id: round.id },
      data: { startedAt: new Date() },
    });

    // Notify participants
    const matches = await this.prisma.speedDatingMatch.findMany({
      where: { roundId: round.id },
      include: {
        userA: true,
        userB: true,
      },
    });

    for (const match of matches) {
      // Create temporary chat room
      const roomId = `speed-date-${round.id}-${match.id}`;
      
      // Emit to both users
      this.eventEmitter.emit('speed-dating.round-start', {
        roundId: round.id,
        roomId,
        userA: match.userA,
        userB: match.userB,
        duration: round.duration,
      });
    }

    // Schedule round end
    setTimeout(() => {
      this.endRound(round.id);
    }, round.duration * 1000);
  }

  async endRound(roundId: string): Promise<void> {
    // Update round status
    await this.prisma.speedDatingRound.update({
      where: { id: roundId },
      data: { endedAt: new Date() },
    });

    // Emit round end event
    this.eventEmitter.emit('speed-dating.round-end', { roundId });

    // Get next round
    const currentRound = await this.prisma.speedDatingRound.findUnique({
      where: { id: roundId },
    });

    const nextRound = await this.prisma.speedDatingRound.findFirst({
      where: {
        eventId: currentRound.eventId,
        roundNumber: currentRound.roundNumber + 1,
      },
    });

    if (nextRound) {
      // Start next round after break
      setTimeout(() => {
        this.startRound(nextRound);
      }, 30000); // 30 second break between rounds
    } else {
      // Event finished
      await this.endSpeedDatingEvent(currentRound.eventId);
    }
  }

  async submitSpeedDatingInterest(
    userId: string,
    matchId: string,
    interested: boolean
  ): Promise<void> {
    const match = await this.prisma.speedDatingMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Update interest
    if (userId === match.userAId) {
      await this.prisma.speedDatingMatch.update({
        where: { id: matchId },
        data: { userAInterested: interested },
      });
    } else if (userId === match.userBId) {
      await this.prisma.speedDatingMatch.update({
        where: { id: matchId },
        data: { userBInterested: interested },
      });
    }

    // Check for mutual interest
    const updated = await this.prisma.speedDatingMatch.findUnique({
      where: { id: matchId },
    });

    if (updated.userAInterested && updated.userBInterested) {
      // Create a match!
      await this.createMatchFromSpeedDating(updated);
    }
  }

  private async createMatchFromSpeedDating(speedMatch: any): Promise<void> {
    // Create regular match
    const match = await this.prisma.match.create({
      data: {
        userAId: speedMatch.userAId,
        userBId: speedMatch.userBId,
        matchedAt: new Date(),
        matchType: 'speed_dating',
      },
    });

    // Update speed dating match
    await this.prisma.speedDatingMatch.update({
      where: { id: speedMatch.id },
      data: { matched: true },
    });

    // Notify users
    this.eventEmitter.emit('match.created', {
      match,
      source: 'speed_dating',
    });
  }

  private async endSpeedDatingEvent(eventId: string): Promise<void> {
    // Update event status
    await this.prisma.groupEvent.update({
      where: { id: eventId },
      data: { status: 'completed' },
    });

    // Get all matches
    const matches = await this.prisma.speedDatingMatch.findMany({
      where: {
        round: {
          eventId,
        },
        matched: true,
      },
      include: {
        userA: true,
        userB: true,
      },
    });

    // Send summary to participants
    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      include: { user: true },
    });

    for (const participant of participants) {
      const userMatches = matches.filter(
        m => m.userAId === participant.userId || m.userBId === participant.userId
      );

      this.eventEmitter.emit('speed-dating.event-complete', {
        userId: participant.userId,
        eventId,
        matches: userMatches,
        totalMatches: userMatches.length,
      });
    }
  }

  async getUpcomingEvents(
    userId: string,
    filters?: any
  ): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { location: true },
    });

    const where: any = {
      status: 'upcoming',
      startTime: { gte: new Date() },
    };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.maxDistance && user?.location) {
      // Add location filter
      where.AND = [
        {
          OR: [
            { isVirtual: true },
            {
              // Use PostGIS for distance calculation
              AND: [
                { locationLat: { not: null } },
                { locationLon: { not: null } },
              ],
            },
          ],
        },
      ];
    }

    const events = await this.prisma.groupEvent.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            photos: { take: 1 },
          },
        },
        theme: true,
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });

    return events;
  }

  async getEventDetails(eventId: string): Promise<any> {
    const event = await this.prisma.groupEvent.findUnique({
      where: { id: eventId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            photos: true,
            isVerified: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photos: { take: 1 },
              },
            },
          },
        },
        theme: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private generateRoomUrl(): string {
    return `https://meet.balloond.com/room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processEventPayment(userId: string, amount: number): Promise<void> {
    // Implement payment processing
    // This would integrate with Stripe or another payment provider
    console.log(`Processing payment of $${amount} for user ${userId}`);
  }

  private scheduleEventStart(event: any): void {
    const startTime = new Date(event.startTime);
    const now = new Date();
    const delay = startTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        if (event.type === 'speed_dating') {
          this.startSpeedDating(event.id);
        } else {
          this.startGeneralEvent(event.id);
        }
      }, delay);
    }
  }

  private async startGeneralEvent(eventId: string): Promise<void> {
    await this.prisma.groupEvent.update({
      where: { id: eventId },
      data: { status: 'active' },
    });

    // Notify participants
    this.eventEmitter.emit('event.started', { eventId });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredEvents(): Promise<void> {
    const expiredEvents = await this.prisma.groupEvent.findMany({
      where: {
        status: 'active',
        startTime: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    for (const event of expiredEvents) {
      await this.prisma.groupEvent.update({
        where: { id: event.id },
        data: { status: 'completed' },
      });
    }
  }
}