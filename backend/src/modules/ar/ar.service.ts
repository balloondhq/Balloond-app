// AR Experience Service
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ARService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async getARExperiences(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const isPremium = user?.subscription?.tier && ['premium', 'gold'].includes(user.subscription.tier);

    const experiences = await this.prisma.arExperience.findMany({
      where: {
        OR: [
          { premiumOnly: false },
          { premiumOnly: isPremium },
        ],
      },
    });

    return experiences;
  }

  async startARSession(
    userId: string,
    experienceId: string,
    targetUserId?: string
  ): Promise<any> {
    const experience = await this.prisma.arExperience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundException('AR experience not found');
    }

    // Check premium requirements
    if (experience.premiumOnly) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user?.subscription?.tier || !['premium', 'gold'].includes(user.subscription.tier)) {
        throw new Error('Premium subscription required for this experience');
      }
    }

    // Create AR session
    const session = await this.prisma.arSession.create({
      data: {
        userId,
        experienceId,
        targetUserId,
        sessionData: this.generateSessionData(experience),
        startedAt: new Date(),
      },
    });

    // Emit session start event
    this.eventEmitter.emit('ar.session.started', {
      sessionId: session.id,
      userId,
      experienceId,
      targetUserId,
    });

    return {
      sessionId: session.id,
      experience,
      sessionData: session.sessionData,
      arConfig: this.getARConfig(experience),
    };
  }

  async endARSession(sessionId: string): Promise<void> {
    const session = await this.prisma.arSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('AR session not found');
    }

    await this.prisma.arSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    // Emit session end event
    this.eventEmitter.emit('ar.session.ended', {
      sessionId,
      duration: Date.now() - session.startedAt.getTime(),
    });
  }

  async updateARSession(
    sessionId: string,
    data: any
  ): Promise<void> {
    const session = await this.prisma.arSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('AR session not found');
    }

    const updatedData = {
      ...session.sessionData,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    await this.prisma.arSession.update({
      where: { id: sessionId },
      data: { sessionData: updatedData },
    });
  }

  async recordARBalloonPop(
    sessionId: string,
    balloonData: any
  ): Promise<void> {
    const session = await this.prisma.arSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('AR session not found');
    }

    // Record the pop in session data
    const pops = session.sessionData.pops || [];
    pops.push({
      timestamp: new Date().toISOString(),
      position: balloonData.position,
      balloonType: balloonData.type,
      score: balloonData.score || 10,
    });

    await this.updateARSession(sessionId, { pops });

    // If this was a match reveal AR experience
    if (session.targetUserId && balloonData.isReveal) {
      await this.handleARMatchReveal(session.userId, session.targetUserId);
    }
  }

  private async handleARMatchReveal(userId: string, targetUserId: string): Promise<void> {
    // Create or update balloon pop history
    await this.prisma.balloonPopHistory.create({
      data: {
        popperId: userId,
        poppedUserId: targetUserId,
        revealed: true,
        revealDate: new Date(),
      },
    });

    // Emit match reveal event
    this.eventEmitter.emit('ar.match.revealed', {
      userId,
      targetUserId,
      method: 'ar_experience',
    });
  }

  private generateSessionData(experience: any): any {
    return {
      experienceType: experience.type,
      startTime: new Date().toISOString(),
      config: experience.arConfig,
      pops: [],
      interactions: [],
      score: 0,
    };
  }

  private getARConfig(experience: any): any {
    const baseConfig = {
      modelUrl: experience.arModelUrl,
      trackingMode: 'world',
      lightEstimation: true,
      planeDetection: 'horizontal',
      ...experience.arConfig,
    };

    // Add specific configs based on experience type
    switch (experience.type) {
      case 'balloon_pop':
        return {
          ...baseConfig,
          balloons: {
            spawnRate: 2000, // ms between spawns
            maxBalloons: 10,
            physics: {
              gravity: -0.5,
              windForce: 0.2,
              buoyancy: 1.2,
            },
            animations: {
              float: true,
              wobble: true,
              popEffect: 'particle_burst',
            },
          },
        };
      
      case 'match_reveal':
        return {
          ...baseConfig,
          reveal: {
            animationDuration: 3000,
            particleEffects: true,
            soundEnabled: true,
            celebrationMode: 'hearts',
          },
        };
      
      case 'special_event':
        return {
          ...baseConfig,
          event: {
            timerDisplay: true,
            scoreTracking: true,
            leaderboard: true,
            powerUps: ['double_points', 'time_freeze', 'multi_pop'],
          },
        };
      
      default:
        return baseConfig;
    }
  }

  async getARLeaderboard(experienceId: string, timeframe: 'daily' | 'weekly' | 'all'): Promise<any[]> {
    const startDate = this.getTimeframeStartDate(timeframe);

    const sessions = await this.prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.photos,
        SUM((s.session_data->>'score')::int) as total_score,
        COUNT(s.id) as sessions_played
      FROM ar_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.experience_id = ${experienceId}
        AND s.started_at >= ${startDate}
        AND s.ended_at IS NOT NULL
      GROUP BY u.id, u.name, u.photos
      ORDER BY total_score DESC
      LIMIT 100
    `;

    return sessions.map((session, index) => ({
      rank: index + 1,
      userId: session.id,
      name: session.name,
      photo: session.photos?.[0]?.url,
      score: session.total_score,
      sessionsPlayed: session.sessions_played,
    }));
  }

  private getTimeframeStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      default:
        return new Date(0); // All time
    }
  }

  async getARAnalytics(userId: string): Promise<any> {
    const sessions = await this.prisma.arSession.findMany({
      where: { userId },
      include: { experience: true },
    });

    const totalSessions = sessions.length;
    const totalPlayTime = sessions.reduce((acc, session) => {
      if (session.endedAt) {
        return acc + (session.endedAt.getTime() - session.startedAt.getTime());
      }
      return acc;
    }, 0);

    const totalPops = sessions.reduce((acc, session) => {
      const pops = session.sessionData?.pops || [];
      return acc + pops.length;
    }, 0);

    const favoriteExperience = this.getMostPlayedExperience(sessions);

    return {
      totalSessions,
      totalPlayTimeMinutes: Math.round(totalPlayTime / 60000),
      totalPops,
      averageSessionLength: totalSessions > 0 ? Math.round(totalPlayTime / totalSessions / 60000) : 0,
      favoriteExperience,
      achievements: await this.getARAchievements(userId),
    };
  }

  private getMostPlayedExperience(sessions: any[]): any {
    const experienceCounts = sessions.reduce((acc, session) => {
      const id = session.experienceId;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const mostPlayedId = Object.entries(experienceCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];

    const experience = sessions.find(s => s.experienceId === mostPlayedId)?.experience;
    return experience ? {
      id: experience.id,
      name: experience.name,
      playCount: experienceCounts[mostPlayedId],
    } : null;
  }

  private async getARAchievements(userId: string): Promise<any[]> {
    const achievements = [];

    // Check various achievements
    const sessions = await this.prisma.arSession.count({
      where: { userId },
    });

    if (sessions >= 10) {
      achievements.push({
        id: 'ar_explorer',
        name: 'AR Explorer',
        description: 'Played 10 AR sessions',
        unlockedAt: new Date(),
      });
    }

    if (sessions >= 50) {
      achievements.push({
        id: 'ar_master',
        name: 'AR Master',
        description: 'Played 50 AR sessions',
        unlockedAt: new Date(),
      });
    }

    // Check for high scores
    const highScore = await this.prisma.$queryRaw`
      SELECT MAX((session_data->>'score')::int) as max_score
      FROM ar_sessions
      WHERE user_id = ${userId}
    `;

    if (highScore[0]?.max_score >= 1000) {
      achievements.push({
        id: 'high_scorer',
        name: 'High Scorer',
        description: 'Scored over 1000 points in a single session',
        unlockedAt: new Date(),
      });
    }

    return achievements;
  }
}