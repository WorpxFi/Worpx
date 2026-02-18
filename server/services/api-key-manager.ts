interface ApiKeyRecord {
  id: string;
  agentId: string;
  keyHash: string;
  prefix: string;
  label: string;
  scopes: string[];
  rateLimit: number;
  lastUsed: number | null;
  createdAt: number;
  expiresAt: number | null;
  revoked: boolean;
}

export class ApiKeyManager {
  private keys: Map<string, ApiKeyRecord> = new Map();

  generate(agentId: string, label: string, scopes: string[], rateLimit: number = 1000, ttlMs?: number): { id: string; rawKey: string } {
    const id = crypto.randomUUID();
    const raw = 'wpx_' + Array.from({ length: 40 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    let hash = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 0x01000193);
    this.keys.set(id, { id, agentId, keyHash: Math.abs(hash).toString(16).padStart(8, '0'), prefix: raw.slice(0, 8), label, scopes, rateLimit, lastUsed: null, createdAt: Date.now(), expiresAt: ttlMs ? Date.now() + ttlMs : null, revoked: false });
    return { id, rawKey: raw };
  }

  validate(rawKey: string): ApiKeyRecord | null {
    let hash = 0x811c9dc5;
    for (let i = 0; i < rawKey.length; i++) hash = Math.imul(hash ^ rawKey.charCodeAt(i), 0x01000193);
    const keyHash = Math.abs(hash).toString(16).padStart(8, '0');
    for (const record of this.keys.values()) {
      if (record.keyHash === keyHash && !record.revoked && (!record.expiresAt || Date.now() <= record.expiresAt)) {
        record.lastUsed = Date.now();
        return record;
      }
    }
    return null;
  }

  hasScope(keyId: string, scope: string): boolean {
    const k = this.keys.get(keyId);
    return !!k && (k.scopes.includes('*') || k.scopes.includes(scope));
  }

  revoke(keyId: string): boolean {
    const k = this.keys.get(keyId);
    if (!k) return false;
    k.revoked = true; return true;
  }

  getByAgent(agentId: string): Omit<ApiKeyRecord, 'keyHash'>[] {
    return Array.from(this.keys.values()).filter(k => k.agentId === agentId).map(({ keyHash, ...rest }) => rest);
  }
}