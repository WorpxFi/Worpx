interface LedgerEntry {
  id: string;
  debitAgent: string;
  creditAgent: string;
  amount: number;
  token: string;
  reference: string;
  timestamp: number;
}

export class BalanceLedger {
  private entries: LedgerEntry[] = [];
  private balances: Map<string, number> = new Map();

  private key(agentId: string, token: string): string { return agentId + ':' + token; }

  credit(agentId: string, token: string, amount: number, reference: string): void {
    const k = this.key(agentId, token);
    this.balances.set(k, (this.balances.get(k) ?? 0) + amount);
    this.entries.push({ id: crypto.randomUUID(), debitAgent: 'system', creditAgent: agentId, amount, token, reference, timestamp: Date.now() });
  }

  debit(agentId: string, token: string, amount: number, reference: string): boolean {
    const k = this.key(agentId, token);
    const bal = this.balances.get(k) ?? 0;
    if (bal < amount) return false;
    this.balances.set(k, bal - amount);
    this.entries.push({ id: crypto.randomUUID(), debitAgent: agentId, creditAgent: 'system', amount, token, reference, timestamp: Date.now() });
    return true;
  }

  transfer(from: string, to: string, token: string, amount: number, reference: string): boolean {
    if (!this.debit(from, token, amount, reference)) return false;
    this.credit(to, token, amount, reference);
    return true;
  }

  getBalance(agentId: string, token: string): number { return this.balances.get(this.key(agentId, token)) ?? 0; }

  getHistory(agentId: string): LedgerEntry[] {
    return this.entries.filter(e => e.debitAgent === agentId || e.creditAgent === agentId);
  }
}