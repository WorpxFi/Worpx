interface PerformanceMetric {
  agentId: string;
  metricName: string;
  value: number;
  timestamp: number;
}

interface AgentTrend {
  agentId: string;
  metricName: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  dataPoints: number;
  trend: 'improving' | 'stable' | 'declining';
}

export class AgentAnalyticsCollector {
  private metrics: PerformanceMetric[] = [];

  record(agentId: string, metricName: string, value: number): void {
    this.metrics.push({ agentId, metricName, value, timestamp: Date.now() });
    if (this.metrics.length > 50000) this.metrics.splice(0, 10000);
  }

  getTrend(agentId: string, metricName: string, windowMs: number = 3600000): AgentTrend | null {
    const cutoff = Date.now() - windowMs;
    const points = this.metrics.filter(m => m.agentId === agentId && m.metricName === metricName && m.timestamp >= cutoff);
    if (points.length < 2) return null;
    const values = points.map(p => p.value);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg * 1.05 ? 'improving' : secondAvg < firstAvg * 0.95 ? 'declining' : 'stable';
    return { agentId, metricName, avgValue: parseFloat(avg.toFixed(4)), minValue: Math.min(...values), maxValue: Math.max(...values), dataPoints: points.length, trend };
  }

  getAgentSummary(agentId: string): Record<string, number> {
    const latest: Record<string, number> = {};
    for (const m of this.metrics) { if (m.agentId === agentId) latest[m.metricName] = m.value; }
    return latest;
  }

  getTopPerformers(metricName: string, limit: number = 10): { agentId: string; value: number }[] {
    const best: Map<string, number> = new Map();
    for (const m of this.metrics) { if (m.metricName === metricName) best.set(m.agentId, Math.max(best.get(m.agentId) ?? 0, m.value)); }
    return Array.from(best.entries()).map(([agentId, value]) => ({ agentId, value })).sort((a, b) => b.value - a.value).slice(0, limit);
  }
}