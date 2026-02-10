interface SettlementBatch {
  id: string;
  channelId: string;
  entries: SettlementEntry[];
  totalAmount: string;
  chain: 'base' | 'ethereum' | 'polygon' | 'solana';
  status: 'pending' | 'processing' | 'finalized' | 'failed';
  createdAt: number;
  finalizedAt: number | null;
}

interface SettlementEntry {
  fromAgentId: string;
  toAgentId: string;
  amount: string;
  token: string;
  nonce: number;
  signature: string;
}

interface SettlementConfig {
  batchSize: number;
  confirmations: number;
  maxRetries: number;
  settlementInterval: number;
}

export class AgentSettlementEngine {
  private batches: Map<string, SettlementBatch>;
  private pendingEntries: SettlementEntry[];
  private config: SettlementConfig;

  constructor(config: Partial<SettlementConfig> = {}) {
    this.batches = new Map();
    this.pendingEntries = [];
    this.config = {
      batchSize: config.batchSize ?? 50,
      confirmations: config.confirmations ?? 12,
      maxRetries: config.maxRetries ?? 3,
      settlementInterval: config.settlementInterval ?? 30000,
    };
  }

  queueEntry(entry: SettlementEntry): void {
    this.pendingEntries.push(entry);
    if (this.pendingEntries.length >= this.config.batchSize) {
      this.flushBatch('base');
    }
  }

  flushBatch(chain: SettlementBatch['chain']): SettlementBatch {
    const entries = this.pendingEntries.splice(0, this.config.batchSize);
    const totalAmount = entries
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)
      .toFixed(6);

    const batch: SettlementBatch = {
      id: crypto.randomUUID(),
      channelId: entries[0]?.fromAgentId ?? '',
      entries,
      totalAmount,
      chain,
      status: 'pending',
      createdAt: Date.now(),
      finalizedAt: null,
    };

    this.batches.set(batch.id, batch);
    return batch;
  }

  finalizeBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'processing') return false;
    batch.status = 'finalized';
    batch.finalizedAt = Date.now();
    return true;
  }

  computeNetSettlement(entries: SettlementEntry[]): Map<string, number> {
    const balances = new Map<string, number>();
    for (const entry of entries) {
      const amount = parseFloat(entry.amount);
      balances.set(entry.fromAgentId, (balances.get(entry.fromAgentId) ?? 0) - amount);
      balances.set(entry.toAgentId, (balances.get(entry.toAgentId) ?? 0) + amount);
    }
    return balances;
  }

  getPendingCount(): number {
    return this.pendingEntries.length;
  }

  getBatchesByStatus(status: SettlementBatch['status']): SettlementBatch[] {
    return Array.from(this.batches.values()).filter(b => b.status === status);
  }
}
