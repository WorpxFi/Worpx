interface BatchedPayment {
  fromAgent: string;
  toAgent: string;
  amount: string;
  token: string;
}

interface PaymentBatch {
  id: string;
  payments: BatchedPayment[];
  chain: string;
  status: 'collecting' | 'submitted' | 'confirmed';
  totalAmount: string;
  createdAt: number;
  submittedAt: number | null;
}

export class PaymentBatcher {
  private batches: Map<string, PaymentBatch> = new Map();
  private currentBatch: string | null = null;
  private maxBatchSize: number;

  constructor(maxBatchSize: number = 100) { this.maxBatchSize = maxBatchSize; }

  addPayment(payment: BatchedPayment, chain: string): string {
    if (!this.currentBatch) {
      const id = crypto.randomUUID();
      this.batches.set(id, { id, payments: [], chain, status: 'collecting', totalAmount: '0', createdAt: Date.now(), submittedAt: null });
      this.currentBatch = id;
    }
    const batch = this.batches.get(this.currentBatch)!;
    batch.payments.push(payment);
    batch.totalAmount = batch.payments.reduce((s, p) => s + parseFloat(p.amount), 0).toFixed(6);
    if (batch.payments.length >= this.maxBatchSize) this.seal();
    return this.currentBatch;
  }

  seal(): string | null {
    if (!this.currentBatch) return null;
    const id = this.currentBatch;
    this.currentBatch = null;
    return id;
  }

  submit(batchId: string): boolean {
    const b = this.batches.get(batchId);
    if (!b || b.status !== 'collecting') return false;
    b.status = 'submitted'; b.submittedAt = Date.now(); return true;
  }

  confirm(batchId: string): boolean {
    const b = this.batches.get(batchId);
    if (!b || b.status !== 'submitted') return false;
    b.status = 'confirmed'; return true;
  }

  getPending(): PaymentBatch[] { return Array.from(this.batches.values()).filter(b => b.status === 'collecting'); }
}