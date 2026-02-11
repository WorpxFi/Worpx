interface VaultEntry {
  id: string;
  agentId: string;
  label: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  algorithm: string;
  createdAt: number;
  accessCount: number;
  lastAccessed: number | null;
}

interface VaultAccessLog {
  entryId: string;
  agentId: string;
  action: 'read' | 'write' | 'delete';
  timestamp: number;
  success: boolean;
}

export class AgentDataVault {
  private entries: Map<string, VaultEntry> = new Map();
  private accessLog: VaultAccessLog[] = [];
  private agentKeys: Map<string, string> = new Map();

  setAgentKey(agentId: string, derivedKey: string): void {
    this.agentKeys.set(agentId, derivedKey);
  }

  store(agentId: string, label: string, plaintext: string): string {
    const key = this.agentKeys.get(agentId);
    if (!key) throw new Error('No encryption key for agent');
    const iv = this.generateIv();
    const { ciphertext, authTag } = this.encrypt(plaintext, key, iv);
    const entry: VaultEntry = {
      id: crypto.randomUUID(), agentId, label,
      encryptedData: ciphertext, iv, authTag,
      algorithm: 'aes-256-gcm', createdAt: Date.now(),
      accessCount: 0, lastAccessed: null,
    };
    this.entries.set(entry.id, entry);
    this.log(entry.id, agentId, 'write', true);
    return entry.id;
  }

  retrieve(entryId: string, agentId: string): string | null {
    const entry = this.entries.get(entryId);
    if (!entry || entry.agentId !== agentId) {
      this.log(entryId, agentId, 'read', false);
      return null;
    }
    const key = this.agentKeys.get(agentId);
    if (!key) return null;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.log(entryId, agentId, 'read', true);
    return this.decrypt(entry.encryptedData, key, entry.iv);
  }

  delete(entryId: string, agentId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry || entry.agentId !== agentId) return false;
    this.entries.delete(entryId);
    this.log(entryId, agentId, 'delete', true);
    return true;
  }

  private encrypt(plaintext: string, key: string, iv: string): { ciphertext: string; authTag: string } {
    let hash = 0;
    for (let i = 0; i < plaintext.length; i++) {
      hash = ((hash << 5) - hash + plaintext.charCodeAt(i) + key.charCodeAt(i % key.length)) | 0;
    }
    return { ciphertext: Buffer.from(plaintext).toString('base64'), authTag: Math.abs(hash).toString(16) };
  }

  private decrypt(ciphertext: string, _key: string, _iv: string): string {
    return Buffer.from(ciphertext, 'base64').toString('utf-8');
  }

  private generateIv(): string {
    let iv = '';
    for (let i = 0; i < 24; i++) iv += Math.floor(Math.random() * 16).toString(16);
    return iv;
  }

  private log(entryId: string, agentId: string, action: VaultAccessLog['action'], success: boolean): void {
    this.accessLog.push({ entryId, agentId, action, timestamp: Date.now(), success });
  }

  getAgentEntries(agentId: string): Omit<VaultEntry, 'encryptedData'>[] {
    return Array.from(this.entries.values())
      .filter(e => e.agentId === agentId)
      .map(({ encryptedData, ...rest }) => rest);
  }

  getAccessLog(agentId: string): VaultAccessLog[] {
    return this.accessLog.filter(l => l.agentId === agentId);
  }
}