interface RetryState {
  txId: string;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  lastError: string | null;
  status: 'retrying' | 'exhausted' | 'succeeded';
}

export class PaymentRetryManager {
  private states: Map<string, RetryState> = new Map();
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(baseDelayMs: number = 1000, maxDelayMs: number = 60000) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  register(txId: string, maxAttempts: number = 5): void {
    this.states.set(txId, { txId, attempts: 0, maxAttempts, nextRetry: Date.now(), lastError: null, status: 'retrying' });
  }

  recordFailure(txId: string, error: string): boolean {
    const s = this.states.get(txId);
    if (!s || s.status !== 'retrying') return false;
    s.attempts++;
    s.lastError = error;
    if (s.attempts >= s.maxAttempts) { s.status = 'exhausted'; return false; }
    const delay = Math.min(this.maxDelayMs, this.baseDelayMs * Math.pow(2, s.attempts));
    s.nextRetry = Date.now() + delay + Math.floor(Math.random() * delay * 0.1);
    return true;
  }

  recordSuccess(txId: string): void {
    const s = this.states.get(txId);
    if (s) s.status = 'succeeded';
  }

  getDueRetries(): RetryState[] {
    const now = Date.now();
    return Array.from(this.states.values()).filter(s => s.status === 'retrying' && now >= s.nextRetry);
  }

  getExhausted(): RetryState[] { return Array.from(this.states.values()).filter(s => s.status === 'exhausted'); }
}