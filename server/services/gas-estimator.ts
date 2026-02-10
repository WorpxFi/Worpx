type Chain = 'base' | 'ethereum' | 'polygon' | 'solana';
type TxPriority = 'low' | 'standard' | 'fast' | 'urgent';

interface GasEstimate {
  chain: Chain;
  baseFee: bigint;
  priorityFee: bigint;
  estimatedGas: bigint;
  totalCostWei: bigint;
  totalCostUsd: number;
  priority: TxPriority;
  timestamp: number;
}

interface FeeHistory {
  chain: Chain;
  block: number;
  baseFee: bigint;
  timestamp: number;
}

const PRIORITY_MULTIPLIERS: Record<TxPriority, number> = {
  low: 0.8,
  standard: 1.0,
  fast: 1.5,
  urgent: 2.5,
};

const BASE_GAS_LIMITS: Record<Chain, bigint> = {
  base: 21000n,
  ethereum: 21000n,
  polygon: 30000n,
  solana: 5000n,
};

export class GasEstimator {
  private feeHistory: FeeHistory[] = [];
  private ethPriceUsd: number = 3200;
  private chainPriceMap: Record<Chain, number> = {
    base: 3200, ethereum: 3200, polygon: 0.45, solana: 180,
  };

  updateFeeData(chain: Chain, block: number, baseFee: bigint): void {
    this.feeHistory.push({ chain, block, baseFee, timestamp: Date.now() });
    if (this.feeHistory.length > 5000) {
      this.feeHistory = this.feeHistory.slice(-2500);
    }
  }

  setTokenPrice(chain: Chain, priceUsd: number): void {
    this.chainPriceMap[chain] = priceUsd;
  }

  estimate(chain: Chain, gasUnits: bigint, priority: TxPriority = 'standard'): GasEstimate {
    const recentFees = this.feeHistory
      .filter(f => f.chain === chain)
      .slice(-50);

    let baseFee: bigint;
    if (recentFees.length > 0) {
      const sorted = recentFees.map(f => f.baseFee).sort((a, b) => (a < b ? -1 : 1));
      baseFee = sorted[Math.floor(sorted.length * 0.5)];
    } else {
      baseFee = BASE_GAS_LIMITS[chain] * 10n;
    }

    const multiplier = PRIORITY_MULTIPLIERS[priority];
    const priorityFee = BigInt(Math.floor(Number(baseFee) * (multiplier - 1)));
    const effectiveGasPrice = baseFee + priorityFee;
    const totalCostWei = effectiveGasPrice * gasUnits;
    const totalCostEth = Number(totalCostWei) / 1e18;
    const totalCostUsd = parseFloat((totalCostEth * this.chainPriceMap[chain]).toFixed(6));

    return {
      chain, baseFee, priorityFee, estimatedGas: gasUnits,
      totalCostWei, totalCostUsd, priority, timestamp: Date.now(),
    };
  }

  cheapestChain(gasUnits: bigint, priority: TxPriority = 'standard'): GasEstimate {
    const estimates = (['base', 'ethereum', 'polygon', 'solana'] as Chain[])
      .map(chain => this.estimate(chain, gasUnits, priority));
    return estimates.sort((a, b) => a.totalCostUsd - b.totalCostUsd)[0];
  }

  getAverageFee(chain: Chain, windowMs: number = 3600000): bigint {
    const cutoff = Date.now() - windowMs;
    const recent = this.feeHistory.filter(f => f.chain === chain && f.timestamp > cutoff);
    if (recent.length === 0) return 0n;
    const sum = recent.reduce((acc, f) => acc + f.baseFee, 0n);
    return sum / BigInt(recent.length);
  }
}