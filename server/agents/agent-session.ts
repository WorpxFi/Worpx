interface AgentSession {
  sessionId: string;
  agentId: string;
  chain: string;
  createdAt: number;
  expiresAt: number;
  renewedAt: number | null;
  active: boolean;
  metadata: Record<string, string>;
}

export class AgentSessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 3600000) { this.defaultTtlMs = defaultTtlMs; }

  create(agentId: string, chain: string, metadata: Record<string, string> = {}): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, { sessionId, agentId, chain, createdAt: Date.now(), expiresAt: Date.now() + this.defaultTtlMs, renewedAt: null, active: true, metadata });
    return sessionId;
  }

  validate(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || !s.active) return false;
    if (Date.now() > s.expiresAt) { s.active = false; return false; }
    return true;
  }

  renew(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || !s.active) return false;
    s.expiresAt = Date.now() + this.defaultTtlMs;
    s.renewedAt = Date.now();
    return true;
  }

  revoke(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.active = false; return true;
  }

  getByAgent(agentId: string): AgentSession[] { return Array.from(this.sessions.values()).filter(s => s.agentId === agentId && s.active); }
  expireStale(): number {
    let count = 0;
    for (const s of this.sessions.values()) { if (s.active && Date.now() > s.expiresAt) { s.active = false; count++; } }
    return count;
  }
}