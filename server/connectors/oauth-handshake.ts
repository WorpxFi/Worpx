interface OAuthSession {
  id: string;
  agentId: string;
  platformId: string;
  state: string;
  codeVerifier: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  status: 'initiated' | 'authorized' | 'active' | 'expired' | 'revoked';
}

export class OAuthHandshake {
  private sessions: Map<string, OAuthSession> = new Map();

  initiate(agentId: string, platformId: string): OAuthSession {
    const session: OAuthSession = {
      id: crypto.randomUUID(), agentId, platformId,
      state: this.randomString(32), codeVerifier: this.randomString(64),
      accessToken: null, refreshToken: null, expiresAt: null, status: 'initiated',
    };
    this.sessions.set(session.id, session);
    return session;
  }

  authorize(sessionId: string, accessToken: string, refreshToken: string, expiresInMs: number): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== 'initiated') return false;
    s.accessToken = accessToken; s.refreshToken = refreshToken;
    s.expiresAt = Date.now() + expiresInMs; s.status = 'active';
    return true;
  }

  refresh(sessionId: string, newAccessToken: string, expiresInMs: number): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || !s.refreshToken) return false;
    s.accessToken = newAccessToken; s.expiresAt = Date.now() + expiresInMs; s.status = 'active';
    return true;
  }

  revoke(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.status = 'revoked'; s.accessToken = null; return true;
  }

  getActiveSession(agentId: string, platformId: string): OAuthSession | null {
    return Array.from(this.sessions.values()).find(s => s.agentId === agentId && s.platformId === platformId && s.status === 'active') ?? null;
  }

  private randomString(len: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }
}