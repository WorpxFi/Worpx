interface AgentService {
  id: string;
  agentId: string;
  serviceName: string;
  version: string;
  endpoint: string;
  protocol: 'http' | 'ws' | 'grpc';
  healthStatus: 'healthy' | 'degraded' | 'down';
  metadata: Record<string, string>;
  registeredAt: number;
  lastHealthCheck: number;
}

export class AgentServiceRegistry {
  private services: Map<string, AgentService> = new Map();

  register(agentId: string, serviceName: string, version: string, endpoint: string, protocol: AgentService['protocol'], metadata: Record<string, string> = {}): string {
    const id = crypto.randomUUID();
    this.services.set(id, { id, agentId, serviceName, version, endpoint, protocol, healthStatus: 'healthy', metadata, registeredAt: Date.now(), lastHealthCheck: Date.now() });
    return id;
  }

  discover(serviceName: string, version?: string): AgentService[] {
    return Array.from(this.services.values()).filter(s =>
      s.serviceName === serviceName && s.healthStatus !== 'down' && (!version || s.version === version)
    );
  }

  updateHealth(serviceId: string, status: AgentService['healthStatus']): boolean {
    const s = this.services.get(serviceId);
    if (!s) return false;
    s.healthStatus = status;
    s.lastHealthCheck = Date.now();
    return true;
  }

  deregister(serviceId: string): boolean { return this.services.delete(serviceId); }

  getByAgent(agentId: string): AgentService[] {
    return Array.from(this.services.values()).filter(s => s.agentId === agentId);
  }

  getHealthy(): AgentService[] {
    return Array.from(this.services.values()).filter(s => s.healthStatus === 'healthy');
  }

  findByProtocol(protocol: AgentService['protocol']): AgentService[] {
    return Array.from(this.services.values()).filter(s => s.protocol === protocol && s.healthStatus !== 'down');
  }

  getStale(maxAgeMs: number = 120000): AgentService[] {
    const cutoff = Date.now() - maxAgeMs;
    return Array.from(this.services.values()).filter(s => s.lastHealthCheck < cutoff);
  }
}