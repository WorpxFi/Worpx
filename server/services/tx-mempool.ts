interface MempoolEntry {
  id: string;
  fromAgent: string;
  toAgent: string;
  amount: string;
  token: string;
  chain: string;
  priority: number;
  gasPrice: bigint;
  nonce: number;
  payload: string;
  addedAt: number;
  attempts: number;
  lastAttempt: number | null;
}

interface MempoolStats {
  size: number;
  oldestEntryAge: number;
  avgPriority: number;
  byChain: Record<string, number>;
}

export class TransactionMempool {
  private entries: Map<string, MempoolEntry> = new Map();
  private seen: Set<string> = new Set();
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize: number = 10000, maxAgeMs: number = 600000) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  private deduplicationKey(entry: Pick<MempoolEntry, 'fromAgent' | 'toAgent' | 'nonce' | 'chain'>): string {
    return `${entry.fromAgent}:${entry.toAgent}:${entry.chain}:${entry.nonce}`;
  }

  add(entry: Omit<MempoolEntry, 'id' | 'addedAt' | 'attempts' | 'lastAttempt'>): string | null {
    const dedupKey = this.deduplicationKey(entry);
    if (this.seen.has(dedupKey)) return null;
    if (this.entries.size >= this.maxSize) this.evictLowest();

    const id = crypto.randomUUID();
    this.entries.set(id, { ...entry, id, addedAt: Date.now(), attempts: 0, lastAttempt: null });
    this.seen.add(dedupKey);
    return id;
  }

  popHighestPriority(count: number = 1): MempoolEntry[] {
    const sorted = Array.from(this.entries.values())
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return Number(b.gasPrice - a.gasPrice);
      });

    const batch = sorted.slice(0, count);
    for (const entry of batch) {
      this.entries.delete(entry.id);
    }
    return batch;
  }

  markAttempt(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.attempts++;
    entry.lastAttempt = Date.now();
    return true;
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  private evictLowest(): void {
    let lowest: MempoolEntry | null = null;
    for (const entry of this.entries.values()) {
      if (!lowest || entry.priority < lowest.priority) lowest = entry;
    }
    if (lowest) this.entries.delete(lowest.id);
  }

  pruneExpired(): number {
    const cutoff = Date.now() - this.maxAge;
    let pruned = 0;
    for (const [id, entry] of this.entries) {
      if (entry.addedAt < cutoff) {
        this.entries.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  getStats(): MempoolStats {
    const entries = Array.from(this.entries.values());
    const now = Date.now();
    const byChain: Record<string, number> = {};
    let prioritySum = 0;
    let oldest = now;

    for (const e of entries) {
      byChain[e.chain] = (byChain[e.chain] ?? 0) + 1;
      prioritySum += e.priority;
      if (e.addedAt < oldest) oldest = e.addedAt;
    }

    return {
      size: entries.length,
      oldestEntryAge: entries.length > 0 ? now - oldest : 0,
      avgPriority: entries.length > 0 ? prioritySum / entries.length : 0,
      byChain,
    };
  }

  getByAgent(agentId: string): MempoolEntry[] {
    return Array.from(this.entries.values()).filter(e => e.fromAgent === agentId);
  }
}