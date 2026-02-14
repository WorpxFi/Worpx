interface ReputationProfile {
  agentId: string;
  totalScore: number;
  completedTasks: number;
  failedTasks: number;
  disputesLost: number;
  avgResponseTimeMs: number;
  lastUpdated: number;
}

interface ReputationEvent {
  agentId: string;
  eventType: 'task_complete' | 'task_fail' | 'dispute_won' | 'dispute_lost' | 'feedback';
  weight: number;
  timestamp: number;
}

export class AgentReputationSystem {
  private profiles: Map<string, ReputationProfile> = new Map();
  private events: ReputationEvent[] = [];
  private weights = { task_complete: 5, task_fail: -8, dispute_won: 3, dispute_lost: -15, feedback: 2 };

  ensureProfile(agentId: string): ReputationProfile {
    if (!this.profiles.has(agentId)) {
      this.profiles.set(agentId, { agentId, totalScore: 50, completedTasks: 0, failedTasks: 0, disputesLost: 0, avgResponseTimeMs: 0, lastUpdated: Date.now() });
    }
    return this.profiles.get(agentId)!;
  }

  recordEvent(agentId: string, eventType: ReputationEvent['eventType']): void {
    const profile = this.ensureProfile(agentId);
    const weight = this.weights[eventType];
    profile.totalScore = Math.max(0, Math.min(100, profile.totalScore + weight));
    if (eventType === 'task_complete') profile.completedTasks++;
    if (eventType === 'task_fail') profile.failedTasks++;
    if (eventType === 'dispute_lost') profile.disputesLost++;
    profile.lastUpdated = Date.now();
    this.events.push({ agentId, eventType, weight, timestamp: Date.now() });
  }

  getScore(agentId: string): number { return this.ensureProfile(agentId).totalScore; }
  getTopAgents(limit: number = 10): ReputationProfile[] {
    return Array.from(this.profiles.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
  }
  getProfile(agentId: string): ReputationProfile { return this.ensureProfile(agentId); }
}