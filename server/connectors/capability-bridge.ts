interface BridgedCapability {
  id: string;
  agentId: string;
  skillId: string;
  platformId: string;
  externalEndpoint: string;
  active: boolean;
  callCount: number;
  registeredAt: number;
}

export class CapabilityBridge {
  private bridges: Map<string, BridgedCapability> = new Map();

  expose(agentId: string, skillId: string, platformId: string, externalEndpoint: string): string {
    const id = crypto.randomUUID();
    this.bridges.set(id, { id, agentId, skillId, platformId, externalEndpoint, active: true, callCount: 0, registeredAt: Date.now() });
    return id;
  }

  recordCall(bridgeId: string): boolean {
    const b = this.bridges.get(bridgeId);
    if (!b || !b.active) return false;
    b.callCount++; return true;
  }

  deactivate(bridgeId: string): boolean {
    const b = this.bridges.get(bridgeId);
    if (!b) return false;
    b.active = false; return true;
  }

  getByAgent(agentId: string): BridgedCapability[] {
    return Array.from(this.bridges.values()).filter(b => b.agentId === agentId);
  }

  getByPlatform(platformId: string): BridgedCapability[] {
    return Array.from(this.bridges.values()).filter(b => b.platformId === platformId && b.active);
  }

  getTopBridges(limit: number = 10): BridgedCapability[] {
    return Array.from(this.bridges.values()).sort((a, b) => b.callCount - a.callCount).slice(0, limit);
  }
}