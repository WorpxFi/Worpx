interface PriceFeed {
  token: string;
  priceUsd: number;
  updatedAt: number;
}

export class CurrencyConverter {
  private feeds: Map<string, PriceFeed> = new Map();

  updatePrice(token: string, priceUsd: number): void {
    this.feeds.set(token, { token, priceUsd, updatedAt: Date.now() });
  }

  convert(fromToken: string, toToken: string, amount: number): { result: number; rate: number } {
    const from = this.feeds.get(fromToken);
    const to = this.feeds.get(toToken);
    if (!from || !to) throw new Error('Missing price feed');
    const rate = from.priceUsd / to.priceUsd;
    return { result: parseFloat((amount * rate).toFixed(8)), rate: parseFloat(rate.toFixed(8)) };
  }

  getUsdValue(token: string, amount: number): number {
    const feed = this.feeds.get(token);
    if (!feed) throw new Error('No price feed for ' + token);
    return parseFloat((amount * feed.priceUsd).toFixed(2));
  }

  getAllPrices(): PriceFeed[] { return Array.from(this.feeds.values()); }

  isStale(token: string, maxAgeMs: number = 300000): boolean {
    const feed = this.feeds.get(token);
    return !feed || Date.now() - feed.updatedAt > maxAgeMs;
  }
}