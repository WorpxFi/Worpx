interface WebhookSubscription {
  id: string;
  agentId: string;
  targetUrl: string;
  events: string[];
  secret: string;
  active: boolean;
  failCount: number;
  maxFailures: number;
  createdAt: number;
  lastDelivery: number | null;
}

interface DeliveryRecord {
  id: string;
  subscriptionId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  success: boolean;
  attemptedAt: number;
}

export class ApiWebhookDispatcher {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private deliveries: DeliveryRecord[] = [];

  subscribe(agentId: string, targetUrl: string, events: string[], maxFailures: number = 5): string {
    const id = crypto.randomUUID();
    const secret = 'whsec_' + Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    this.subscriptions.set(id, { id, agentId, targetUrl, events, secret, active: true, failCount: 0, maxFailures, createdAt: Date.now(), lastDelivery: null });
    return id;
  }

  async dispatch(event: string, payload: Record<string, unknown>): Promise<number> {
    let dispatched = 0;
    for (const sub of this.subscriptions.values()) {
      if (!sub.active || !sub.events.includes(event)) continue;
      const delivery: DeliveryRecord = { id: crypto.randomUUID(), subscriptionId: sub.id, event, payload, statusCode: 200, success: true, attemptedAt: Date.now() };
      this.deliveries.push(delivery);
      sub.lastDelivery = Date.now();
      sub.failCount = 0;
      dispatched++;
    }
    return dispatched;
  }

  recordFailure(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return;
    sub.failCount++;
    if (sub.failCount >= sub.maxFailures) sub.active = false;
  }

  unsubscribe(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return false;
    sub.active = false; return true;
  }

  getByAgent(agentId: string): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.agentId === agentId);
  }

  getDeliveries(subscriptionId: string, limit: number = 20): DeliveryRecord[] {
    return this.deliveries.filter(d => d.subscriptionId === subscriptionId).slice(-limit);
  }
}