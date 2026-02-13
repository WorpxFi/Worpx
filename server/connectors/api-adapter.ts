interface AdapterConfig {
  platformId: string;
  requestTransform: (req: NormalizedRequest) => Record<string, unknown>;
  responseTransform: (raw: Record<string, unknown>) => NormalizedResponse;
}

interface NormalizedRequest {
  action: string;
  agentId: string;
  params: Record<string, unknown>;
}

interface NormalizedResponse {
  success: boolean;
  data: Record<string, unknown>;
  platformRef: string | null;
  timestamp: number;
}

export class UniversalApiAdapter {
  private adapters: Map<string, AdapterConfig> = new Map();
  private callLog: { platformId: string; action: string; success: boolean; latencyMs: number; timestamp: number }[] = [];

  register(config: AdapterConfig): void { this.adapters.set(config.platformId, config); }

  async execute(platformId: string, request: NormalizedRequest): Promise<NormalizedResponse> {
    const adapter = this.adapters.get(platformId);
    if (!adapter) throw new Error('No adapter for platform ' + platformId);
    const start = Date.now();
    const transformed = adapter.requestTransform(request);
    const rawResponse = await this.sendRequest(platformId, transformed);
    const normalized = adapter.responseTransform(rawResponse);
    this.callLog.push({ platformId, action: request.action, success: normalized.success, latencyMs: Date.now() - start, timestamp: Date.now() });
    return normalized;
  }

  private async sendRequest(_platformId: string, _payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { status: 'ok', ref: crypto.randomUUID() };
  }

  getCallStats(platformId: string): { total: number; successRate: number; avgLatency: number } {
    const calls = this.callLog.filter(c => c.platformId === platformId);
    const successes = calls.filter(c => c.success).length;
    const avgLatency = calls.length > 0 ? calls.reduce((s, c) => s + c.latencyMs, 0) / calls.length : 0;
    return { total: calls.length, successRate: calls.length > 0 ? successes / calls.length : 0, avgLatency: Math.round(avgLatency) };
  }
}