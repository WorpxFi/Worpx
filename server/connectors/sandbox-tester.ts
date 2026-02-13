interface SandboxSession {
  id: string;
  platformId: string;
  agentId: string;
  calls: SandboxCall[];
  createdAt: number;
  expiresAt: number;
  active: boolean;
}

interface SandboxCall {
  method: string;
  endpoint: string;
  requestBody: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  statusCode: number;
  timestamp: number;
}

export class SandboxTester {
  private sessions: Map<string, SandboxSession> = new Map();

  createSession(platformId: string, agentId: string, ttlMs: number = 1800000): string {
    const id = crypto.randomUUID();
    this.sessions.set(id, { id, platformId, agentId, calls: [], createdAt: Date.now(), expiresAt: Date.now() + ttlMs, active: true });
    return id;
  }

  simulateCall(sessionId: string, method: string, endpoint: string, body: Record<string, unknown>): SandboxCall | null {
    const s = this.sessions.get(sessionId);
    if (!s || !s.active || Date.now() > s.expiresAt) return null;
    const call: SandboxCall = { method, endpoint, requestBody: body, responseBody: { mock: true, ref: crypto.randomUUID() }, statusCode: 200, timestamp: Date.now() };
    s.calls.push(call);
    return call;
  }

  endSession(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.active = false; return true;
  }

  getSessionCalls(sessionId: string): SandboxCall[] { return this.sessions.get(sessionId)?.calls ?? []; }
  getCallCount(sessionId: string): number { return this.sessions.get(sessionId)?.calls.length ?? 0; }
}