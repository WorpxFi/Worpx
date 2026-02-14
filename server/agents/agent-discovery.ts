interface DiscoverableAgent {
  agentId: string;
  name: string;
  skills: string[];
  chains: string[];
  reputation: number;
  online: boolean;
  lastSeen: number;
}

interface DiscoveryQuery {
  skill?: string;
  chain?: string;
  minReputation?: number;
  onlineOnly?: boolean;
}

export class AgentDiscoveryService {
  private agents: Map<string, DiscoverableAgent> = new Map();

  register(agentId: string, name: string, skills: string[], chains: string[]): void {
    this.agents.set(agentId, { agentId, name, skills, chains, reputation: 50, online: true, lastSeen: Date.now() });
  }

  updatePresence(agentId: string, online: boolean): void {
    const a = this.agents.get(agentId);
    if (a) { a.online = online; a.lastSeen = Date.now(); }
  }

  updateReputation(agentId: string, score: number): void {
    const a = this.agents.get(agentId);
    if (a) a.reputation = Math.max(0, Math.min(100, score));
  }

  search(query: DiscoveryQuery): DiscoverableAgent[] {
    let results = Array.from(this.agents.values());
    if (query.skill) results = results.filter(a => a.skills.includes(query.skill!));
    if (query.chain) results = results.filter(a => a.chains.includes(query.chain!));
    if (query.minReputation) results = results.filter(a => a.reputation >= query.minReputation!);
    if (query.onlineOnly) results = results.filter(a => a.online);
    return results.sort((a, b) => b.reputation - a.reputation);
  }

  getOnlineCount(): number { return Array.from(this.agents.values()).filter(a => a.online).length; }
  getAll(): DiscoverableAgent[] { return Array.from(this.agents.values()); }
}