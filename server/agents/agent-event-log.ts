interface AgentEvent {
  id: string;
  agentId: string;
  eventType: string;
  category: 'lifecycle' | 'transaction' | 'skill' | 'security' | 'integration';
  data: Record<string, unknown>;
  timestamp: number;
  sequenceNumber: number;
}

export class AgentEventLog {
  private events: AgentEvent[] = [];
  private sequenceCounters: Map<string, number> = new Map();

  append(agentId: string, eventType: string, category: AgentEvent['category'], data: Record<string, unknown>): string {
    const seq = (this.sequenceCounters.get(agentId) ?? 0) + 1;
    this.sequenceCounters.set(agentId, seq);
    const id = crypto.randomUUID();
    this.events.push({ id, agentId, eventType, category, data, timestamp: Date.now(), sequenceNumber: seq });
    return id;
  }

  getByAgent(agentId: string, limit: number = 100): AgentEvent[] {
    return this.events.filter(e => e.agentId === agentId).slice(-limit);
  }

  getByCategory(category: AgentEvent['category'], limit: number = 100): AgentEvent[] {
    return this.events.filter(e => e.category === category).slice(-limit);
  }

  getAfter(timestamp: number): AgentEvent[] { return this.events.filter(e => e.timestamp > timestamp); }
  getCount(agentId: string): number { return this.sequenceCounters.get(agentId) ?? 0; }
  getLatest(limit: number = 50): AgentEvent[] { return this.events.slice(-limit); }
}