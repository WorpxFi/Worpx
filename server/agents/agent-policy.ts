interface PolicyRule {
  id: string;
  agentId: string;
  resource: string;
  action: 'read' | 'write' | 'execute' | 'delegate';
  effect: 'allow' | 'deny';
  conditions: Record<string, string>;
  priority: number;
}

export class AgentPolicyEngine {
  private rules: Map<string, PolicyRule[]> = new Map();

  addRule(agentId: string, resource: string, action: PolicyRule['action'], effect: PolicyRule['effect'], conditions: Record<string, string> = {}, priority: number = 0): string {
    const id = crypto.randomUUID();
    const rule: PolicyRule = { id, agentId, resource, action, effect, conditions, priority };
    const existing = this.rules.get(agentId) ?? [];
    existing.push(rule);
    existing.sort((a, b) => b.priority - a.priority);
    this.rules.set(agentId, existing);
    return id;
  }

  evaluate(agentId: string, resource: string, action: PolicyRule['action'], context: Record<string, string> = {}): boolean {
    const rules = this.rules.get(agentId) ?? [];
    for (const rule of rules) {
      if (rule.resource !== resource && rule.resource !== '*') continue;
      if (rule.action !== action && rule.action !== 'execute') continue;
      if (!this.matchConditions(rule.conditions, context)) continue;
      return rule.effect === 'allow';
    }
    return false;
  }

  private matchConditions(required: Record<string, string>, provided: Record<string, string>): boolean {
    for (const [key, value] of Object.entries(required)) {
      if (provided[key] !== value) return false;
    }
    return true;
  }

  removeRule(agentId: string, ruleId: string): boolean {
    const rules = this.rules.get(agentId);
    if (!rules) return false;
    const idx = rules.findIndex(r => r.id === ruleId);
    if (idx < 0) return false;
    rules.splice(idx, 1); return true;
  }

  getRules(agentId: string): PolicyRule[] { return this.rules.get(agentId) ?? []; }
}