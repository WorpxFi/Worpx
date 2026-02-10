interface ReputationEvent {
  agentId: string;
  eventType: 'transaction_success' | 'transaction_fail' | 'dispute_initiated' | 'dispute_resolved' | 'skill_delivery' | 'channel_timeout';
  counterpartyId: string;
  amount: number;
  timestamp: number;
}

interface ReputationScore {
  agentId: string;
  overallScore: number;
  reliabilityScore: number;
  volumeScore: number;
  disputeRate: number;
  totalTransactions: number;
  successRate: number;
  lastUpdated: number;
}

const EVENT_WEIGHTS: Record<ReputationEvent['eventType'], number> = {
  transaction_success: 1.0,
  transaction_fail: -2.0,
  dispute_initiated: -1.5,
  dispute_resolved: 0.5,
  skill_delivery: 1.2,
  channel_timeout: -3.0,
};

const DECAY_HALF_LIFE = 30 * 24 * 60 * 60 * 1000;

export class AgentReputationSystem {
  private events: ReputationEvent[] = [];
  private cache: Map<string, ReputationScore> = new Map();

  recordEvent(event: ReputationEvent): void {
    this.events.push(event);
    this.cache.delete(event.agentId);
    this.cache.delete(event.counterpartyId);
  }

  computeScore(agentId: string): ReputationScore {
    const cached = this.cache.get(agentId);
    if (cached && Date.now() - cached.lastUpdated < 60000) return cached;

    const agentEvents = this.events.filter(e => e.agentId === agentId);
    const now = Date.now();
    let weightedSum = 0;
    let weightTotal = 0;
    let successes = 0;
    let failures = 0;
    let disputes = 0;
    let totalVolume = 0;

    for (const event of agentEvents) {
      const age = now - event.timestamp;
      const decay = Math.pow(0.5, age / DECAY_HALF_LIFE);
      const eventWeight = EVENT_WEIGHTS[event.eventType] * decay;
      weightedSum += eventWeight;
      weightTotal += Math.abs(decay);
      totalVolume += event.amount;

      if (event.eventType === 'transaction_success' || event.eventType === 'skill_delivery') successes++;
      if (event.eventType === 'transaction_fail' || event.eventType === 'channel_timeout') failures++;
      if (event.eventType === 'dispute_initiated') disputes++;
    }

    const total = successes + failures;
    const reliabilityScore = total > 0 ? successes / total : 0;
    const volumeScore = Math.min(1, Math.log10(totalVolume + 1) / 6);
    const overallScore = weightTotal > 0
      ? Math.max(0, Math.min(100, 50 + (weightedSum / weightTotal) * 50))
      : 50;

    const score: ReputationScore = {
      agentId,
      overallScore: parseFloat(overallScore.toFixed(2)),
      reliabilityScore: parseFloat(reliabilityScore.toFixed(4)),
      volumeScore: parseFloat(volumeScore.toFixed(4)),
      disputeRate: total > 0 ? parseFloat((disputes / total).toFixed(4)) : 0,
      totalTransactions: total,
      successRate: parseFloat(reliabilityScore.toFixed(4)),
      lastUpdated: now,
    };
    this.cache.set(agentId, score);
    return score;
  }

  getLeaderboard(count: number = 20): ReputationScore[] {
    const agentIds = new Set(this.events.map(e => e.agentId));
    return Array.from(agentIds)
      .map(id => this.computeScore(id))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, count);
  }

  isEligibleForHighValue(agentId: string, threshold: number = 70): boolean {
    return this.computeScore(agentId).overallScore >= threshold;
  }
}