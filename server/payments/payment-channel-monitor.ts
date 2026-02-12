interface ChannelHealth {
  channelId: string;
  balanceRatio: number;
  txRate: number;
  lastActivity: number;
  alertLevel: 'healthy' | 'warning' | 'critical';
}

interface MonitorAlert {
  channelId: string;
  alertType: string;
  message: string;
  timestamp: number;
}

export class PaymentChannelMonitor {
  private channels: Map<string, ChannelHealth> = new Map();
  private alerts: MonitorAlert[] = [];
  private warningThreshold: number;
  private criticalThreshold: number;

  constructor(warningThreshold: number = 0.2, criticalThreshold: number = 0.05) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  update(channelId: string, balanceRatio: number, txRate: number): void {
    const alertLevel = balanceRatio <= this.criticalThreshold ? 'critical' : balanceRatio <= this.warningThreshold ? 'warning' : 'healthy';
    this.channels.set(channelId, { channelId, balanceRatio, txRate, lastActivity: Date.now(), alertLevel });
    if (alertLevel !== 'healthy') {
      this.alerts.push({ channelId, alertType: alertLevel, message: 'Balance ratio ' + (balanceRatio * 100).toFixed(1) + '%', timestamp: Date.now() });
    }
  }

  getHealth(channelId: string): ChannelHealth | null { return this.channels.get(channelId) ?? null; }

  getCritical(): ChannelHealth[] {
    return Array.from(this.channels.values()).filter(c => c.alertLevel === 'critical');
  }

  getStale(maxIdleMs: number = 3600000): ChannelHealth[] {
    const cutoff = Date.now() - maxIdleMs;
    return Array.from(this.channels.values()).filter(c => c.lastActivity < cutoff);
  }

  getAlerts(limit: number = 50): MonitorAlert[] { return this.alerts.slice(-limit); }
}