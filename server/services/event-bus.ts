type EventCategory = 'agent' | 'channel' | 'transaction' | 'skill' | 'settlement';

interface ProtocolEvent {
  id: string;
  category: EventCategory;
  type: string;
  agentId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  chain: string;
}

type EventHandler = (event: ProtocolEvent) => void | Promise<void>;

interface Subscription {
  id: string;
  category: EventCategory;
  type?: string;
  agentId?: string;
  handler: EventHandler;
}

export class ProtocolEventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private eventLog: ProtocolEvent[] = [];
  private maxLogSize: number;
  private deadLetterQueue: ProtocolEvent[] = [];

  constructor(maxLogSize: number = 10000) {
    this.maxLogSize = maxLogSize;
  }

  subscribe(category: EventCategory, handler: EventHandler, filter?: { type?: string; agentId?: string }): string {
    const id = crypto.randomUUID();
    this.subscriptions.set(id, {
      id, category, handler,
      type: filter?.type, agentId: filter?.agentId,
    });
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  async emit(category: EventCategory, type: string, agentId: string, chain: string, payload: Record<string, unknown>): Promise<number> {
    const event: ProtocolEvent = {
      id: crypto.randomUUID(), category, type, agentId, payload, timestamp: Date.now(), chain,
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-Math.floor(this.maxLogSize * 0.75));
    }

    let delivered = 0;
    for (const sub of this.subscriptions.values()) {
      if (sub.category !== category) continue;
      if (sub.type && sub.type !== type) continue;
      if (sub.agentId && sub.agentId !== agentId) continue;

      try {
        await sub.handler(event);
        delivered++;
      } catch {
        this.deadLetterQueue.push(event);
      }
    }
    return delivered;
  }

  getEvents(filter: { category?: EventCategory; type?: string; agentId?: string; since?: number; limit?: number }): ProtocolEvent[] {
    let results = this.eventLog;
    if (filter.category) results = results.filter(e => e.category === filter.category);
    if (filter.type) results = results.filter(e => e.type === filter.type);
    if (filter.agentId) results = results.filter(e => e.agentId === filter.agentId);
    if (filter.since) results = results.filter(e => e.timestamp >= filter.since!);
    return results.slice(-(filter.limit ?? 100));
  }

  getDeadLetters(): ProtocolEvent[] {
    return [...this.deadLetterQueue];
  }

  clearDeadLetters(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getEventCount(category?: EventCategory): number {
    if (!category) return this.eventLog.length;
    return this.eventLog.filter(e => e.category === category).length;
  }
}