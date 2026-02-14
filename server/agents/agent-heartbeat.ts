interface HeartbeatRecord {
  agentId: string;
  lastBeat: number;
  intervalMs: number;
  consecutiveMisses: number;
  status: 'alive' | 'unresponsive' | 'dead';
  metadata: Record<string, string>;
}

export class AgentHeartbeatMonitor {
  private records: Map<string, HeartbeatRecord> = new Map();
  private missThreshold: number;

  constructor(missThreshold: number = 3) { this.missThreshold = missThreshold; }

  register(agentId: string, intervalMs: number = 30000): void {
    this.records.set(agentId, { agentId, lastBeat: Date.now(), intervalMs, consecutiveMisses: 0, status: 'alive', metadata: {} });
  }

  beat(agentId: string, metadata: Record<string, string> = {}): boolean {
    const r = this.records.get(agentId);
    if (!r) return false;
    r.lastBeat = Date.now();
    r.consecutiveMisses = 0;
    r.status = 'alive';
    r.metadata = metadata;
    return true;
  }

  check(): string[] {
    const unresponsive: string[] = [];
    const now = Date.now();
    for (const r of this.records.values()) {
      const elapsed = now - r.lastBeat;
      if (elapsed > r.intervalMs) {
        r.consecutiveMisses = Math.floor(elapsed / r.intervalMs);
        r.status = r.consecutiveMisses >= this.missThreshold ? 'dead' : 'unresponsive';
        unresponsive.push(r.agentId);
      }
    }
    return unresponsive;
  }

  getStatus(agentId: string): HeartbeatRecord | null { return this.records.get(agentId) ?? null; }
  getAlive(): string[] { return Array.from(this.records.values()).filter(r => r.status === 'alive').map(r => r.agentId); }
  getDead(): string[] { return Array.from(this.records.values()).filter(r => r.status === 'dead').map(r => r.agentId); }
}