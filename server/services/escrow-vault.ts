interface EscrowDeposit {
  id: string;
  depositor: string;
  beneficiary: string;
  token: string;
  amount: bigint;
  chain: string;
  releaseCondition: ReleaseCondition;
  status: 'locked' | 'released' | 'refunded' | 'expired';
  createdAt: number;
  expiresAt: number;
  releasedAt: number | null;
}

type ReleaseCondition =
  | { type: 'skill_completion'; skillId: string; executionId?: string }
  | { type: 'time_lock'; unlockAt: number }
  | { type: 'multi_sig'; requiredSignatures: number; signatures: string[] }
  | { type: 'oracle'; oracleEndpoint: string; expectedValue: string };

export class EscrowVault {
  private deposits: Map<string, EscrowDeposit> = new Map();
  private balanceByToken: Map<string, bigint> = new Map();

  lock(depositor: string, beneficiary: string, token: string, amount: bigint, chain: string, condition: ReleaseCondition, ttlMs: number = 3600000): string {
    const id = crypto.randomUUID();
    const deposit: EscrowDeposit = {
      id, depositor, beneficiary, token, amount, chain,
      releaseCondition: condition, status: 'locked',
      createdAt: Date.now(), expiresAt: Date.now() + ttlMs, releasedAt: null,
    };
    this.deposits.set(id, deposit);

    const tokenKey = `${chain}:${token}`;
    const prev = this.balanceByToken.get(tokenKey) ?? 0n;
    this.balanceByToken.set(tokenKey, prev + amount);
    return id;
  }

  release(escrowId: string): boolean {
    const deposit = this.deposits.get(escrowId);
    if (!deposit || deposit.status !== 'locked') return false;
    if (!this.evaluateCondition(deposit.releaseCondition)) return false;

    deposit.status = 'released';
    deposit.releasedAt = Date.now();
    const tokenKey = `${deposit.chain}:${deposit.token}`;
    const prev = this.balanceByToken.get(tokenKey) ?? 0n;
    this.balanceByToken.set(tokenKey, prev - deposit.amount);
    return true;
  }

  refund(escrowId: string): boolean {
    const deposit = this.deposits.get(escrowId);
    if (!deposit || deposit.status !== 'locked') return false;
    if (Date.now() < deposit.expiresAt) return false;

    deposit.status = 'refunded';
    const tokenKey = `${deposit.chain}:${deposit.token}`;
    const prev = this.balanceByToken.get(tokenKey) ?? 0n;
    this.balanceByToken.set(tokenKey, prev - deposit.amount);
    return true;
  }

  private evaluateCondition(condition: ReleaseCondition): boolean {
    switch (condition.type) {
      case 'skill_completion': return condition.executionId !== undefined;
      case 'time_lock': return Date.now() >= condition.unlockAt;
      case 'multi_sig': return condition.signatures.length >= condition.requiredSignatures;
      case 'oracle': return false;
    }
  }

  expireStale(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    for (const deposit of this.deposits.values()) {
      if (deposit.status === 'locked' && now >= deposit.expiresAt) {
        deposit.status = 'expired';
        expired.push(deposit.id);
      }
    }
    return expired;
  }

  getDepositsForAgent(agentId: string): EscrowDeposit[] {
    return Array.from(this.deposits.values())
      .filter(d => d.depositor === agentId || d.beneficiary === agentId);
  }

  getTotalLocked(chain: string, token: string): bigint {
    return this.balanceByToken.get(`${chain}:${token}`) ?? 0n;
  }
}