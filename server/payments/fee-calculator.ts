type Chain = 'base' | 'ethereum' | 'polygon' | 'solana';

interface FeeSchedule {
  chain: Chain;
  baseFeePercent: number;
  minFee: number;
  maxFee: number;
  congestionMultiplier: number;
}

export class FeeCalculator {
  private schedules: Map<Chain, FeeSchedule> = new Map();

  constructor() {
    this.setSchedule({ chain: 'base', baseFeePercent: 0.1, minFee: 0.001, maxFee: 50, congestionMultiplier: 1.0 });
    this.setSchedule({ chain: 'ethereum', baseFeePercent: 0.15, minFee: 0.01, maxFee: 100, congestionMultiplier: 1.0 });
    this.setSchedule({ chain: 'polygon', baseFeePercent: 0.05, minFee: 0.0001, maxFee: 20, congestionMultiplier: 1.0 });
    this.setSchedule({ chain: 'solana', baseFeePercent: 0.03, minFee: 0.00001, maxFee: 10, congestionMultiplier: 1.0 });
  }

  setSchedule(schedule: FeeSchedule): void { this.schedules.set(schedule.chain, schedule); }

  setCongestion(chain: Chain, multiplier: number): void {
    const s = this.schedules.get(chain);
    if (s) s.congestionMultiplier = multiplier;
  }

  calculate(chain: Chain, amount: number): { fee: number; effectiveRate: number } {
    const s = this.schedules.get(chain);
    if (!s) throw new Error('Unknown chain');
    const rawFee = amount * (s.baseFeePercent / 100) * s.congestionMultiplier;
    const fee = Math.min(s.maxFee, Math.max(s.minFee, rawFee));
    return { fee: parseFloat(fee.toFixed(6)), effectiveRate: parseFloat(((fee / amount) * 100).toFixed(4)) };
  }

  cheapestChain(amount: number): { chain: Chain; fee: number } {
    let best: { chain: Chain; fee: number } | null = null;
    for (const chain of this.schedules.keys()) {
      const { fee } = this.calculate(chain, amount);
      if (!best || fee < best.fee) best = { chain, fee };
    }
    return best!;
  }
}