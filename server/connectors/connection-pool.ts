interface PooledConnection {
  id: string;
  platformId: string;
  agentId: string;
  status: 'idle' | 'active' | 'stale';
  createdAt: number;
  lastUsed: number;
  useCount: number;
}

export class ConnectionPoolManager {
  private pool: Map<string, PooledConnection[]> = new Map();
  private maxPerPlatform: number;
  private staleThresholdMs: number;

  constructor(maxPerPlatform: number = 10, staleThresholdMs: number = 300000) {
    this.maxPerPlatform = maxPerPlatform;
    this.staleThresholdMs = staleThresholdMs;
  }

  acquire(platformId: string, agentId: string): PooledConnection {
    const connections = this.pool.get(platformId) ?? [];
    const idle = connections.find(c => c.status === 'idle');
    if (idle) { idle.status = 'active'; idle.lastUsed = Date.now(); idle.useCount++; return idle; }
    if (connections.length >= this.maxPerPlatform) { this.evictStale(platformId); }
    const conn: PooledConnection = { id: crypto.randomUUID(), platformId, agentId, status: 'active', createdAt: Date.now(), lastUsed: Date.now(), useCount: 1 };
    connections.push(conn);
    this.pool.set(platformId, connections);
    return conn;
  }

  release(connectionId: string): boolean {
    for (const conns of this.pool.values()) {
      const c = conns.find(x => x.id === connectionId);
      if (c) { c.status = 'idle'; c.lastUsed = Date.now(); return true; }
    }
    return false;
  }

  private evictStale(platformId: string): void {
    const conns = this.pool.get(platformId) ?? [];
    const cutoff = Date.now() - this.staleThresholdMs;
    this.pool.set(platformId, conns.filter(c => c.lastUsed > cutoff || c.status === 'active'));
  }

  getPoolSize(platformId: string): number { return (this.pool.get(platformId) ?? []).length; }
  getActiveCount(platformId: string): number { return (this.pool.get(platformId) ?? []).filter(c => c.status === 'active').length; }
}