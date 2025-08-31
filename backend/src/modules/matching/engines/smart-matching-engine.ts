// Smart Matching Engine with ML-based compatibility
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as tf from '@tensorflow/tfjs-node';
import { SentenceEncoder } from './sentence-encoder';
import { DiversityBalancer } from './diversity-balancer';

@Injectable()
export class SmartMatchingEngine {
  private compatibilityModel: tf.LayersModel;
  private sentenceEncoder: SentenceEncoder;
  private diversityBalancer: DiversityBalancer;

  constructor(private prisma: PrismaService) {
    this.sentenceEncoder = new SentenceEncoder();
    this.diversityBalancer = new DiversityBalancer();
    this.initializeModels();
  }

  async initializeModels() {
    // Load pre-trained compatibility model
    try {
      this.compatibilityModel = await tf.loadLayersModel('file://./models/compatibility/model.json');
      console.log('Compatibility model loaded successfully');
    } catch (error) {
      console.log('Creating new compatibility model');
      this.compatibilityModel = this.createCompatibilityModel();
    }
  }

  private createCompatibilityModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [1536], units: 768, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 384, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 192, activation: 'relu' }),
        tf.layers.dense({ units: 96, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async calculateCompatibility(userA: any, userB: any): Promise<number> {
    const scores = await Promise.all([
      this.calculateInterestScore(userA.id, userB.id),
      this.calculatePromptSimilarity(userA.id, userB.id),
      this.calculateEngagementScore(userA.id, userB.id),
      this.calculateDiversityScore(userA, userB),
      this.calculateBehavioralScore(userA.id, userB.id)
    ]);

    // Combine features for ML model
    const features = this.extractFeatures(userA, userB, scores);
    const prediction = await this.predictCompatibility(features);

    // Weighted combination
    const weights = {
      interests: 0.25,
      prompts: 0.20,
      engagement: 0.15,
      diversity: 0.10,
      behavioral: 0.10,
      ml_prediction: 0.20
    };

    const finalScore = 
      scores[0] * weights.interests +
      scores[1] * weights.prompts +
      scores[2] * weights.engagement +
      scores[3] * weights.diversity +
      scores[4] * weights.behavioral +
      prediction * 100 * weights.ml_prediction;

    // Cache the score
    await this.cacheMatchScore(userA.id, userB.id, {
      interest_score: scores[0],
      prompt_similarity_score: scores[1],
      engagement_score: scores[2],
      diversity_score: scores[3],
      total_score: finalScore
    });

    return finalScore;
  }

  private async calculateInterestScore(userAId: string, userBId: string): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT b.interest) * 10 as score
      FROM user_interests a
      JOIN user_interests b ON a.interest = b.interest AND a.category = b.category
      WHERE a.user_id = $1 AND b.user_id = $2
    `;

    const result = await this.prisma.$queryRawUnsafe(query, userAId, userBId);
    return Math.min(result[0]?.score || 0, 100);
  }

  private async calculatePromptSimilarity(userAId: string, userBId: string): Promise<number> {
    try {
      // Get prompt embeddings
      const userAEmbeddings = await this.prisma.$queryRaw`
        SELECT embedding FROM prompt_embeddings WHERE user_id = ${userAId}
      `;
      
      const userBEmbeddings = await this.prisma.$queryRaw`
        SELECT embedding FROM prompt_embeddings WHERE user_id = ${userBId}
      `;

      if (!userAEmbeddings.length || !userBEmbeddings.length) {
        // Fallback to text similarity
        return this.calculateTextSimilarity(userAId, userBId);
      }

      // Calculate cosine similarity between embeddings
      let totalSimilarity = 0;
      let comparisons = 0;

      for (const embA of userAEmbeddings) {
        for (const embB of userBEmbeddings) {
          const similarity = this.cosineSimilarity(embA.embedding, embB.embedding);
          totalSimilarity += similarity;
          comparisons++;
        }
      }

      return comparisons > 0 ? (totalSimilarity / comparisons) * 100 : 0;
    } catch (error) {
      console.error('Error calculating prompt similarity:', error);
      return 0;
    }
  }

  private async calculateTextSimilarity(userAId: string, userBId: string): Promise<number> {
    // Fallback text-based similarity using Levenshtein distance
    const userAPrompts = await this.getUserPrompts(userAId);
    const userBPrompts = await this.getUserPrompts(userBId);

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const promptA of userAPrompts) {
      for (const promptB of userBPrompts) {
        const similarity = this.jaroWinklerSimilarity(promptA, promptB);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private async calculateEngagementScore(userAId: string, userBId: string): Promise<number> {
    const metrics = await this.prisma.$queryRaw`
      SELECT 
        (a.daily_active_streak + b.daily_active_streak) / 2.0 * 5 +
        (a.response_rate + b.response_rate) * 25 +
        (a.profile_completion_score + b.profile_completion_score) * 25 as score
      FROM user_engagement_metrics a, user_engagement_metrics b
      WHERE a.user_id = ${userAId} AND b.user_id = ${userBId}
    `;

    return Math.min(metrics[0]?.score || 0, 100);
  }

  private async calculateDiversityScore(userA: any, userB: any): Promise<number> {
    // Ensure diverse matching to avoid echo chambers
    const score = this.diversityBalancer.calculateDiversity(userA, userB);
    return score;
  }

  private async calculateBehavioralScore(userAId: string, userBId: string): Promise<number> {
    // Analyze past interaction patterns
    const interactions = await this.prisma.$queryRaw`
      SELECT COUNT(*) as mutual_likes
      FROM (
        SELECT receiver_id FROM super_pops WHERE sender_id = ${userAId}
        INTERSECT
        SELECT receiver_id FROM super_pops WHERE sender_id = ${userBId}
      ) as common_interests
    `;

    const popHistory = await this.prisma.$queryRaw`
      SELECT COUNT(*) as previous_pops
      FROM balloon_pop_history
      WHERE (popper_id = ${userAId} AND popped_user_id = ${userBId})
         OR (popper_id = ${userBId} AND popped_user_id = ${userAId})
    `;

    // Higher score if they haven't interacted before but have similar patterns
    const noveltyBonus = popHistory[0]?.previous_pops === 0 ? 20 : 0;
    const similarityScore = Math.min(interactions[0]?.mutual_likes * 10, 50);

    return noveltyBonus + similarityScore + 30; // Base behavioral score
  }

  private extractFeatures(userA: any, userB: any, scores: number[]): number[] {
    // Extract features for ML model
    const features = [
      // Basic demographics
      Math.abs((userA.age || 25) - (userB.age || 25)) / 50, // Age difference normalized
      userA.location?.distance_km || 50 / 100, // Distance normalized
      
      // Scores
      ...scores.map(s => s / 100), // Normalize scores to 0-1
      
      // Profile completeness
      userA.profile_completion || 0.5,
      userB.profile_completion || 0.5,
      
      // Activity levels
      userA.daily_active_streak || 0 / 30, // Normalized by 30 days
      userB.daily_active_streak || 0 / 30,
      
      // Response rates
      userA.response_rate || 0.5,
      userB.response_rate || 0.5,
      
      // Premium status
      userA.is_premium ? 1 : 0,
      userB.is_premium ? 1 : 0,
      
      // Verification status
      userA.is_verified ? 1 : 0,
      userB.is_verified ? 1 : 0
    ];

    // Pad or truncate to match model input shape
    while (features.length < 1536) {
      features.push(0);
    }

    return features.slice(0, 1536);
  }

  private async predictCompatibility(features: number[]): Promise<number> {
    try {
      const input = tf.tensor2d([features]);
      const prediction = this.compatibilityModel.predict(input) as tf.Tensor;
      const result = await prediction.data();
      input.dispose();
      prediction.dispose();
      return result[0];
    } catch (error) {
      console.error('Error in ML prediction:', error);
      return 0.5; // Default neutral score
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 100;
    if (!s1 || !s2) return 0;

    const len1 = s1.length;
    const len2 = s2.length;
    const maxDist = Math.floor(Math.max(len1, len2) / 2) - 1;
    let matches = 0;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - maxDist);
      const end = Math.min(i + maxDist + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let t = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) t++;
      k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - t / 2) / matches) / 3;
    
    // Jaro-Winkler
    let prefixLen = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefixLen++;
      else break;
    }

    return (jaro + prefixLen * 0.1 * (1 - jaro)) * 100;
  }

  private async getUserPrompts(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { prompts: true }
    });
    return user?.prompts || [];
  }

  private async cacheMatchScore(userAId: string, userBId: string, scores: any) {
    await this.prisma.$executeRaw`
      INSERT INTO match_scores (user_a_id, user_b_id, interest_score, prompt_similarity_score, 
                               engagement_score, diversity_score, total_score)
      VALUES (${userAId}, ${userBId}, ${scores.interest_score}, ${scores.prompt_similarity_score},
              ${scores.engagement_score}, ${scores.diversity_score}, ${scores.total_score})
      ON CONFLICT (user_a_id, user_b_id) 
      DO UPDATE SET 
        interest_score = EXCLUDED.interest_score,
        prompt_similarity_score = EXCLUDED.prompt_similarity_score,
        engagement_score = EXCLUDED.engagement_score,
        diversity_score = EXCLUDED.diversity_score,
        total_score = EXCLUDED.total_score,
        last_calculated = NOW()
    `;
  }

  async trainModel(trainingData: any[]) {
    // Training logic for the compatibility model
    const features = [];
    const labels = [];

    for (const data of trainingData) {
      features.push(this.extractFeatures(data.userA, data.userB, data.scores));
      labels.push(data.matched ? 1 : 0);
    }

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    await this.compatibilityModel.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
        }
      }
    });

    // Save the trained model
    await this.compatibilityModel.save('file://./models/compatibility');
    
    xs.dispose();
    ys.dispose();
  }

  async getRankedMatches(userId: string, limit: number = 20): Promise<any[]> {
    // Get potential matches with smart ranking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        interests: true,
        engagement_metrics: true
      }
    });

    // Get candidates within radius
    const candidates = await this.getCandidatesInRadius(userId, user.preferences?.max_distance || 50);
    
    // Calculate compatibility scores for all candidates
    const scoredCandidates = await Promise.all(
      candidates.map(async candidate => ({
        ...candidate,
        compatibilityScore: await this.calculateCompatibility(user, candidate)
      }))
    );

    // Apply diversity balancing
    const balancedCandidates = this.diversityBalancer.balance(scoredCandidates, user);

    // Sort by score and return top matches
    return balancedCandidates
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);
  }

  private async getCandidatesInRadius(userId: string, radiusKm: number): Promise<any[]> {
    const query = `
      SELECT u.*, 
             ST_Distance(u.location, current_user.location) / 1000 as distance_km,
             uem.daily_active_streak,
             uem.response_rate,
             uem.profile_completion_score
      FROM users u
      JOIN user_engagement_metrics uem ON u.id = uem.user_id
      CROSS JOIN (SELECT location FROM users WHERE id = $1) as current_user
      WHERE u.id != $1
        AND u.is_active = true
        AND ST_DWithin(u.location, current_user.location, $2 * 1000)
        AND u.id NOT IN (
          SELECT blocked_user_id FROM user_blocks WHERE user_id = $1
        )
        AND u.id NOT IN (
          SELECT user_id FROM user_blocks WHERE blocked_user_id = $1
        )
      ORDER BY distance_km ASC
      LIMIT 100
    `;

    return await this.prisma.$queryRawUnsafe(query, userId, radiusKm);
  }
}