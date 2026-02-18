interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latencyMs: number;
  uptime: number;
  lastChecked: number;
}

interface SystemOverview {
  services: ServiceHealth[];
  overallStatus: 'operational' | 'degraded' | 'outage';
  activeAgents: number;
  openChannels: number;
  pendingTransactions: number;
  uptimePercent: number;
  generatedAt: number;
}

export class AppHealthDashboard {
  private services: Map<string, ServiceHealth> = new Map();
  private counters = { activeAgents: 0, openChannels: 0, pendingTransactions: 0 };

  registerService(name: string): void {
    this.services.set(name, { name, status: 'operational', latencyMs: 0, uptime: 100, lastChecked: Date.now() });
  }

  updateService(name: string, status: ServiceHealth['status'], latencyMs: number): void {
    const s = this.services.get(name);
    if (!s) return;
    s.status = status; s.latencyMs = latencyMs; s.lastChecked = Date.now();
    s.uptime = status === 'operational' ? Math.min(100, s.uptime + 0.1) : Math.max(0, s.uptime - 1);
  }

  setCounters(agents: number, channels: number, pending: number): void {
    this.counters = { activeAgents: agents, openChannels: channels, pendingTransactions: pending };
  }

  getOverview(): SystemOverview {
    const all = Array.from(this.services.values());
    const hasOutage = all.some(s => s.status === 'outage');
    const hasDegraded = all.some(s => s.status === 'degraded');
    const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';
    const uptimePercent = all.length > 0 ? parseFloat((all.reduce((s, x) => s + x.uptime, 0) / all.length).toFixed(2)) : 100;
    return { services: all, overallStatus, ...this.counters, uptimePercent, generatedAt: Date.now() };
  }

  getUnhealthy(): ServiceHealth[] { return Array.from(this.services.values()).filter(s => s.status !== 'operational'); }
}