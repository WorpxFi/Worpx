interface SpendingLimit {
  agentId: string;
  token: string;
  dailyLimit: number;
  txLimit: number;
  spent24h: number;
  lastReset: number;
}

interface LimitCheckResult { allowed: boolean; remaining: number; reason?: string; }

export class SpendingLimiter {
  private limits: Map<string, SpendingLimit> = new Map();

  private key(agentId: string, token: string): string { return agentId + ':' + token; }

  setLimit(agentId: string, token: string, dailyLimit: number, txLimit: number): void {
    this.limits.set(this.key(agentId, token), { agentId, token, dailyLimit, txLimit, spent24h: 0, lastReset: Date.now() });
  }

  check(agentId: string, token: string, amount: number): LimitCheckResult {
    const limit = this.limits.get(this.key(agentId, token));
    if (!limit) return { allowed: true, remaining: Infinity };
    this.resetIfNeeded(limit);
    if (amount > limit.txLimit) return { allowed: false, remaining: 0, reason: 'Exceeds per-tx limit' };
    if (limit.spent24h + amount > limit.dailyLimit) return { allowed: false, remaining: limit.dailyLimit - limit.spent24h, reason: 'Exceeds daily limit' };
    return { allowed: true, remaining: limit.dailyLimit - limit.spent24h - amount };
  }

  record(agentId: string, token: string, amount: number): void {
    const limit = this.limits.get(this.key(agentId, token));
    if (limit) { this.resetIfNeeded(limit); limit.spent24h += amount; }
  }

  private resetIfNeeded(limit: SpendingLimit): void {
    if (Date.now() - limit.lastReset >= 86400000) { limit.spent24h = 0; limit.lastReset = Date.now(); }
  }

  getUsage(agentId: string, token: string): { spent: number; limit: number } | null {
    const l = this.limits.get(this.key(agentId, token));
    return l ? { spent: l.spent24h, limit: l.dailyLimit } : null;
  }
}