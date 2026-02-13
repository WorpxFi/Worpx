interface PlatformConnector {
  id: string;
  name: string;
  protocol: 'rest' | 'graphql' | 'websocket' | 'grpc';
  baseUrl: string;
  authType: 'bearer' | 'api_key' | 'oauth2' | 'hmac';
  capabilities: string[];
  status: 'active' | 'degraded' | 'offline';
  registeredAt: number;
}

export class PlatformRegistry {
  private platforms: Map<string, PlatformConnector> = new Map();

  register(name: string, protocol: PlatformConnector['protocol'], baseUrl: string, authType: PlatformConnector['authType'], capabilities: string[]): string {
    const id = crypto.randomUUID();
    this.platforms.set(id, { id, name, protocol, baseUrl, authType, capabilities, status: 'active', registeredAt: Date.now() });
    return id;
  }

  findByCapability(capability: string): PlatformConnector[] {
    return Array.from(this.platforms.values()).filter(p => p.status === 'active' && p.capabilities.includes(capability));
  }

  setStatus(id: string, status: PlatformConnector['status']): boolean {
    const p = this.platforms.get(id);
    if (!p) return false;
    p.status = status; return true;
  }

  getActive(): PlatformConnector[] { return Array.from(this.platforms.values()).filter(p => p.status === 'active'); }
  get(id: string): PlatformConnector | null { return this.platforms.get(id) ?? null; }
  getAll(): PlatformConnector[] { return Array.from(this.platforms.values()); }
}