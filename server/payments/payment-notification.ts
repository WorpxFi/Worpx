interface PaymentNotification {
  id: string;
  recipientAgent: string;
  type: 'payment_received' | 'payment_sent' | 'refund' | 'channel_low' | 'stream_ended';
  payload: Record<string, string>;
  read: boolean;
  createdAt: number;
}

export class PaymentNotifier {
  private notifications: Map<string, PaymentNotification[]> = new Map();
  private handlers: Map<string, ((n: PaymentNotification) => void)[]> = new Map();

  notify(recipientAgent: string, type: PaymentNotification['type'], payload: Record<string, string>): string {
    const id = crypto.randomUUID();
    const notif: PaymentNotification = { id, recipientAgent, type, payload, read: false, createdAt: Date.now() };
    const existing = this.notifications.get(recipientAgent) ?? [];
    existing.push(notif);
    this.notifications.set(recipientAgent, existing);
    const agentHandlers = this.handlers.get(recipientAgent) ?? [];
    for (const handler of agentHandlers) handler(notif);
    return id;
  }

  subscribe(agentId: string, handler: (n: PaymentNotification) => void): void {
    const existing = this.handlers.get(agentId) ?? [];
    existing.push(handler);
    this.handlers.set(agentId, existing);
  }

  markRead(agentId: string, notifId: string): boolean {
    const notifs = this.notifications.get(agentId);
    const n = notifs?.find(x => x.id === notifId);
    if (!n) return false;
    n.read = true; return true;
  }

  getUnread(agentId: string): PaymentNotification[] {
    return (this.notifications.get(agentId) ?? []).filter(n => !n.read);
  }

  getAll(agentId: string): PaymentNotification[] { return this.notifications.get(agentId) ?? []; }
}