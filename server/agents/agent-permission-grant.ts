interface PermissionGrant {
  id: string;
  grantedTo: string;
  grantedBy: string;
  resource: string;
  actions: ('read' | 'write' | 'execute' | 'manage')[];
  scope: 'global' | 'chain' | 'skill' | 'channel';
  scopeFilter: string | null;
  expiresAt: number | null;
  revokedAt: number | null;
  createdAt: number;
}

export class AgentPermissionGrantSystem {
  private grants: Map<string, PermissionGrant> = new Map();

  grant(grantedBy: string, grantedTo: string, resource: string, actions: PermissionGrant['actions'], scope: PermissionGrant['scope'], scopeFilter?: string, ttlMs?: number): string {
    const id = crypto.randomUUID();
    this.grants.set(id, {
      id, grantedTo, grantedBy, resource, actions, scope,
      scopeFilter: scopeFilter ?? null,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
      revokedAt: null, createdAt: Date.now(),
    });
    return id;
  }

  check(agentId: string, resource: string, action: PermissionGrant['actions'][number]): boolean {
    for (const g of this.grants.values()) {
      if (g.grantedTo !== agentId) continue;
      if (g.revokedAt) continue;
      if (g.expiresAt && Date.now() > g.expiresAt) continue;
      if (g.resource !== resource && g.resource !== '*') continue;
      if (!g.actions.includes(action)) continue;
      return true;
    }
    return false;
  }

  revoke(grantId: string): boolean {
    const g = this.grants.get(grantId);
    if (!g || g.revokedAt) return false;
    g.revokedAt = Date.now();
    return true;
  }

  revokeAll(agentId: string): number {
    let count = 0;
    for (const g of this.grants.values()) {
      if (g.grantedTo === agentId && !g.revokedAt) { g.revokedAt = Date.now(); count++; }
    }
    return count;
  }

  getActiveGrants(agentId: string): PermissionGrant[] {
    return Array.from(this.grants.values()).filter(g =>
      g.grantedTo === agentId && !g.revokedAt && (!g.expiresAt || Date.now() <= g.expiresAt)
    );
  }

  getGrantedBy(agentId: string): PermissionGrant[] {
    return Array.from(this.grants.values()).filter(g => g.grantedBy === agentId && !g.revokedAt);
  }

  expireStale(): number {
    let count = 0;
    for (const g of this.grants.values()) {
      if (!g.revokedAt && g.expiresAt && Date.now() > g.expiresAt) { g.revokedAt = Date.now(); count++; }
    }
    return count;
  }
}