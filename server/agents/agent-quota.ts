interface AgentQuota {
  agentId: string;
  maxSkillExecutionsPerHour: number;
  maxChannelsOpen: number;
  maxStorageBytes: number;
  currentExecutions: number;
  currentChannels: number;
  currentStorage: number;
  hourReset: number;
}

export class AgentQuotaEnforcer {
  private quotas: Map<string, AgentQuota> = new Map();

  setQuota(agentId: string, maxExec: number, maxChannels: number, maxStorage: number): void {
    this.quotas.set(agentId, { agentId, maxSkillExecutionsPerHour: maxExec, maxChannelsOpen: maxChannels, maxStorageBytes: maxStorage, currentExecutions: 0, currentChannels: 0, currentStorage: 0, hourReset: Date.now() + 3600000 });
  }

  checkExecution(agentId: string): { allowed: boolean; remaining: number } {
    const q = this.quotas.get(agentId);
    if (!q) return { allowed: true, remaining: Infinity };
    this.resetIfNeeded(q);
    if (q.currentExecutions >= q.maxSkillExecutionsPerHour) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: q.maxSkillExecutionsPerHour - q.currentExecutions };
  }

  recordExecution(agentId: string): void {
    const q = this.quotas.get(agentId);
    if (q) { this.resetIfNeeded(q); q.currentExecutions++; }
  }

  checkChannel(agentId: string): boolean {
    const q = this.quotas.get(agentId);
    return !q || q.currentChannels < q.maxChannelsOpen;
  }

  openChannel(agentId: string): void { const q = this.quotas.get(agentId); if (q) q.currentChannels++; }
  closeChannel(agentId: string): void { const q = this.quotas.get(agentId); if (q && q.currentChannels > 0) q.currentChannels--; }

  private resetIfNeeded(q: AgentQuota): void {
    if (Date.now() >= q.hourReset) { q.currentExecutions = 0; q.hourReset = Date.now() + 3600000; }
  }

  getUsage(agentId: string): AgentQuota | null { return this.quotas.get(agentId) ?? null; }
}