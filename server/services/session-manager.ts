interface AgentSession {
  sessionId: string;
  agentId: string;
  token: string;
  chain: string;
  permissions: Permission[];
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  refreshCount: number;
  ipAddress: string | null;
  revoked: boolean;
}

type Permission = 'read' | 'write' | 'execute_skills' | 'open_channels' | 'settle' | 'admin';

interface SessionConfig {
  ttlMs: number;
  maxRefreshes: number;
  idleTimeoutMs: number;
  maxConcurrent: number;
}

export class SessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private agentSessions: Map<string, Set<string>> = new Map();
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      ttlMs: config.ttlMs ?? 3600000,
      maxRefreshes: config.maxRefreshes ?? 10,
      idleTimeoutMs: config.idleTimeoutMs ?? 900000,
      maxConcurrent: config.maxConcurrent ?? 5,
    };
  }

  create(agentId: string, chain: string, permissions: Permission[], ipAddress?: string): AgentSession {
    const agentSet = this.agentSessions.get(agentId) ?? new Set();
    if (agentSet.size >= this.config.maxConcurrent) {
      const oldest = this.findOldestSession(agentId);
      if (oldest) this.revoke(oldest);
    }

    const session: AgentSession = {
      sessionId: crypto.randomUUID(),
      agentId, chain, permissions,
      token: this.generateToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ttlMs,
      lastActivity: Date.now(),
      refreshCount: 0,
      ipAddress: ipAddress ?? null,
      revoked: false,
    };

    this.sessions.set(session.sessionId, session);
    agentSet.add(session.sessionId);
    this.agentSessions.set(agentId, agentSet);
    return session;
  }

  validate(sessionId: string): AgentSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked) return null;
    if (Date.now() > session.expiresAt) return null;
    if (Date.now() - session.lastActivity > this.config.idleTimeoutMs) return null;
    session.lastActivity = Date.now();
    return session;
  }

  refresh(sessionId: string): AgentSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked) return null;
    if (session.refreshCount >= this.config.maxRefreshes) return null;

    session.token = this.generateToken();
    session.expiresAt = Date.now() + this.config.ttlMs;
    session.refreshCount++;
    session.lastActivity = Date.now();
    return session;
  }

  revoke(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.revoked = true;
    this.agentSessions.get(session.agentId)?.delete(sessionId);
    return true;
  }

  revokeAllForAgent(agentId: string): number {
    const agentSet = this.agentSessions.get(agentId);
    if (!agentSet) return 0;
    let count = 0;
    for (const sid of agentSet) {
      const session = this.sessions.get(sid);
      if (session && !session.revoked) { session.revoked = true; count++; }
    }
    agentSet.clear();
    return count;
  }

  hasPermission(sessionId: string, permission: Permission): boolean {
    const session = this.validate(sessionId);
    return session?.permissions.includes(permission) ?? false;
  }

  private findOldestSession(agentId: string): string | null {
    const agentSet = this.agentSessions.get(agentId);
    if (!agentSet) return null;
    let oldest: AgentSession | null = null;
    for (const sid of agentSet) {
      const s = this.sessions.get(sid);
      if (s && !s.revoked && (!oldest || s.createdAt < oldest.createdAt)) oldest = s;
    }
    return oldest?.sessionId ?? null;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'wpx_';
    for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
    return token;
  }

  getActiveSessions(agentId: string): AgentSession[] {
    const agentSet = this.agentSessions.get(agentId);
    if (!agentSet) return [];
    return Array.from(agentSet)
      .map(sid => this.sessions.get(sid))
      .filter((s): s is AgentSession => s !== undefined && !s.revoked && Date.now() < s.expiresAt);
  }
}