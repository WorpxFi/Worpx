interface AuditEntry {
  sequence: number;
  hash: string;
  previousHash: string;
  agentId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, string>;
  timestamp: number;
}

export class AuditTrail {
  private chain: AuditEntry[] = [];
  private genesisHash: string = '0'.repeat(64);

  append(agentId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, string> = {}): AuditEntry {
    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : this.genesisHash;

    const entry: AuditEntry = {
      sequence: this.chain.length,
      hash: '',
      previousHash,
      agentId, action, resourceType, resourceId,
      metadata, timestamp: Date.now(),
    };
    entry.hash = this.computeHash(entry);
    this.chain.push(entry);
    return entry;
  }

  verifyIntegrity(): { valid: boolean; brokenAt: number | null } {
    for (let i = 0; i < this.chain.length; i++) {
      const entry = this.chain[i];
      const expectedPrev = i > 0 ? this.chain[i - 1].hash : this.genesisHash;
      if (entry.previousHash !== expectedPrev) return { valid: false, brokenAt: i };
      const recomputed = this.computeHash({ ...entry, hash: '' });
      if (recomputed !== entry.hash) return { valid: false, brokenAt: i };
    }
    return { valid: true, brokenAt: null };
  }

  getEntriesByAgent(agentId: string): AuditEntry[] {
    return this.chain.filter(e => e.agentId === agentId);
  }

  getEntriesInRange(startTime: number, endTime: number): AuditEntry[] {
    return this.chain.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getLatest(count: number = 20): AuditEntry[] {
    return this.chain.slice(-count);
  }

  private computeHash(entry: Omit<AuditEntry, 'hash'> & { hash: string }): string {
    const data = entry.sequence + entry.previousHash + entry.agentId +
      entry.action + entry.resourceType + entry.resourceId +
      JSON.stringify(entry.metadata) + entry.timestamp;
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < data.length; i++) {
      h1 = Math.imul(h1 ^ data.charCodeAt(i), 0x01000193);
      h2 = Math.imul(h2 ^ data.charCodeAt(i), 0x811c9dc5);
    }
    return Math.abs(h1).toString(16).padStart(8, '0') + Math.abs(h2).toString(16).padStart(8, '0');
  }

  size(): number { return this.chain.length; }
}