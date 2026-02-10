interface RegisteredAgent {
  id: string;
  name: string;
  ownerAddress: string;
  publicKey: string;
  chain: string;
  capabilities: string[];
  endpoint: string | null;
  registeredAt: number;
  lastHeartbeat: number;
  active: boolean;
  metadata: Record<string, string>;
}

interface RegistryQuery {
  chain?: string;
  capability?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private chainIndex: Map<string, Set<string>> = new Map();

  register(agent: Omit<RegisteredAgent, 'registeredAt' | 'lastHeartbeat' | 'active'>): string {
    const entry: RegisteredAgent = {
      ...agent, registeredAt: Date.now(), lastHeartbeat: Date.now(), active: true,
    };
    this.agents.set(agent.id, entry);

    for (const cap of agent.capabilities) {
      if (!this.capabilityIndex.has(cap)) this.capabilityIndex.set(cap, new Set());
      this.capabilityIndex.get(cap)!.add(agent.id);
    }

    if (!this.chainIndex.has(agent.chain)) this.chainIndex.set(agent.chain, new Set());
    this.chainIndex.get(agent.chain)!.add(agent.id);

    return agent.id;
  }

  heartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.lastHeartbeat = Date.now();
    agent.active = true;
    return true;
  }

  deactivateStale(thresholdMs: number = 300000): string[] {
    const now = Date.now();
    const deactivated: string[] = [];
    for (const agent of this.agents.values()) {
      if (agent.active && now - agent.lastHeartbeat > thresholdMs) {
        agent.active = false;
        deactivated.push(agent.id);
      }
    }
    return deactivated;
  }

  query(q: RegistryQuery): RegisteredAgent[] {
    let results = Array.from(this.agents.values());

    if (q.activeOnly !== false) results = results.filter(a => a.active);
    if (q.chain) {
      const chainSet = this.chainIndex.get(q.chain);
      if (!chainSet) return [];
      results = results.filter(a => chainSet.has(a.id));
    }
    if (q.capability) {
      const capSet = this.capabilityIndex.get(q.capability);
      if (!capSet) return [];
      results = results.filter(a => capSet.has(a.id));
    }

    const offset = q.offset ?? 0;
    const limit = q.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  findByCapability(capability: string): RegisteredAgent[] {
    const ids = this.capabilityIndex.get(capability);
    if (!ids) return [];
    return Array.from(ids).map(id => this.agents.get(id)!).filter(a => a.active);
  }

  updateCapabilities(agentId: string, capabilities: string[]): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    for (const cap of agent.capabilities) {
      this.capabilityIndex.get(cap)?.delete(agentId);
    }
    agent.capabilities = capabilities;
    for (const cap of capabilities) {
      if (!this.capabilityIndex.has(cap)) this.capabilityIndex.set(cap, new Set());
      this.capabilityIndex.get(cap)!.add(agentId);
    }
    return true;
  }

  getStats(): { total: number; active: number; byChain: Record<string, number> } {
    let active = 0;
    const byChain: Record<string, number> = {};
    for (const agent of this.agents.values()) {
      if (agent.active) active++;
      byChain[agent.chain] = (byChain[agent.chain] ?? 0) + 1;
    }
    return { total: this.agents.size, active, byChain };
  }
}