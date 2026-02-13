interface StoredCredential {
  id: string;
  agentId: string;
  platformId: string;
  credentialType: 'api_key' | 'oauth_token' | 'hmac_secret' | 'certificate';
  encryptedValue: string;
  createdAt: number;
  expiresAt: number | null;
  rotatedAt: number | null;
  active: boolean;
}

export class CredentialStore {
  private credentials: Map<string, StoredCredential> = new Map();

  store(agentId: string, platformId: string, credType: StoredCredential['credentialType'], value: string, expiresInMs?: number): string {
    const id = crypto.randomUUID();
    this.credentials.set(id, {
      id, agentId, platformId, credentialType: credType,
      encryptedValue: Buffer.from(value).toString('base64'),
      createdAt: Date.now(), expiresAt: expiresInMs ? Date.now() + expiresInMs : null,
      rotatedAt: null, active: true,
    });
    return id;
  }

  retrieve(agentId: string, platformId: string): string | null {
    const cred = Array.from(this.credentials.values()).find(c => c.agentId === agentId && c.platformId === platformId && c.active);
    if (!cred) return null;
    if (cred.expiresAt && Date.now() > cred.expiresAt) return null;
    return Buffer.from(cred.encryptedValue, 'base64').toString('utf-8');
  }

  rotate(credId: string, newValue: string): boolean {
    const c = this.credentials.get(credId);
    if (!c || !c.active) return false;
    c.encryptedValue = Buffer.from(newValue).toString('base64');
    c.rotatedAt = Date.now();
    return true;
  }

  revoke(credId: string): boolean {
    const c = this.credentials.get(credId);
    if (!c) return false;
    c.active = false; return true;
  }

  getByAgent(agentId: string): Omit<StoredCredential, 'encryptedValue'>[] {
    return Array.from(this.credentials.values()).filter(c => c.agentId === agentId).map(({ encryptedValue, ...rest }) => rest);
  }
}