interface SplitRule {
  agentId: string;
  sharePercent: number;
}

interface SplitResult {
  id: string;
  totalAmount: string;
  token: string;
  allocations: { agentId: string; amount: string }[];
  executedAt: number;
}

export class PaymentSplitter {
  private rules: Map<string, SplitRule[]> = new Map();
  private history: SplitResult[] = [];

  setRules(groupId: string, rules: SplitRule[]): void {
    const total = rules.reduce((s, r) => s + r.sharePercent, 0);
    if (Math.abs(total - 100) > 0.01) throw new Error('Shares must sum to 100%');
    this.rules.set(groupId, rules);
  }

  split(groupId: string, totalAmount: string, token: string): SplitResult {
    const rules = this.rules.get(groupId);
    if (!rules) throw new Error('No split rules for group');
    const total = parseFloat(totalAmount);
    const allocations = rules.map(r => ({
      agentId: r.agentId,
      amount: (total * r.sharePercent / 100).toFixed(6),
    }));
    const result: SplitResult = { id: crypto.randomUUID(), totalAmount, token, allocations, executedAt: Date.now() };
    this.history.push(result);
    return result;
  }

  getHistory(groupId: string): SplitResult[] { return this.history; }
  getRules(groupId: string): SplitRule[] { return this.rules.get(groupId) ?? []; }
}