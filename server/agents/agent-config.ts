interface AgentDefaults {
  heartbeatInterval: number;
  sessionTtl: number;
  maxChannels: number;
  maxSkillsPerAgent: number;
  defaultChain: string;
}

export class AgentConfigProvider {
  private defaults: AgentDefaults = {
    heartbeatInterval: 30000,
    sessionTtl: 3600000,
    maxChannels: 50,
    maxSkillsPerAgent: 25,
    defaultChain: 'base',
  };

  get<K extends keyof AgentDefaults>(key: K): AgentDefaults[K] { return this.defaults[key]; }
  set<K extends keyof AgentDefaults>(key: K, value: AgentDefaults[K]): void { this.defaults[key] = value; }
  getAll(): AgentDefaults { return { ...this.defaults }; }
}