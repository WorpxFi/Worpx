interface NegotiationRound {
  proposer: string;
  offeredPrice: number;
  timestamp: number;
}

interface Negotiation {
  id: string;
  buyer: string;
  seller: string;
  skillId: string;
  rounds: NegotiationRound[];
  agreedPrice: number | null;
  status: 'open' | 'agreed' | 'rejected' | 'expired';
  maxRounds: number;
  expiresAt: number;
}

export class AgentNegotiationEngine {
  private negotiations: Map<string, Negotiation> = new Map();

  open(buyer: string, seller: string, skillId: string, initialOffer: number, maxRounds: number = 5, ttlMs: number = 600000): string {
    const id = crypto.randomUUID();
    this.negotiations.set(id, { id, buyer, seller, skillId, rounds: [{ proposer: buyer, offeredPrice: initialOffer, timestamp: Date.now() }], agreedPrice: null, status: 'open', maxRounds, expiresAt: Date.now() + ttlMs });
    return id;
  }

  counterOffer(negotiationId: string, agentId: string, price: number): boolean {
    const n = this.negotiations.get(negotiationId);
    if (!n || n.status !== 'open' || Date.now() > n.expiresAt) return false;
    if (n.rounds.length >= n.maxRounds) { n.status = 'expired'; return false; }
    n.rounds.push({ proposer: agentId, offeredPrice: price, timestamp: Date.now() });
    return true;
  }

  accept(negotiationId: string): boolean {
    const n = this.negotiations.get(negotiationId);
    if (!n || n.status !== 'open') return false;
    n.agreedPrice = n.rounds[n.rounds.length - 1].offeredPrice;
    n.status = 'agreed'; return true;
  }

  reject(negotiationId: string): boolean {
    const n = this.negotiations.get(negotiationId);
    if (!n || n.status !== 'open') return false;
    n.status = 'rejected'; return true;
  }

  getByAgent(agentId: string): Negotiation[] { return Array.from(this.negotiations.values()).filter(n => n.buyer === agentId || n.seller === agentId); }
  getOpen(): Negotiation[] { return Array.from(this.negotiations.values()).filter(n => n.status === 'open'); }
}