interface RefundRequest {
  id: string;
  originalTxId: string;
  requester: string;
  recipient: string;
  amount: string;
  token: string;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'denied';
  createdAt: number;
  processedAt: number | null;
}

export class RefundProcessor {
  private requests: Map<string, RefundRequest> = new Map();
  private autoApproveThreshold: number;

  constructor(autoApproveThreshold: number = 10) {
    this.autoApproveThreshold = autoApproveThreshold;
  }

  request(originalTxId: string, requester: string, recipient: string, amount: string, token: string, reason: string): string {
    const id = crypto.randomUUID();
    const status = parseFloat(amount) <= this.autoApproveThreshold ? 'approved' : 'pending';
    this.requests.set(id, { id, originalTxId, requester, recipient, amount, token, reason, status, createdAt: Date.now(), processedAt: null });
    return id;
  }

  approve(id: string): boolean {
    const r = this.requests.get(id);
    if (!r || r.status !== 'pending') return false;
    r.status = 'approved'; return true;
  }

  process(id: string): boolean {
    const r = this.requests.get(id);
    if (!r || r.status !== 'approved') return false;
    r.status = 'processed'; r.processedAt = Date.now(); return true;
  }

  deny(id: string): boolean {
    const r = this.requests.get(id);
    if (!r || r.status !== 'pending') return false;
    r.status = 'denied'; return true;
  }

  getPending(): RefundRequest[] { return Array.from(this.requests.values()).filter(r => r.status === 'pending'); }
  getByAgent(agentId: string): RefundRequest[] { return Array.from(this.requests.values()).filter(r => r.requester === agentId || r.recipient === agentId); }
}