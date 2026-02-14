interface FailoverConfig {
  primaryAgent: string;
  backupAgents: string[];
  maxRetries: number;
  cooldownMs: number;
}

interface FailoverEvent {
  id: string;
  primaryAgent: string;
  failedTo: string;
  reason: string;
  timestamp: number;
}

export class AgentFailoverHandler {
  private configs: Map<string, FailoverConfig> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private events: FailoverEvent[] = [];

  configure(primaryAgent: string, backupAgents: string[], maxRetries: number = 3, cooldownMs: number = 30000): void {
    this.configs.set(primaryAgent, { primaryAgent, backupAgents, maxRetries, cooldownMs });
  }

  getNextAgent(primaryAgent: string, failedAgents: string[]): string | null {
    const config = this.configs.get(primaryAgent);
    if (!config) return null;
    for (const backup of config.backupAgents) {
      if (failedAgents.includes(backup)) continue;
      const cooldownUntil = this.cooldowns.get(backup) ?? 0;
      if (Date.now() < cooldownUntil) continue;
      return backup;
    }
    return null;
  }

  recordFailure(primaryAgent: string, failedAgent: string, reason: string): void {
    const config = this.configs.get(primaryAgent);
    if (config) this.cooldowns.set(failedAgent, Date.now() + config.cooldownMs);
    this.events.push({ id: crypto.randomUUID(), primaryAgent, failedTo: failedAgent, reason, timestamp: Date.now() });
  }

  clearCooldown(agentId: string): void { this.cooldowns.delete(agentId); }
  getFailoverHistory(primaryAgent: string): FailoverEvent[] { return this.events.filter(e => e.primaryAgent === primaryAgent); }
  getConfig(primaryAgent: string): FailoverConfig | null { return this.configs.get(primaryAgent) ?? null; }
}