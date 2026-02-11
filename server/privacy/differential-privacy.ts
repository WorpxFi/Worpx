interface NoiseConfig {
  epsilon: number;
  delta: number;
  sensitivity: number;
  mechanism: 'laplace' | 'gaussian' | 'exponential';
}

interface PrivateQuery {
  id: string;
  originalValue: number;
  noisyValue: number;
  epsilon: number;
  mechanism: string;
  timestamp: number;
}

export class DifferentialPrivacyEngine {
  private privacyBudget: Map<string, number> = new Map();
  private maxBudget: number;
  private queryLog: PrivateQuery[] = [];

  constructor(maxEpsilonBudget: number = 10.0) {
    this.maxBudget = maxEpsilonBudget;
  }

  addLaplaceNoise(value: number, config: NoiseConfig, queryId: string = ''): number {
    const spent = this.privacyBudget.get(queryId) ?? 0;
    if (spent + config.epsilon > this.maxBudget) {
      throw new Error('Privacy budget exhausted');
    }
    const scale = config.sensitivity / config.epsilon;
    const noise = this.sampleLaplace(scale);
    const noisyValue = value + noise;
    this.privacyBudget.set(queryId, spent + config.epsilon);
    this.logQuery(value, noisyValue, config.epsilon, 'laplace');
    return noisyValue;
  }

  addGaussianNoise(value: number, config: NoiseConfig, queryId: string = ''): number {
    const spent = this.privacyBudget.get(queryId) ?? 0;
    if (spent + config.epsilon > this.maxBudget) {
      throw new Error('Privacy budget exhausted');
    }
    const sigma = (config.sensitivity * Math.sqrt(2 * Math.log(1.25 / config.delta))) / config.epsilon;
    const noise = this.sampleGaussian(sigma);
    const noisyValue = value + noise;
    this.privacyBudget.set(queryId, spent + config.epsilon);
    this.logQuery(value, noisyValue, config.epsilon, 'gaussian');
    return noisyValue;
  }

  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private sampleGaussian(sigma: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private logQuery(original: number, noisy: number, epsilon: number, mechanism: string): void {
    this.queryLog.push({
      id: crypto.randomUUID(), originalValue: original,
      noisyValue: parseFloat(noisy.toFixed(4)),
      epsilon, mechanism, timestamp: Date.now(),
    });
  }

  getRemainingBudget(queryId: string): number {
    return this.maxBudget - (this.privacyBudget.get(queryId) ?? 0);
  }

  getQueryCount(): number { return this.queryLog.length; }
  getTotalEpsilonSpent(): number {
    let total = 0;
    for (const spent of this.privacyBudget.values()) total += spent;
    return total;
  }
}