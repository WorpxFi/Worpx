interface RateWindow {
  endpoint: string;
  clientId: string;
  timestamps: number[];
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number | null;
}

export class ApiRateLimiter {
  private windows: Map<string, RateWindow> = new Map();
  private defaults: Map<string, { windowMs: number; maxRequests: number }> = new Map();

  configure(endpoint: string, windowMs: number, maxRequests: number): void {
    this.defaults.set(endpoint, { windowMs, maxRequests });
  }

  check(endpoint: string, clientId: string): RateLimitResult {
    const config = this.defaults.get(endpoint) ?? { windowMs: 60000, maxRequests: 100 };
    const key = endpoint + ':' + clientId;
    const now = Date.now();
    const window = this.windows.get(key) ?? { endpoint, clientId, timestamps: [], windowMs: config.windowMs, maxRequests: config.maxRequests };
    window.timestamps = window.timestamps.filter(t => now - t < config.windowMs);
    this.windows.set(key, window);

    const remaining = Math.max(0, config.maxRequests - window.timestamps.length);
    const resetAt = window.timestamps.length > 0 ? window.timestamps[0] + config.windowMs : now + config.windowMs;

    if (window.timestamps.length >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt, retryAfterMs: resetAt - now };
    }

    window.timestamps.push(now);
    return { allowed: true, remaining: remaining - 1, resetAt, retryAfterMs: null };
  }

  reset(endpoint: string, clientId: string): void { this.windows.delete(endpoint + ':' + clientId); }

  getUsage(endpoint: string, clientId: string): { used: number; limit: number } | null {
    const key = endpoint + ':' + clientId;
    const w = this.windows.get(key);
    if (!w) return null;
    const config = this.defaults.get(endpoint) ?? { maxRequests: 100 };
    return { used: w.timestamps.length, limit: config.maxRequests };
  }
}