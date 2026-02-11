interface ObfuscatedPacket {
  id: string;
  payload: Uint8Array;
  paddedSize: number;
  originalSize: number;
  delay: number;
  decoyFlag: boolean;
  timestamp: number;
}

interface ObfuscationConfig {
  minPaddedSize: number;
  maxPaddedSize: number;
  minDelayMs: number;
  maxDelayMs: number;
  decoyRate: number;
}

export class TrafficObfuscator {
  private config: ObfuscationConfig;
  private packetLog: ObfuscatedPacket[] = [];
  private decoysSent: number = 0;

  constructor(config: Partial<ObfuscationConfig> = {}) {
    this.config = {
      minPaddedSize: config.minPaddedSize ?? 512,
      maxPaddedSize: config.maxPaddedSize ?? 4096,
      minDelayMs: config.minDelayMs ?? 50,
      maxDelayMs: config.maxDelayMs ?? 500,
      decoyRate: config.decoyRate ?? 0.2,
    };
  }

  padPayload(payload: Uint8Array): Uint8Array {
    const targetSize = this.randomInRange(
      Math.max(this.config.minPaddedSize, payload.byteLength),
      this.config.maxPaddedSize
    );
    const padded = new Uint8Array(targetSize);
    padded.set(payload, 0);
    for (let i = payload.byteLength; i < targetSize; i++) {
      padded[i] = Math.floor(Math.random() * 256);
    }
    return padded;
  }

  obfuscate(payload: Uint8Array): ObfuscatedPacket {
    const padded = this.padPayload(payload);
    const packet: ObfuscatedPacket = {
      id: crypto.randomUUID(),
      payload: padded,
      paddedSize: padded.byteLength,
      originalSize: payload.byteLength,
      delay: this.randomInRange(this.config.minDelayMs, this.config.maxDelayMs),
      decoyFlag: false,
      timestamp: Date.now(),
    };
    this.packetLog.push(packet);
    return packet;
  }

  generateDecoy(): ObfuscatedPacket {
    const size = this.randomInRange(this.config.minPaddedSize, this.config.maxPaddedSize);
    const decoyPayload = new Uint8Array(size);
    for (let i = 0; i < size; i++) decoyPayload[i] = Math.floor(Math.random() * 256);
    const packet: ObfuscatedPacket = {
      id: crypto.randomUUID(), payload: decoyPayload,
      paddedSize: size, originalSize: 0,
      delay: this.randomInRange(this.config.minDelayMs, this.config.maxDelayMs),
      decoyFlag: true, timestamp: Date.now(),
    };
    this.decoysSent++;
    this.packetLog.push(packet);
    return packet;

  }

  shouldInjectDecoy(): boolean {
    return Math.random() < this.config.decoyRate;
  }

  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getStats(): { totalPackets: number; decoys: number; avgPadding: number } {
    const real = this.packetLog.filter(p => !p.decoyFlag);
    const avgPadding = real.length > 0
      ? real.reduce((sum, p) => sum + (p.paddedSize - p.originalSize), 0) / real.length
      : 0;
    return { totalPackets: this.packetLog.length, decoys: this.decoysSent, avgPadding: Math.round(avgPadding) };
  }
}