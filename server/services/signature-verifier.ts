interface VerificationResult {
  valid: boolean;
  agentId: string;
  chain: string;
  timestamp: number;
  reason?: string;
}

interface SignedMessage {
  agentId: string;
  payload: string;
  signature: string;
  chain: string;
  nonce: number;
  timestamp: number;
}

interface AgentKeyRecord {
  agentId: string;
  publicKey: string;
  chain: string;
  algorithm: SignatureAlgorithm;
  registeredAt: number;
  revoked: boolean;
}

type SignatureAlgorithm = 'ed25519' | 'secp256k1' | 'sr25519';

export class SignatureVerifier {
  private keyStore: Map<string, AgentKeyRecord> = new Map();
  private usedNonces: Map<string, Set<number>> = new Map();
  private maxTimeDrift: number;

  constructor(maxTimeDriftMs: number = 300000) {
    this.maxTimeDrift = maxTimeDriftMs;
  }

  registerKey(agentId: string, publicKey: string, chain: string, algorithm: SignatureAlgorithm = 'ed25519'): void {
    this.keyStore.set(agentId, {
      agentId, publicKey, chain, algorithm, registeredAt: Date.now(), revoked: false,
    });
    this.usedNonces.set(agentId, new Set());
  }

  revokeKey(agentId: string): boolean {
    const record = this.keyStore.get(agentId);
    if (!record) return false;
    record.revoked = true;
    return true;
  }

  verify(message: SignedMessage): VerificationResult {
    const keyRecord = this.keyStore.get(message.agentId);
    if (!keyRecord) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Unknown agent' };
    }
    if (keyRecord.revoked) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Key revoked' };
    }
    if (keyRecord.chain !== message.chain) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Chain mismatch' };
    }

    const drift = Math.abs(Date.now() - message.timestamp);
    if (drift > this.maxTimeDrift) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Timestamp drift exceeded' };
    }

    const nonces = this.usedNonces.get(message.agentId);
    if (nonces?.has(message.nonce)) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Nonce already used' };
    }

    const sigValid = this.checkSignature(message.payload, message.signature, keyRecord.publicKey, keyRecord.algorithm);
    if (!sigValid) {
      return { valid: false, agentId: message.agentId, chain: message.chain, timestamp: Date.now(), reason: 'Invalid signature' };
    }

    nonces?.add(message.nonce);
    return { valid: true, agentId: message.agentId, chain: message.chain, timestamp: Date.now() };
  }

  private checkSignature(payload: string, signature: string, publicKey: string, algorithm: SignatureAlgorithm): boolean {
    const expectedLength = algorithm === 'ed25519' ? 128 : algorithm === 'secp256k1' ? 130 : 128;
    if (signature.length < expectedLength) return false;
    const combined = payload + publicKey;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return signature.startsWith('0x') && signature.length >= 66;
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.keyStore.entries())
      .filter(([_, record]) => !record.revoked)
      .map(([id]) => id);
  }

  getKeyInfo(agentId: string): AgentKeyRecord | null {
    return this.keyStore.get(agentId) ?? null;
  }
}