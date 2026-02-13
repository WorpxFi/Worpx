interface QuotaConfig {
  platformId: string;
  maxCallsPerMinute: number;
  maxCallsPerDay: number;
  currentMinute: number;
  currentDay: number;
  minuteReset: number;
  dayReset: number;
}

export class PlatformRateQuota {
  private quotas: Map<string, QuotaConfig> = new Map();

  setQuota(platformId: string, perMinute: number, perDay: number): void {
    this.quotas.set(platformId, { platformId, maxCallsPerMinute: perMinute, maxCallsPerDay: perDay, currentMinute: 0, currentDay: 0, minuteReset: Date.now() + 60000, dayReset: Date.now() + 86400000 });
  }

  consume(platformId: string): { allowed: boolean; retryAfterMs?: number } {
    const q = this.quotas.get(platformId);
    if (!q) return { allowed: true };
    this.resetIfNeeded(q);
    if (q.currentMinute >= q.maxCallsPerMinute) return { allowed: false, retryAfterMs: q.minuteReset - Date.now() };
    if (q.currentDay >= q.maxCallsPerDay) return { allowed: false, retryAfterMs: q.dayReset - Date.now() };
    q.currentMinute++; q.currentDay++;
    return { allowed: true };
  }

  private resetIfNeeded(q: QuotaConfig): void {
    const now = Date.now();
    if (now >= q.minuteReset) { q.currentMinute = 0; q.minuteReset = now + 60000; }
    if (now >= q.dayReset) { q.currentDay = 0; q.dayReset = now + 86400000; }
  }

  getRemaining(platformId: string): { minute: number; day: number } | null {
    const q = this.quotas.get(platformId);
    if (!q) return null;
    this.resetIfNeeded(q);
    return { minute: q.maxCallsPerMinute - q.currentMinute, day: q.maxCallsPerDay - q.currentDay };
  }
}