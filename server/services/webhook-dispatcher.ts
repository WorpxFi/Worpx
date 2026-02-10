interface WebhookEndpoint {
  id: string;
  agentId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: number;
  failureCount: number;
  lastDelivery: number | null;
  lastFailure: number | null;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  delivered: boolean;
  attemptCount: number;
  createdAt: number;
  deliveredAt: number | null;
}

interface WebhookConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  maxFailuresBeforeDisable: number;
}

export class WebhookDispatcher {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryLog: WebhookDelivery[] = [];
  private config: WebhookConfig;

  constructor(config: Partial<WebhookConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000,
      timeoutMs: config.timeoutMs ?? 10000,
      maxFailuresBeforeDisable: config.maxFailuresBeforeDisable ?? 10,
    };
  }

  registerEndpoint(agentId: string, url: string, events: string[]): string {
    const id = crypto.randomUUID();
    const secret = this.generateSecret();
    this.endpoints.set(id, {
      id, agentId, url, events, secret, active: true,
      createdAt: Date.now(), failureCount: 0, lastDelivery: null, lastFailure: null,
    });
    return id;
  }

  async dispatch(event: string, agentId: string, payload: Record<string, unknown>): Promise<number> {
    const targets = Array.from(this.endpoints.values())
      .filter(ep => ep.active && ep.agentId === agentId && ep.events.includes(event));

    let delivered = 0;
    for (const endpoint of targets) {
      const delivery = await this.attemptDelivery(endpoint, event, payload);
      if (delivery.delivered) delivered++;
    }
    return delivered;
  }

  private async attemptDelivery(endpoint: WebhookEndpoint, event: string, payload: Record<string, unknown>): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(), endpointId: endpoint.id, event, payload,
      statusCode: null, delivered: false, attemptCount: 0,
      createdAt: Date.now(), deliveredAt: null,
    };

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      delivery.attemptCount = attempt + 1;
      try {
        const signature = this.computeSignature(JSON.stringify(payload), endpoint.secret);
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Worpx-Event': event,
            'X-Worpx-Signature': signature,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        delivery.statusCode = response.status;
        if (response.ok) {
          delivery.delivered = true;
          delivery.deliveredAt = Date.now();
          endpoint.lastDelivery = Date.now();
          endpoint.failureCount = 0;
          break;
        }
      } catch {
        endpoint.failureCount++;
        endpoint.lastFailure = Date.now();
      }

      if (endpoint.failureCount >= this.config.maxFailuresBeforeDisable) {
        endpoint.active = false;
        break;
      }

      if (attempt < this.config.maxRetries) {
        await new Promise(r => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
      }
    }

    this.deliveryLog.push(delivery);
    return delivery;
  }

  private computeSignature(payload: string, secret: string): string {
    let hash = 0;
    const combined = payload + secret;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return 'sha256=' + Math.abs(hash).toString(16).padStart(16, '0');
  }

  private generateSecret(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
    return secret;
  }

  getEndpoints(agentId: string): WebhookEndpoint[] {
    return Array.from(this.endpoints.values()).filter(ep => ep.agentId === agentId);
  }

  getDeliveryLog(endpointId: string, limit: number = 50): WebhookDelivery[] {
    return this.deliveryLog.filter(d => d.endpointId === endpointId).slice(-limit);
  }

  disableEndpoint(endpointId: string): boolean {
    const ep = this.endpoints.get(endpointId);
    if (!ep) return false;
    ep.active = false;
    return true;
  }
}