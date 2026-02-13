interface HealthCheck {
  platformId: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs: number;
  checkedAt: number;
}

interface PlatformUptime {
  platformId: string;
  checks: number;
  upCount: number;
  avgLatency: number;
  lastStatus: string;
}

export class PlatformHealthChecker {
  private history: Map<string, HealthCheck[]> = new Map();

  record(platformId: string, status: HealthCheck['status'], latencyMs: number): void {
    const checks = this.history.get(platformId) ?? [];
    checks.push({ platformId, status, latencyMs, checkedAt: Date.now() });
    if (checks.length > 500) checks.splice(0, checks.length - 250);
    this.history.set(platformId, checks);
  }

  getUptime(platformId: string): PlatformUptime | null {
    const checks = this.history.get(platformId);
    if (!checks || checks.length === 0) return null;
    const upCount = checks.filter(c => c.status === 'up').length;
    const avgLatency = checks.reduce((s, c) => s + c.latencyMs, 0) / checks.length;
    return { platformId, checks: checks.length, upCount, avgLatency: Math.round(avgLatency), lastStatus: checks[checks.length - 1].status };
  }

  getUnhealthy(): string[] {
    const result: string[] = [];
    for (const [id, checks] of this.history) {
      if (checks.length > 0 && checks[checks.length - 1].status !== 'up') result.push(id);
    }
    return result;
  }

  getAll(): PlatformUptime[] {
    return Array.from(this.history.keys()).map(id => this.getUptime(id)!).filter(Boolean);
  }
}