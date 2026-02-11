interface MinimizationPolicy {
  id: string;
  resourceType: string;
  retainFields: string[];
  ttlMs: number;
  anonymizeAfter: number;
  purgeAfter: number;
}

interface StoredRecord {
  id: string;
  resourceType: string;
  data: Record<string, unknown>;
  createdAt: number;
  anonymizedAt: number | null;
  minimizedAt: number | null;
}

export class DataMinimizer {
  private policies: Map<string, MinimizationPolicy> = new Map();
  private records: Map<string, StoredRecord> = new Map();
  private purgedCount: number = 0;

  setPolicy(policy: MinimizationPolicy): void {
    this.policies.set(policy.resourceType, policy);
  }

  store(resourceType: string, data: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    this.records.set(id, {
      id, resourceType, data, createdAt: Date.now(),
      anonymizedAt: null, minimizedAt: null,
    });
    return id;
  }

  minimize(recordId: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;
    const policy = this.policies.get(record.resourceType);
    if (!policy) return false;

    const minimized: Record<string, unknown> = {};
    for (const field of policy.retainFields) {
      if (field in record.data) minimized[field] = record.data[field];
    }
    record.data = minimized;
    record.minimizedAt = Date.now();
    return true;
  }

  anonymize(recordId: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;
    for (const key of Object.keys(record.data)) {
      const val = record.data[key];
      if (typeof val === 'string') record.data[key] = this.hashValue(val);
      else if (typeof val === 'number') record.data[key] = 0;
    }
    record.anonymizedAt = Date.now();
    return true;
  }

  enforceAll(): { minimized: number; anonymized: number; purged: number } {
    const now = Date.now();
    let minimized = 0, anonymized = 0, purged = 0;

    for (const [id, record] of this.records) {
      const policy = this.policies.get(record.resourceType);
      if (!policy) continue;
      const age = now - record.createdAt;

      if (age >= policy.purgeAfter) {
        this.records.delete(id);
        purged++;
        this.purgedCount++;
      } else if (age >= policy.anonymizeAfter && !record.anonymizedAt) {
        this.anonymize(id);
        anonymized++;
      } else if (age >= policy.ttlMs && !record.minimizedAt) {
        this.minimize(id);
        minimized++;
      }
    }
    return { minimized, anonymized, purged };
  }

  private hashValue(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return 'anon_' + Math.abs(hash).toString(16);
  }

  getRecordCount(): number { return this.records.size; }
  getPurgedCount(): number { return this.purgedCount; }
}