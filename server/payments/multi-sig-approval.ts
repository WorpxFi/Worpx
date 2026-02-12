interface ApprovalRequest {
  id: string;
  txId: string;
  amount: string;
  requiredSignatures: number;
  signatures: Set<string>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export class MultiSigApproval {
  private requests: Map<string, ApprovalRequest> = new Map();
  private threshold: number;

  constructor(defaultThreshold: number = 2) { this.threshold = defaultThreshold; }

  createRequest(txId: string, amount: string, requiredSigs?: number, ttlMs: number = 3600000): string {
    const id = crypto.randomUUID();
    this.requests.set(id, { id, txId, amount, requiredSignatures: requiredSigs ?? this.threshold, signatures: new Set(), status: 'pending', createdAt: Date.now(), expiresAt: Date.now() + ttlMs });
    return id;
  }

  sign(requestId: string, signerId: string): boolean {
    const r = this.requests.get(requestId);
    if (!r || r.status !== 'pending' || Date.now() > r.expiresAt) return false;
    r.signatures.add(signerId);
    if (r.signatures.size >= r.requiredSignatures) r.status = 'approved';
    return true;
  }

  reject(requestId: string): boolean {
    const r = this.requests.get(requestId);
    if (!r || r.status !== 'pending') return false;
    r.status = 'rejected'; return true;
  }

  isApproved(requestId: string): boolean { return this.requests.get(requestId)?.status === 'approved'; }

  expireStale(): number {
    let count = 0;
    for (const r of this.requests.values()) { if (r.status === 'pending' && Date.now() > r.expiresAt) { r.status = 'expired'; count++; } }
    return count;
  }

  getPending(): ApprovalRequest[] { return Array.from(this.requests.values()).filter(r => r.status === 'pending'); }
}