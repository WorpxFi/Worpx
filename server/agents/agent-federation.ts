interface FederatedNetwork {
  id: string;
  networkName: string;
  gatewayUrl: string;
  protocol: string;
  sharedSecret: string;
  agentCount: number;
  status: 'connected' | 'handshaking' | 'disconnected';
  connectedAt: number | null;
}

interface FederatedAgent {
  localAlias: string;
  remoteId: string;
  networkId: string;
  capabilities: string[];
  trustLevel: number;
  lastSeen: number;
}

export class AgentFederationGateway {
  private networks: Map<string, FederatedNetwork> = new Map();
  private remoteAgents: Map<string, FederatedAgent> = new Map();

  registerNetwork(networkName: string, gatewayUrl: string, protocol: string, sharedSecret: string): string {
    const id = crypto.randomUUID();
    this.networks.set(id, { id, networkName, gatewayUrl, protocol, sharedSecret, agentCount: 0, status: 'handshaking', connectedAt: null });
    return id;
  }

  connect(networkId: string): boolean {
    const n = this.networks.get(networkId);
    if (!n || n.status === 'connected') return false;
    n.status = 'connected';
    n.connectedAt = Date.now();
    return true;
  }

  disconnect(networkId: string): boolean {
    const n = this.networks.get(networkId);
    if (!n) return false;
    n.status = 'disconnected';
    return true;
  }

  registerRemoteAgent(networkId: string, remoteId: string, capabilities: string[]): string {
    const alias = 'fed_' + remoteId.slice(0, 8);
    this.remoteAgents.set(alias, { localAlias: alias, remoteId, networkId, capabilities, trustLevel: 30, lastSeen: Date.now() });
    const n = this.networks.get(networkId);
    if (n) n.agentCount++;
    return alias;
  }

  findRemoteAgent(capability: string): FederatedAgent[] {
    return Array.from(this.remoteAgents.values()).filter(a => a.capabilities.includes(capability)).sort((a, b) => b.trustLevel - a.trustLevel);
  }

  adjustTrust(alias: string, delta: number): void {
    const a = this.remoteAgents.get(alias);
    if (a) a.trustLevel = Math.max(0, Math.min(100, a.trustLevel + delta));
  }

  getConnectedNetworks(): FederatedNetwork[] {
    return Array.from(this.networks.values()).filter(n => n.status === 'connected');
  }

  getRemoteAgentCount(): number { return this.remoteAgents.size; }
}