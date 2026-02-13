interface InboundWebhook {
  id: string;
  platformId: string;
  event: string;
  payload: Record<string, unknown>;
  signature: string;
  verified: boolean;
  receivedAt: number;
  processedAt: number | null;
}

export class WebhookReceiver {
  private events: InboundWebhook[] = [];
  private secrets: Map<string, string> = new Map();
  private handlers: Map<string, ((event: InboundWebhook) => void)[]> = new Map();

  registerPlatform(platformId: string, signingSecret: string): void {
    this.secrets.set(platformId, signingSecret);
  }

  onEvent(platformId: string, handler: (event: InboundWebhook) => void): void {
    const existing = this.handlers.get(platformId) ?? [];
    existing.push(handler);
    this.handlers.set(platformId, existing);
  }

  receive(platformId: string, event: string, payload: Record<string, unknown>, signature: string): InboundWebhook {
    const verified = this.verifySignature(platformId, JSON.stringify(payload), signature);
    const webhook: InboundWebhook = { id: crypto.randomUUID(), platformId, event, payload, signature, verified, receivedAt: Date.now(), processedAt: null };
    this.events.push(webhook);
    if (verified) {
      const platformHandlers = this.handlers.get(platformId) ?? [];
      for (const h of platformHandlers) h(webhook);
      webhook.processedAt = Date.now();
    }
    return webhook;
  }

  private verifySignature(platformId: string, payload: string, signature: string): boolean {
    const secret = this.secrets.get(platformId);
    if (!secret) return false;
    let hash = 0;
    for (let i = 0; i < (payload + secret).length; i++) hash = ((hash << 5) - hash + (payload + secret).charCodeAt(i)) | 0;
    return signature === Math.abs(hash).toString(16);
  }

  getUnprocessed(): InboundWebhook[] { return this.events.filter(e => !e.processedAt); }
}