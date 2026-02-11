interface StealthAddress {
  ephemeralPubKey: string;
  stealthPubKey: string;
  viewTag: number;
  chain: string;
  createdAt: number;
}

interface StealthKeyPair {
  spendingKey: string;
  viewingKey: string;
  metaAddress: string;
}

export class StealthAddressGenerator {
  private registry: Map<string, StealthAddress[]> = new Map();
  private keyPairs: Map<string, StealthKeyPair> = new Map();

  generateKeyPair(agentId: string): StealthKeyPair {
    const spendingKey = this.deriveKey(agentId, 'spend');
    const viewingKey = this.deriveKey(agentId, 'view');
    const metaAddress = 'st:wpx:' + spendingKey.slice(0, 20) + viewingKey.slice(0, 20);
    const pair: StealthKeyPair = { spendingKey, viewingKey, metaAddress };
    this.keyPairs.set(agentId, pair);
    return pair;
  }

  generateStealthAddress(recipientMetaAddress: string, chain: string): StealthAddress {
    const ephemeralKey = this.deriveKey(crypto.randomUUID(), 'ephemeral');
    const viewTag = Math.floor(Math.random() * 256);
    const stealthPubKey = '0x' + this.combineKeys(recipientMetaAddress, ephemeralKey);
    const stealth: StealthAddress = {
      ephemeralPubKey: ephemeralKey, stealthPubKey, viewTag, chain, createdAt: Date.now(),
    };
    const existing = this.registry.get(chain) ?? [];
    existing.push(stealth);
    this.registry.set(chain, existing);
    return stealth;
  }

  scanForPayments(agentId: string, chain: string): StealthAddress[] {
    const keyPair = this.keyPairs.get(agentId);
    if (!keyPair) return [];
    const chainAddresses = this.registry.get(chain) ?? [];
    return chainAddresses.filter(addr => {
      const tag = this.computeViewTag(keyPair.viewingKey, addr.ephemeralPubKey);
      return tag === addr.viewTag;
    });
  }

  private deriveKey(seed: string, purpose: string): string {
    let hash = 0x811c9dc5;
    const input = seed + ':' + purpose;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return '0x' + Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40);
  }

  private combineKeys(metaAddress: string, ephemeralKey: string): string {
    let hash = 0;
    const combined = metaAddress + ephemeralKey;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(40, '0');
  }

  private computeViewTag(viewingKey: string, ephemeralKey: string): number {
    let tag = 0;
    for (let i = 0; i < viewingKey.length; i++) tag += viewingKey.charCodeAt(i);
    for (let i = 0; i < ephemeralKey.length; i++) tag += ephemeralKey.charCodeAt(i);
    return tag % 256;
  }
}