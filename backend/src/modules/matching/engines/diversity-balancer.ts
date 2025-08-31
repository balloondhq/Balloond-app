// Diversity Balancer to prevent echo chambers and ensure varied matches
export class DiversityBalancer {
  private readonly DIVERSITY_WEIGHT = 0.3;
  private readonly SIMILARITY_THRESHOLD = 0.8;

  calculateDiversity(userA: any, userB: any): number {
    let diversityScore = 50; // Base score

    // Age diversity
    const ageDiff = Math.abs((userA.age || 25) - (userB.age || 25));
    if (ageDiff > 5 && ageDiff < 15) {
      diversityScore += 10; // Moderate age difference is good
    } else if (ageDiff >= 15) {
      diversityScore -= 10; // Too much difference
    }

    // Location diversity (different neighborhoods but same city is ideal)
    const distance = userA.location?.distance_km || 0;
    if (distance > 5 && distance < 30) {
      diversityScore += 15; // Different areas but accessible
    } else if (distance >= 30) {
      diversityScore -= 5; // Might be too far
    }

    // Interest diversity (some overlap but not identical)
    const interestOverlap = this.calculateInterestOverlap(userA.interests, userB.interests);
    if (interestOverlap > 0.3 && interestOverlap < 0.7) {
      diversityScore += 20; // Balanced overlap
    } else if (interestOverlap >= 0.7) {
      diversityScore -= 10; // Too similar
    } else if (interestOverlap <= 0.3) {
      diversityScore -= 5; // Too different
    }

    // Lifestyle diversity
    diversityScore += this.calculateLifestyleDiversity(userA, userB);

    // Personality diversity (complementary traits)
    diversityScore += this.calculatePersonalityBalance(userA, userB);

    return Math.max(0, Math.min(100, diversityScore));
  }

  private calculateInterestOverlap(interestsA: any[], interestsB: any[]): number {
    if (!interestsA?.length || !interestsB?.length) return 0;

    const setA = new Set(interestsA.map(i => i.interest));
    const setB = new Set(interestsB.map(i => i.interest));
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }

  private calculateLifestyleDiversity(userA: any, userB: any): number {
    let score = 0;
    
    // Education level diversity
    if (userA.education && userB.education) {
      const educationLevels = ['high_school', 'bachelors', 'masters', 'phd'];
      const levelA = educationLevels.indexOf(userA.education);
      const levelB = educationLevels.indexOf(userB.education);
      const diff = Math.abs(levelA - levelB);
      
      if (diff === 1) score += 5; // Adjacent levels
      else if (diff === 0) score += 3; // Same level
      else if (diff >= 2) score -= 2; // Too different
    }

    // Career field diversity
    if (userA.career_field && userB.career_field) {
      const complementaryFields = {
        'tech': ['design', 'business', 'marketing'],
        'creative': ['business', 'tech', 'media'],
        'business': ['tech', 'creative', 'finance'],
        'healthcare': ['tech', 'research', 'education'],
        'education': ['tech', 'creative', 'research']
      };

      if (complementaryFields[userA.career_field]?.includes(userB.career_field)) {
        score += 8; // Complementary fields
      } else if (userA.career_field === userB.career_field) {
        score += 2; // Same field (some common ground)
      }
    }

    // Activity level diversity
    if (userA.activity_level && userB.activity_level) {
      const levels = ['sedentary', 'moderate', 'active', 'very_active'];
      const diff = Math.abs(levels.indexOf(userA.activity_level) - levels.indexOf(userB.activity_level));
      
      if (diff <= 1) score += 5; // Similar or adjacent activity levels
      else score -= 3; // Too different
    }

    return score;
  }

  private calculatePersonalityBalance(userA: any, userB: any): number {
    let score = 0;

    // Complementary personality traits
    const complementaryTraits = {
      'introvert': 'extrovert',
      'planner': 'spontaneous',
      'analytical': 'creative',
      'leader': 'supporter',
      'adventurous': 'stable'
    };

    if (userA.personality_traits && userB.personality_traits) {
      for (const [trait, complement] of Object.entries(complementaryTraits)) {
        if (userA.personality_traits.includes(trait) && userB.personality_traits.includes(complement)) {
          score += 7; // Complementary traits
        } else if (userA.personality_traits.includes(trait) && userB.personality_traits.includes(trait)) {
          score += 2; // Same traits (less ideal but some compatibility)
        }
      }
    }

    return Math.min(score, 20); // Cap personality score
  }

  balance(candidates: any[], user: any): any[] {
    // Group candidates by similarity
    const groups = this.groupBySimilarity(candidates);
    
    // Select diverse set from each group
    const balanced = [];
    const targetPerGroup = Math.ceil(candidates.length / groups.length);
    
    for (const group of groups) {
      const selected = this.selectDiverseFromGroup(group, targetPerGroup, user);
      balanced.push(...selected);
    }

    // Add diversity bonus to scores
    return balanced.map(candidate => ({
      ...candidate,
      compatibilityScore: this.adjustScoreForDiversity(candidate, user)
    }));
  }

  private groupBySimilarity(candidates: any[]): any[][] {
    const groups = [];
    const used = new Set();

    for (const candidate of candidates) {
      if (used.has(candidate.id)) continue;

      const group = [candidate];
      used.add(candidate.id);

      for (const other of candidates) {
        if (used.has(other.id)) continue;

        if (this.areSimilar(candidate, other)) {
          group.push(other);
          used.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areSimilar(userA: any, userB: any): boolean {
    // Check if two users are too similar
    const ageSimilar = Math.abs((userA.age || 25) - (userB.age || 25)) < 3;
    const distanceSimilar = Math.abs((userA.distance_km || 0) - (userB.distance_km || 0)) < 5;
    const scoreSimilar = Math.abs((userA.compatibilityScore || 0) - (userB.compatibilityScore || 0)) < 10;

    return ageSimilar && distanceSimilar && scoreSimilar;
  }

  private selectDiverseFromGroup(group: any[], target: number, user: any): any[] {
    // Sort by compatibility score and select with diversity in mind
    group.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    const selected = [];
    const skipInterval = Math.max(1, Math.floor(group.length / target));
    
    for (let i = 0; i < group.length && selected.length < target; i += skipInterval) {
      selected.push(group[i]);
    }

    return selected;
  }

  private adjustScoreForDiversity(candidate: any, user: any): number {
    const baseScore = candidate.compatibilityScore || 50;
    const diversityBonus = this.calculateDiversityBonus(candidate, user);
    
    // Apply diversity weight
    return baseScore * (1 - this.DIVERSITY_WEIGHT) + diversityBonus * this.DIVERSITY_WEIGHT;
  }

  private calculateDiversityBonus(candidate: any, user: any): number {
    let bonus = 0;

    // Bonus for underrepresented attributes
    if (candidate.is_verified && !user.sees_many_verified) {
      bonus += 15;
    }

    // Bonus for different lifestyle
    if (candidate.lifestyle !== user.lifestyle) {
      bonus += 10;
    }

    // Bonus for complementary schedule
    if (this.hasComplementarySchedule(candidate, user)) {
      bonus += 12;
    }

    // Bonus for different social circle likelihood
    if (candidate.distance_km > 10 && candidate.distance_km < 50) {
      bonus += 8;
    }

    return Math.min(bonus, 50);
  }

  private hasComplementarySchedule(userA: any, userB: any): boolean {
    // Check if users have complementary active times
    const morningPerson = (user: any) => user.active_hours?.includes('morning');
    const eveningPerson = (user: any) => user.active_hours?.includes('evening');
    
    return (morningPerson(userA) && eveningPerson(userB)) || 
           (eveningPerson(userA) && morningPerson(userB));
  }

  preventEchoChamber(matches: any[], userHistory: any[]): any[] {
    // Ensure user sees diverse set of profiles over time
    const recentTypes = this.extractRecentTypes(userHistory);
    
    return matches.map(match => {
      const typeScore = this.calculateTypeNovelty(match, recentTypes);
      return {
        ...match,
        compatibilityScore: match.compatibilityScore * (0.8 + 0.2 * typeScore)
      };
    });
  }

  private extractRecentTypes(history: any[]): Map<string, number> {
    const types = new Map<string, number>();
    
    history.forEach(interaction => {
      const type = this.getUserType(interaction);
      types.set(type, (types.get(type) || 0) + 1);
    });
    
    return types;
  }

  private getUserType(user: any): string {
    // Simplified user categorization
    const age = user.age || 25;
    const interests = user.interests?.map(i => i.category).join(',') || '';
    
    let type = '';
    if (age < 25) type += 'young_';
    else if (age < 35) type += 'mid_';
    else type += 'mature_';
    
    if (interests.includes('tech')) type += 'tech';
    else if (interests.includes('creative')) type += 'creative';
    else if (interests.includes('outdoor')) type += 'outdoor';
    else type += 'general';
    
    return type;
  }

  private calculateTypeNovelty(match: any, recentTypes: Map<string, number>): number {
    const matchType = this.getUserType(match);
    const frequency = recentTypes.get(matchType) || 0;
    
    // Higher score for less frequently seen types
    return Math.max(0, 1 - (frequency / 10));
  }
}