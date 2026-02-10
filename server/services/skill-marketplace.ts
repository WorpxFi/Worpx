interface MarketplaceSkill {
  id: string;
  name: string;
  authorAgentId: string;
  category: string;
  version: string;
  pricePerCall: number;
  totalExecutions: number;
  avgLatencyMs: number;
  rating: number;
  ratingCount: number;
  chains: string[];
  deprecated: boolean;
}

interface SkillSearchQuery {
  category?: string;
  chain?: string;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'executions' | 'latency';
  limit?: number;
}

export class SkillMarketplace {
  private skills: Map<string, MarketplaceSkill> = new Map();
  private revenueByAuthor: Map<string, number> = new Map();

  registerSkill(skill: Omit<MarketplaceSkill, 'totalExecutions' | 'avgLatencyMs' | 'rating' | 'ratingCount' | 'deprecated'>): string {
    const entry: MarketplaceSkill = {
      ...skill, totalExecutions: 0, avgLatencyMs: 0,
      rating: 0, ratingCount: 0, deprecated: false,
    };
    this.skills.set(skill.id, entry);
    return skill.id;
  }

  search(query: SkillSearchQuery): MarketplaceSkill[] {
    let results = Array.from(this.skills.values()).filter(s => !s.deprecated);
    if (query.category) results = results.filter(s => s.category === query.category);
    if (query.chain) results = results.filter(s => s.chains.includes(query.chain!));
    if (query.maxPrice !== undefined) results = results.filter(s => s.pricePerCall <= query.maxPrice!);
    if (query.minRating !== undefined) results = results.filter(s => s.rating >= query.minRating!);

    const sortKey = query.sortBy ?? 'executions';
    results.sort((a, b) => {
      if (sortKey === 'price') return a.pricePerCall - b.pricePerCall;
      if (sortKey === 'rating') return b.rating - a.rating;
      if (sortKey === 'latency') return a.avgLatencyMs - b.avgLatencyMs;
      return b.totalExecutions - a.totalExecutions;
    });

    return results.slice(0, query.limit ?? 50);
  }

  recordExecution(skillId: string, latencyMs: number, paymentAmount: number): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;
    const prevTotal = skill.avgLatencyMs * skill.totalExecutions;
    skill.totalExecutions++;
    skill.avgLatencyMs = Math.round((prevTotal + latencyMs) / skill.totalExecutions);
    const prev = this.revenueByAuthor.get(skill.authorAgentId) ?? 0;
    this.revenueByAuthor.set(skill.authorAgentId, prev + paymentAmount);
  }

  submitRating(skillId: string, score: number): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || score < 1 || score > 5) return false;
    const totalScore = skill.rating * skill.ratingCount + score;
    skill.ratingCount++;
    skill.rating = parseFloat((totalScore / skill.ratingCount).toFixed(2));
    return true;
  }

  deprecateSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    skill.deprecated = true;
    return true;
  }

  getAuthorRevenue(authorAgentId: string): number {
    return this.revenueByAuthor.get(authorAgentId) ?? 0;
  }

  getTopSkills(count: number = 10): MarketplaceSkill[] {
    return this.search({ sortBy: 'executions', limit: count });
  }
}