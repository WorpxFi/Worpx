interface CollaborationSession {
  id: string;
  initiator: string;
  participants: string[];
  sharedContext: Record<string, unknown>;
  objective: string;
  status: 'forming' | 'active' | 'paused' | 'completed' | 'dissolved';
  createdAt: number;
  completedAt: number | null;
}

export class AgentCollaboration {
  private sessions: Map<string, CollaborationSession> = new Map();

  create(initiator: string, objective: string): string {
    const id = crypto.randomUUID();
    this.sessions.set(id, { id, initiator, participants: [initiator], sharedContext: {}, objective, status: 'forming', createdAt: Date.now(), completedAt: null });
    return id;
  }

  join(sessionId: string, agentId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.status === 'completed' || s.status === 'dissolved') return false;
    if (s.participants.includes(agentId)) return false;
    s.participants.push(agentId);
    return true;
  }

  activate(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== 'forming') return false;
    s.status = 'active'; return true;
  }

  updateContext(sessionId: string, agentId: string, data: Record<string, unknown>): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || !s.participants.includes(agentId) || s.status !== 'active') return false;
    Object.assign(s.sharedContext, data);
    return true;
  }

  complete(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== 'active') return false;
    s.status = 'completed'; s.completedAt = Date.now(); return true;
  }

  dissolve(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.status = 'dissolved'; return true;
  }

  getByAgent(agentId: string): CollaborationSession[] { return Array.from(this.sessions.values()).filter(s => s.participants.includes(agentId)); }
  getActive(): CollaborationSession[] { return Array.from(this.sessions.values()).filter(s => s.status === 'active'); }
}