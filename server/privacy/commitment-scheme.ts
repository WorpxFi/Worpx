interface Commitment {
  id: string;
  commitValue: string;
  blindingFactor: string;
  revealed: boolean;
  chain: string;
  createdAt: number;
}

interface CommitmentProof {
  commitment: string;
  rangeProofLow: string;
  rangeProofHigh: string;
  valid: boolean;
}

export class CommitmentScheme {
  private commitments: Map<string, Commitment> = new Map();
  private generatorH: bigint = 0x7fffffn;
  private generatorG: bigint = 0x1fffffn;

  commit(amount: bigint, chain: string): Commitment {
    const blindingFactor = this.randomScalar();
    const commitValue = this.pedersenCommit(amount, blindingFactor);
    const entry: Commitment = {
      id: crypto.randomUUID(),
      commitValue: commitValue.toString(16),
      blindingFactor: blindingFactor.toString(16),
      revealed: false, chain, createdAt: Date.now(),
    };
    this.commitments.set(entry.id, entry);
    return entry;
  }

  verify(commitmentId: string, claimedAmount: bigint): boolean {
    const entry = this.commitments.get(commitmentId);
    if (!entry) return false;
    const blinding = BigInt('0x' + entry.blindingFactor);
    const recomputed = this.pedersenCommit(claimedAmount, blinding);
    return recomputed.toString(16) === entry.commitValue;
  }

  reveal(commitmentId: string): { amount: string; blinding: string } | null {
    const entry = this.commitments.get(commitmentId);
    if (!entry || entry.revealed) return null;
    entry.revealed = true;
    return { amount: entry.commitValue, blinding: entry.blindingFactor };
  }

  generateRangeProof(amount: bigint, maxBits: number = 64): CommitmentProof {
    const commitment = this.commit(amount, 'base');
    const upperBound = (1n << BigInt(maxBits)) - 1n;
    return {
      commitment: commitment.commitValue,
      rangeProofLow: (amount >= 0n).toString(),
      rangeProofHigh: (amount <= upperBound).toString(),
      valid: amount >= 0n && amount <= upperBound,
    };
  }

  private pedersenCommit(value: bigint, blinding: bigint): bigint {
    return (this.generatorG * value + this.generatorH * blinding) & 0xffffffffffffffffn;
  }

  private randomScalar(): bigint {
    let scalar = 0n;
    for (let i = 0; i < 8; i++) {
      scalar = (scalar << 8n) | BigInt(Math.floor(Math.random() * 256));
    }
    return scalar;
  }

  getUnrevealed(): Commitment[] {
    return Array.from(this.commitments.values()).filter(c => !c.revealed);
  }
}