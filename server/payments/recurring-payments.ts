interface RecurringPayment {
  id: string;
  payerAgent: string;
  payeeAgent: string;
  amount: string;
  token: string;
  chain: string;
  intervalMs: number;
  nextExecution: number;
  executionCount: number;
  maxExecutions: number | null;
  active: boolean;
}

export class RecurringPaymentScheduler {
  private schedules: Map<string, RecurringPayment> = new Map();

  create(payer: string, payee: string, amount: string, token: string, chain: string, intervalMs: number, maxExecutions?: number): string {
    const id = crypto.randomUUID();
    this.schedules.set(id, { id, payerAgent: payer, payeeAgent: payee, amount, token, chain, intervalMs, nextExecution: Date.now() + intervalMs, executionCount: 0, maxExecutions: maxExecutions ?? null, active: true });
    return id;
  }

  getDue(): RecurringPayment[] {
    const now = Date.now();
    return Array.from(this.schedules.values()).filter(s => s.active && now >= s.nextExecution);
  }

  markExecuted(id: string): boolean {
    const s = this.schedules.get(id);
    if (!s || !s.active) return false;
    s.executionCount++;
    s.nextExecution = Date.now() + s.intervalMs;
    if (s.maxExecutions && s.executionCount >= s.maxExecutions) s.active = false;
    return true;
  }

  cancel(id: string): boolean {
    const s = this.schedules.get(id);
    if (!s) return false;
    s.active = false; return true;
  }

  getByAgent(agentId: string): RecurringPayment[] {
    return Array.from(this.schedules.values()).filter(s => s.payerAgent === agentId || s.payeeAgent === agentId);
  }
}