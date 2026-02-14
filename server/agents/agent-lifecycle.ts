type AgentState = 'initializing' | 'active' | 'suspended' | 'deactivated' | 'migrating';

interface AgentLifecycleEntry {
  agentId: string;
  currentState: AgentState;
  previousState: AgentState | null;
  stateHistory: { state: AgentState; timestamp: number; reason: string }[];
  createdAt: number;
  lastTransition: number;
}

export class AgentLifecycleManager {
  private agents: Map<string, AgentLifecycleEntry> = new Map();

  initialize(agentId: string): void {
    this.agents.set(agentId, { agentId, currentState: 'initializing', previousState: null, stateHistory: [{ state: 'initializing', timestamp: Date.now(), reason: 'Agent registered' }], createdAt: Date.now(), lastTransition: Date.now() });
  }

  transition(agentId: string, newState: AgentState, reason: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    const allowed = this.getAllowedTransitions(agent.currentState);
    if (!allowed.includes(newState)) return false;
    agent.previousState = agent.currentState;
    agent.currentState = newState;
    agent.stateHistory.push({ state: newState, timestamp: Date.now(), reason });
    agent.lastTransition = Date.now();
    return true;
  }

  private getAllowedTransitions(current: AgentState): AgentState[] {
    const map: Record<AgentState, AgentState[]> = {
      initializing: ['active', 'deactivated'],
      active: ['suspended', 'migrating', 'deactivated'],
      suspended: ['active', 'deactivated'],
      migrating: ['active', 'suspended'],
      deactivated: ['initializing'],
    };
    return map[current] ?? [];
  }

  getState(agentId: string): AgentState | null { return this.agents.get(agentId)?.currentState ?? null; }
  getHistory(agentId: string): AgentLifecycleEntry['stateHistory'] { return this.agents.get(agentId)?.stateHistory ?? []; }
  getActive(): string[] { return Array.from(this.agents.values()).filter(a => a.currentState === 'active').map(a => a.agentId); }
}