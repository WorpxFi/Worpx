interface NonceSlot {
  nonce: number;
  agentId: string;
  chain: string;
  allocated: boolean;
  txHash: string | null;
  createdAt: number;
  confirmedAt: number | null;
}

interface NonceGap {
  chain: string;
  agentId: string;
  missingNonces: number[];
}

export class NonceManager {
  private slots: Map<string, NonceSlot[]> = new Map();
  private nextNonce: Map<string, number> = new Map();

  private key(agentId: string, chain: string): string {
    return `${agentId}:${chain}`;
  }

  allocate(agentId: string, chain: string): number {
    const k = this.key(agentId, chain);
    const current = this.nextNonce.get(k) ?? 0;
    const slot: NonceSlot = {
      nonce: current, agentId, chain,
      allocated: true, txHash: null,
      createdAt: Date.now(), confirmedAt: null,
    };

    const existing = this.slots.get(k) ?? [];
    existing.push(slot);
    this.slots.set(k, existing);
    this.nextNonce.set(k, current + 1);
    return current;
  }

  confirm(agentId: string, chain: string, nonce: number, txHash: string): boolean {
    const k = this.key(agentId, chain);
    const slots = this.slots.get(k);
    if (!slots) return false;
    const slot = slots.find(s => s.nonce === nonce && s.allocated);
    if (!slot) return false;
    slot.txHash = txHash;
    slot.confirmedAt = Date.now();
    return true;
  }

  release(agentId: string, chain: string, nonce: number): boolean {
    const k = this.key(agentId, chain);
    const slots = this.slots.get(k);
    if (!slots) return false;
    const idx = slots.findIndex(s => s.nonce === nonce && !s.confirmedAt);
    if (idx < 0) return false;
    slots.splice(idx, 1);
    return true;
  }

  detectGaps(agentId: string, chain: string): NonceGap | null {
    const k = this.key(agentId, chain);
    const slots = this.slots.get(k);
    if (!slots || slots.length === 0) return null;

    const confirmed = slots
      .filter(s => s.confirmedAt !== null)
      .map(s => s.nonce)
      .sort((a, b) => a - b);

    if (confirmed.length === 0) return null;
    const max = confirmed[confirmed.length - 1];
    const missing: number[] = [];
    for (let i = 0; i <= max; i++) {
      if (!confirmed.includes(i)) missing.push(i);
    }

    return missing.length > 0 ? { chain, agentId, missingNonces: missing } : null;
  }

  getPending(agentId: string, chain: string): NonceSlot[] {
    const k = this.key(agentId, chain);
    return (this.slots.get(k) ?? []).filter(s => s.allocated && !s.confirmedAt);
  }

  getConfirmedCount(agentId: string, chain: string): number {
    const k = this.key(agentId, chain);
    return (this.slots.get(k) ?? []).filter(s => s.confirmedAt !== null).length;
  }

  resetAgent(agentId: string, chain: string, startNonce: number): void {
    const k = this.key(agentId, chain);
    this.slots.set(k, []);
    this.nextNonce.set(k, startNonce);
  }
}