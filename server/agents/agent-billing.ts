interface BillingEntry {
  id: string;
  agentId: string;
  service: string;
  description: string;
  amount: number;
  token: string;
  chain: string;
  timestamp: number;
}

interface BillingSummary {
  agentId: string;
  totalSpent: number;
  totalEarned: number;
  entryCount: number;
  topService: string;
  periodStart: number;
  periodEnd: number;
}

export class AgentBillingAggregator {
  private entries: BillingEntry[] = [];

  recordCharge(agentId: string, service: string, description: string, amount: number, token: string, chain: string): string {
    const id = crypto.randomUUID();
    this.entries.push({ id, agentId, service, description, amount, token, chain, timestamp: Date.now() });
    return id;
  }

  getSummary(agentId: string, periodMs: number = 86400000): BillingSummary {
    const cutoff = Date.now() - periodMs;
    const relevant = this.entries.filter(e => e.agentId === agentId && e.timestamp >= cutoff);
    const spent = relevant.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const earned = relevant.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
    const serviceCounts: Record<string, number> = {};
    for (const e of relevant) serviceCounts[e.service] = (serviceCounts[e.service] ?? 0) + 1;
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
    return { agentId, totalSpent: spent, totalEarned: earned, entryCount: relevant.length, topService, periodStart: cutoff, periodEnd: Date.now() };
  }

  getEntries(agentId: string, limit: number = 50): BillingEntry[] {
    return this.entries.filter(e => e.agentId === agentId).slice(-limit);
  }

  getTotalByService(agentId: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const e of this.entries.filter(x => x.agentId === agentId)) result[e.service] = (result[e.service] ?? 0) + e.amount;
    return result;
  }
}