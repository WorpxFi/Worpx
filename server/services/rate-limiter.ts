interface TokenBucket {
  agentId: string;
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
  tier: RateTier;
}

type RateTier = 'free' | 'standard' | 'premium' | 'enterprise';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
  tier: RateTier;
}

const TIER_LIMITS: Record<RateTier, { maxTokens: number; refillRate: number }> = {
  free: { maxTokens: 100, refillRate: 10 },
  standard: { maxTokens: 500, refillRate: 50 },
  premium: { maxTokens: 2000, refillRate: 200 },
  enterprise: { maxTokens: 10000, refillRate: 1000 },
};

export class AgentRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private violations: Map<string, number> = new Map();

  private getOrCreate(agentId: string, tier: RateTier = 'free'): TokenBucket {
    let bucket = this.buckets.get(agentId);
    if (!bucket) {
      const config = TIER_LIMITS[tier];
      bucket = {
        agentId, tokens: config.maxTokens, maxTokens: config.maxTokens,
        refillRate: config.refillRate, lastRefill: Date.now(), tier,
      };
      this.buckets.set(agentId, bucket);
    }
    return bucket;
  }

  private refill(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const newTokens = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }

  consume(agentId: string, cost: number = 1, tier: RateTier = 'free'): RateLimitResult {
    const bucket = this.getOrCreate(agentId, tier);
    this.refill(bucket);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: null, tier: bucket.tier };
    }

    const deficit = cost - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / bucket.refillRate) * 1000);
    const count = (this.violations.get(agentId) ?? 0) + 1;
    this.violations.set(agentId, count);

    return { allowed: false, remaining: 0, retryAfterMs, tier: bucket.tier };
  }

  upgradeTier(agentId: string, newTier: RateTier): void {
    const bucket = this.getOrCreate(agentId, newTier);
    const config = TIER_LIMITS[newTier];
    bucket.tier = newTier;
    bucket.maxTokens = config.maxTokens;
    bucket.refillRate = config.refillRate;
    bucket.tokens = Math.min(bucket.tokens, bucket.maxTokens);
  }

  getViolationCount(agentId: string): number {
    return this.violations.get(agentId) ?? 0;
  }

  getUsage(agentId: string): { remaining: number; max: number; tier: RateTier } | null {
    const bucket = this.buckets.get(agentId);
    if (!bucket) return null;
    this.refill(bucket);
    return { remaining: Math.floor(bucket.tokens), max: bucket.maxTokens, tier: bucket.tier };
  }

  resetViolations(agentId: string): void {
    this.violations.delete(agentId);
  }
}