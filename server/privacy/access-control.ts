interface AccessPolicy {
  id: string;
  resourceType: string;
  requiredAttributes: AttributeCondition[];
  effect: 'allow' | 'deny';
  priority: number;
}

interface AttributeCondition {
  attribute: string;
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'in';
  value: string | number | string[];
}

interface AgentAttributes {
  agentId: string;
  attributes: Record<string, string | number | string[]>;
}

interface AccessDecision {
  allowed: boolean;
  matchedPolicy: string | null;
  reason: string;
  evaluatedAt: number;
}

export class AttributeAccessControl {
  private policies: Map<string, AccessPolicy> = new Map();
  private agentAttrs: Map<string, AgentAttributes> = new Map();
  private decisionLog: AccessDecision[] = [];

  addPolicy(policy: AccessPolicy): void {
    this.policies.set(policy.id, policy);
  }

  setAttributes(agentId: string, attributes: Record<string, string | number | string[]>): void {
    this.agentAttrs.set(agentId, { agentId, attributes });
  }

  evaluate(agentId: string, resourceType: string): AccessDecision {
    const agent = this.agentAttrs.get(agentId);
    if (!agent) return this.decide(false, null, 'Agent not registered');

    const applicable = Array.from(this.policies.values())
      .filter(p => p.resourceType === resourceType)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of applicable) {
      const allMatch = policy.requiredAttributes.every(cond =>
        this.evaluateCondition(agent.attributes[cond.attribute], cond)
      );
      if (allMatch) {
        return this.decide(policy.effect === 'allow', policy.id,
          policy.effect === 'allow' ? 'Policy matched' : 'Denied by policy');
      }
    }
    return this.decide(false, null, 'No matching policy');
  }

  private evaluateCondition(attrValue: unknown, condition: AttributeCondition): boolean {
    if (attrValue === undefined) return false;
    switch (condition.operator) {
      case 'equals': return attrValue === condition.value;
      case 'contains': return typeof attrValue === 'string' && attrValue.includes(String(condition.value));
      case 'gte': return typeof attrValue === 'number' && attrValue >= Number(condition.value);
      case 'lte': return typeof attrValue === 'number' && attrValue <= Number(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(String(attrValue));
      default: return false;
    }
  }

  private decide(allowed: boolean, matchedPolicy: string | null, reason: string): AccessDecision {
    const decision = { allowed, matchedPolicy, reason, evaluatedAt: Date.now() };
    this.decisionLog.push(decision);
    return decision;
  }

  getDecisionLog(limit: number = 100): AccessDecision[] {
    return this.decisionLog.slice(-limit);
  }

  getPoliciesForResource(resourceType: string): AccessPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.resourceType === resourceType);
  }
}