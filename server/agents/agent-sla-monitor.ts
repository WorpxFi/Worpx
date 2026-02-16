interface ServiceAgreement {
  id: string;
  providerAgent: string;
  consumerAgent: string;
  skillId: string;
  maxLatencyMs: number;
  minAvailabilityPercent: number;
  maxErrorRate: number;
  penaltyAmount: number;
  penaltyToken: string;
  activeSince: number;
}

interface SLAMetrics {
  agreementId: string;
  totalCalls: number;
  successfulCalls: number;
  avgLatencyMs: number;
  availabilityPercent: number;
  errorRate: number;
  violations: number;
  lastChecked: number;
}

export class AgentSLAMonitor {
  private agreements: Map<string, ServiceAgreement> = new Map();
  private metrics: Map<string, SLAMetrics> = new Map();

  createAgreement(provider: string, consumer: string, skillId: string, maxLatencyMs: number, minAvailability: number, maxErrorRate: number, penaltyAmount: number, penaltyToken: string): string {
    const id = crypto.randomUUID();
    this.agreements.set(id, { id, providerAgent: provider, consumerAgent: consumer, skillId, maxLatencyMs, minAvailabilityPercent: minAvailability, maxErrorRate, penaltyAmount, penaltyToken, activeSince: Date.now() });
    this.metrics.set(id, { agreementId: id, totalCalls: 0, successfulCalls: 0, avgLatencyMs: 0, availabilityPercent: 100, errorRate: 0, violations: 0, lastChecked: Date.now() });
    return id;
  }

  recordCall(agreementId: string, latencyMs: number, success: boolean): void {
    const m = this.metrics.get(agreementId);
    const a = this.agreements.get(agreementId);
    if (!m || !a) return;
    m.totalCalls++;
    if (success) m.successfulCalls++;
    m.avgLatencyMs = Math.round((m.avgLatencyMs * (m.totalCalls - 1) + latencyMs) / m.totalCalls);
    m.errorRate = parseFloat(((1 - m.successfulCalls / m.totalCalls) * 100).toFixed(2));
    m.availabilityPercent = parseFloat(((m.successfulCalls / m.totalCalls) * 100).toFixed(2));
    m.lastChecked = Date.now();
    if (latencyMs > a.maxLatencyMs || m.errorRate > a.maxErrorRate || m.availabilityPercent < a.minAvailabilityPercent) {
      m.violations++;
    }
  }

  getMetrics(agreementId: string): SLAMetrics | null { return this.metrics.get(agreementId) ?? null; }

  getViolations(): { agreement: ServiceAgreement; metrics: SLAMetrics }[] {
    const results: { agreement: ServiceAgreement; metrics: SLAMetrics }[] = [];
    for (const [id, m] of this.metrics) {
      if (m.violations > 0) {
        const a = this.agreements.get(id);
        if (a) results.push({ agreement: a, metrics: m });
      }
    }
    return results;
  }

  getByProvider(agentId: string): ServiceAgreement[] {
    return Array.from(this.agreements.values()).filter(a => a.providerAgent === agentId);
  }

  getByConsumer(agentId: string): ServiceAgreement[] {
    return Array.from(this.agreements.values()).filter(a => a.consumerAgent === agentId);
  }
}