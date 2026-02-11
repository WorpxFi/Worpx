interface KeyRecord {
  keyId: string;
  agentId: string;
  algorithm: string;
  publicKey: string;
  fingerprint: string;
  version: number;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  createdAt: number;
  expiresAt: number;
  rotatedAt: number | null;
}

interface RotationPolicy {
  agentId: string;
  intervalMs: number;
  algorithm: string;
  autoRotate: boolean;
  gracePeriodMs: number;
}

export class KeyRotationScheduler {
  private keys: Map<string, KeyRecord> = new Map();
  private policies: Map<string, RotationPolicy> = new Map();
  private history: Map<string, KeyRecord[]> = new Map();

  setPolicy(policy: RotationPolicy): void {
    this.policies.set(policy.agentId, policy);
  }

  generateKey(agentId: string): KeyRecord {
    const policy = this.policies.get(agentId);
    const algo = policy?.algorithm ?? 'ed25519';
    const interval = policy?.intervalMs ?? 2592000000;
    const existing = this.getActiveKey(agentId);
    const version = existing ? existing.version + 1 : 1;

    const record: KeyRecord = {
      keyId: crypto.randomUUID(), agentId, algorithm: algo,
      publicKey: this.derivePublicKey(agentId, version),
      fingerprint: this.computeFingerprint(agentId, version),
      version, status: 'active',
      createdAt: Date.now(), expiresAt: Date.now() + interval, rotatedAt: null,
    };
    this.keys.set(record.keyId, record);
    const hist = this.history.get(agentId) ?? [];
    hist.push(record);
    this.history.set(agentId, hist);
    return record;
  }

  rotate(agentId: string): KeyRecord | null {
    const current = this.getActiveKey(agentId);
    if (!current) return null;
    current.status = 'rotating';
    const newKey = this.generateKey(agentId);
    const policy = this.policies.get(agentId);
    const grace = policy?.gracePeriodMs ?? 300000;
    setTimeout(() => { current.status = 'deprecated'; }, grace);
    current.rotatedAt = Date.now();
    return newKey;
  }

  checkExpired(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    for (const key of this.keys.values()) {
      if (key.status === 'active' && now >= key.expiresAt) {
        const policy = this.policies.get(key.agentId);
        if (policy?.autoRotate) {
          this.rotate(key.agentId);
          expired.push(key.agentId);
        }
      }
    }
    return expired;
  }

  getActiveKey(agentId: string): KeyRecord | null {
    for (const key of this.keys.values()) {
      if (key.agentId === agentId && key.status === 'active') return key;
    }
    return null;
  }

  private derivePublicKey(agentId: string, version: number): string {
    let hash = version;
    for (let i = 0; i < agentId.length; i++) hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  private computeFingerprint(agentId: string, version: number): string {
    return (agentId + version).split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(16);
  }

  getKeyHistory(agentId: string): KeyRecord[] {
    return this.history.get(agentId) ?? [];
  }
}