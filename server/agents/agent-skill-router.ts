interface RouteDecision {
  requestId: string;
  skillName: string;
  selectedAgent: string;
  score: number;
  reason: string;
  decidedAt: number;
}

interface RoutingCriteria {
  skillName: string;
  maxPrice: number;
  minReputation: number;
  preferredChain?: string;
}

export class AgentSkillRouter {
  private decisions: RouteDecision[] = [];
  private agentScores: Map<string, number> = new Map();
  private agentPrices: Map<string, number> = new Map();

  registerAgent(agentId: string, skillName: string, price: number, reputationScore: number): void {
    this.agentScores.set(agentId + ':' + skillName, reputationScore);
    this.agentPrices.set(agentId + ':' + skillName, price);
  }

  route(criteria: RoutingCriteria, candidates: string[]): RouteDecision | null {
    let bestAgent: string | null = null;
    let bestScore = -1;
    for (const agentId of candidates) {
      const key = agentId + ':' + criteria.skillName;
      const rep = this.agentScores.get(key) ?? 0;
      const price = this.agentPrices.get(key) ?? Infinity;
      if (rep < criteria.minReputation || price > criteria.maxPrice) continue;
      const score = rep * 0.7 + (1 - price / criteria.maxPrice) * 30;
      if (score > bestScore) { bestScore = score; bestAgent = agentId; }
    }
    if (!bestAgent) return null;
    const decision: RouteDecision = { requestId: crypto.randomUUID(), skillName: criteria.skillName, selectedAgent: bestAgent, score: bestScore, reason: 'Best price-reputation ratio', decidedAt: Date.now() };
    this.decisions.push(decision);
    return decision;
  }

  getDecisions(limit: number = 50): RouteDecision[] { return this.decisions.slice(-limit); }
}