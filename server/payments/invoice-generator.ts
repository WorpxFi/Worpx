interface AgentInvoice {
  id: string;
  fromAgent: string;
  toAgent: string;
  amount: string;
  token: string;
  chain: string;
  memo: string;
  status: 'draft' | 'sent' | 'paid' | 'expired';
  createdAt: number;
  dueAt: number;
  paidAt: number | null;
}

export class InvoiceGenerator {
  private invoices: Map<string, AgentInvoice> = new Map();

  create(from: string, to: string, amount: string, token: string, chain: string, memo: string, dueDays: number = 7): string {
    const id = crypto.randomUUID();
    this.invoices.set(id, { id, fromAgent: from, toAgent: to, amount, token, chain, memo, status: 'draft', createdAt: Date.now(), dueAt: Date.now() + dueDays * 86400000, paidAt: null });
    return id;
  }

  send(invoiceId: string): boolean {
    const inv = this.invoices.get(invoiceId);
    if (!inv || inv.status !== 'draft') return false;
    inv.status = 'sent';
    return true;
  }

  markPaid(invoiceId: string): boolean {
    const inv = this.invoices.get(invoiceId);
    if (!inv || inv.status !== 'sent') return false;
    inv.status = 'paid'; inv.paidAt = Date.now();
    return true;
  }

  expireOverdue(): number {
    let count = 0;
    for (const inv of this.invoices.values()) {
      if (inv.status === 'sent' && Date.now() > inv.dueAt) { inv.status = 'expired'; count++; }
    }
    return count;
  }

  getByAgent(agentId: string): AgentInvoice[] {
    return Array.from(this.invoices.values()).filter(i => i.fromAgent === agentId || i.toAgent === agentId);
  }
}