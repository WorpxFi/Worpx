interface SecretShare {
  shareIndex: number;
  shareValue: bigint;
  threshold: number;
  totalShares: number;
  secretId: string;
}

interface SplitResult {
  secretId: string;
  shares: SecretShare[];
  threshold: number;
}

export class ShamirSecretSharing {
  private prime: bigint = (1n << 127n) - 1n;

  split(secret: bigint, totalShares: number, threshold: number): SplitResult {
    if (threshold > totalShares) throw new Error('Threshold exceeds total shares');
    if (threshold < 2) throw new Error('Threshold must be at least 2');

    const coefficients: bigint[] = [secret];
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.randomCoefficient());
    }

    const secretId = crypto.randomUUID();
    const shares: SecretShare[] = [];
    for (let x = 1; x <= totalShares; x++) {
      const value = this.evaluatePolynomial(coefficients, BigInt(x));
      shares.push({ shareIndex: x, shareValue: value, threshold, totalShares, secretId });
    }
    return { secretId, shares, threshold };
  }

  reconstruct(shares: SecretShare[]): bigint {
    if (shares.length < shares[0].threshold) {
      throw new Error('Insufficient shares for reconstruction');
    }
    const selected = shares.slice(0, shares[0].threshold);
    let secret = 0n;

    for (let i = 0; i < selected.length; i++) {
      let numerator = 1n, denominator = 1n;
      const xi = BigInt(selected[i].shareIndex);

      for (let j = 0; j < selected.length; j++) {
        if (i === j) continue;
        const xj = BigInt(selected[j].shareIndex);
        numerator = this.modMul(numerator, -xj);
        denominator = this.modMul(denominator, xi - xj);
      }

      const lagrange = this.modMul(selected[i].shareValue, this.modMul(numerator, this.modInverse(denominator)));
      secret = this.modAdd(secret, lagrange);
    }
    return ((secret % this.prime) + this.prime) % this.prime;
  }

  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = 0n;
    let power = 1n;
    for (const coeff of coefficients) {
      result = this.modAdd(result, this.modMul(coeff, power));
      power = this.modMul(power, x);
    }
    return result;
  }

  private modAdd(a: bigint, b: bigint): bigint {
    return ((a + b) % this.prime + this.prime) % this.prime;
  }

  private modMul(a: bigint, b: bigint): bigint {
    return ((a % this.prime) * (b % this.prime) % this.prime + this.prime) % this.prime;
  }

  private modInverse(a: bigint): bigint {
    return this.modPow(((a % this.prime) + this.prime) % this.prime, this.prime - 2n);
  }

  private modPow(base: bigint, exp: bigint): bigint {
    let result = 1n;
    base = ((base % this.prime) + this.prime) % this.prime;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % this.prime;
      exp >>= 1n;
      base = (base * base) % this.prime;
    }
    return result;
  }

  private randomCoefficient(): bigint {
    let val = 0n;
    for (let i = 0; i < 16; i++) val = (val << 8n) | BigInt(Math.floor(Math.random() * 256));
    return val % this.prime;
  }
}