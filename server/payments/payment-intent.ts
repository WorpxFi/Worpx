interface PaymentIntent {
  id: string;
  payer: string;
  payee: string;
  amount: string;
  token: string;
  chain: string;
  status: 'created' | 'authorized' | 'captured' | 'cancelled' | 'expired';
  expiresAt: number;
  authorizedAt: number | null;
  capturedAt: number | null;
}

export class PaymentIntentManager {
  private intents: Map<string, PaymentIntent> = new Map();

  create(payer: string, payee: string, amount: string, token: string, chain: string, ttlMs: number = 600000): string {
    const id = crypto.randomUUID();
    this.intents.set(id, { id, payer, payee, amount, token, chain, status: 'created', expiresAt: Date.now() + ttlMs, authorizedAt: null, capturedAt: null });
    return id;
  }

  authorize(id: string): boolean {
    const i = this.intents.get(id);
    if (!i || i.status !== 'created' || Date.now() > i.expiresAt) return false;
    i.status = 'authorized'; i.authorizedAt = Date.now();
    return true;
  }

  capture(id: string): boolean {
    const i = this.intents.get(id);
    if (!i || i.status !== 'authorized') return false;
    i.status = 'captured'; i.capturedAt = Date.now();
    return true;
  }

  cancel(id: string): boolean {
    const i = this.intents.get(id);
    if (!i || i.status === 'captured') return false;
    i.status = 'cancelled'; return true;
  }

  expireStale(): number {
    let count = 0;
    for (const i of this.intents.values()) {
      if ((i.status === 'created' || i.status === 'authorized') && Date.now() > i.expiresAt) { i.status = 'expired'; count++; }
    }
    return count;
  }

  get(id: string): PaymentIntent | null { return this.intents.get(id) ?? null; }
}