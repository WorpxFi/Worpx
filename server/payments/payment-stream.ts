interface PaymentStream {
  id: string;
  sender: string;
  receiver: string;
  ratePerSecond: number;
  token: string;
  chain: string;
  startedAt: number;
  stoppedAt: number | null;
  totalStreamed: number;
  active: boolean;
}

export class PaymentStreamManager {
  private streams: Map<string, PaymentStream> = new Map();

  start(sender: string, receiver: string, ratePerSecond: number, token: string, chain: string): string {
    const id = crypto.randomUUID();
    this.streams.set(id, { id, sender, receiver, ratePerSecond, token, chain, startedAt: Date.now(), stoppedAt: null, totalStreamed: 0, active: true });
    return id;
  }

  stop(id: string): number {
    const s = this.streams.get(id);
    if (!s || !s.active) return 0;
    const elapsed = (Date.now() - s.startedAt) / 1000;
    s.totalStreamed = parseFloat((elapsed * s.ratePerSecond).toFixed(6));
    s.stoppedAt = Date.now(); s.active = false;
    return s.totalStreamed;
  }

  getAccrued(id: string): number {
    const s = this.streams.get(id);
    if (!s) return 0;
    const end = s.stoppedAt ?? Date.now();
    return parseFloat(((end - s.startedAt) / 1000 * s.ratePerSecond).toFixed(6));
  }

  getActiveStreams(agentId: string): PaymentStream[] {
    return Array.from(this.streams.values()).filter(s => s.active && (s.sender === agentId || s.receiver === agentId));
  }

  getTotalStreamedByAgent(agentId: string): number {
    return Array.from(this.streams.values()).filter(s => s.sender === agentId).reduce((sum, s) => sum + this.getAccrued(s.id), 0);
  }
}