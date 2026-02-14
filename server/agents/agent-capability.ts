interface Capability {
  id: string;
  agentId: string;
  name: string;
  version: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  maxConcurrency: number;
  pricePerCall: number;
  token: string;
}

export class AgentCapabilityEngine {
  private capabilities: Map<string, Capability[]> = new Map();

  declare(agentId: string, name: string, version: string, inputSchema: Record<string, string>, outputSchema: Record<string, string>, maxConcurrency: number, pricePerCall: number, token: string): string {
    const id = crypto.randomUUID();
    const cap: Capability = { id, agentId, name, version, inputSchema, outputSchema, maxConcurrency, pricePerCall, token };
    const existing = this.capabilities.get(agentId) ?? [];
    existing.push(cap);
    this.capabilities.set(agentId, existing);
    return id;
  }

  findProviders(capabilityName: string): Capability[] {
    const results: Capability[] = [];
    for (const caps of this.capabilities.values()) {
      for (const c of caps) { if (c.name === capabilityName) results.push(c); }
    }
    return results.sort((a, b) => a.pricePerCall - b.pricePerCall);
  }

  matchSchema(required: Record<string, string>, provided: Record<string, string>): boolean {
    for (const [key, type] of Object.entries(required)) {
      if (provided[key] !== type) return false;
    }
    return true;
  }

  getByAgent(agentId: string): Capability[] { return this.capabilities.get(agentId) ?? []; }
  revoke(agentId: string, capId: string): boolean {
    const caps = this.capabilities.get(agentId);
    if (!caps) return false;
    const idx = caps.findIndex(c => c.id === capId);
    if (idx < 0) return false;
    caps.splice(idx, 1); return true;
  }
}