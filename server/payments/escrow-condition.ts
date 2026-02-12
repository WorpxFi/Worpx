type ConditionType = 'skill_complete' | 'time_elapsed' | 'approval' | 'threshold';

interface EscrowCondition {
  id: string;
  escrowId: string;
  conditionType: ConditionType;
  params: Record<string, string>;
  satisfied: boolean;
  checkedAt: number | null;
}

export class EscrowConditionEvaluator {
  private conditions: Map<string, EscrowCondition[]> = new Map();

  attach(escrowId: string, conditionType: ConditionType, params: Record<string, string>): string {
    const id = crypto.randomUUID();
    const cond: EscrowCondition = { id, escrowId, conditionType, params, satisfied: false, checkedAt: null };
    const existing = this.conditions.get(escrowId) ?? [];
    existing.push(cond);
    this.conditions.set(escrowId, existing);
    return id;
  }

  evaluate(escrowId: string): boolean {
    const conds = this.conditions.get(escrowId);
    if (!conds || conds.length === 0) return false;
    for (const c of conds) {
      c.checkedAt = Date.now();
      c.satisfied = this.check(c);
    }
    return conds.every(c => c.satisfied);
  }

  private check(c: EscrowCondition): boolean {
    switch (c.conditionType) {
      case 'skill_complete': return c.params.executionId !== undefined;
      case 'time_elapsed': return Date.now() >= parseInt(c.params.unlockAt ?? '0');
      case 'approval': return c.params.approved === 'true';
      case 'threshold': return parseFloat(c.params.current ?? '0') >= parseFloat(c.params.target ?? 'Infinity');
    }
  }

  getConditions(escrowId: string): EscrowCondition[] { return this.conditions.get(escrowId) ?? []; }
  allSatisfied(escrowId: string): boolean { return (this.conditions.get(escrowId) ?? []).every(c => c.satisfied); }
}