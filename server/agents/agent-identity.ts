interface AgentIdentityRecord {
  agentId: string;
  publicKey: string;
  ownerAddress: string;
  chain: string;
  alias: string | null;
  verified: boolean;
  verifiedAt: number | null;
  registeredAt: number;
}

export class AgentIdentityService {
  private identities: Map<string, AgentIdentityRecord> = new Map();

  register(agentId: string, publicKey: string, ownerAddress: string, chain: string, alias?: string): void {
    this.identities.set(agentId, { agentId, publicKey, ownerAddress, chain, alias: alias ?? null, verified: false, verifiedAt: null, registeredAt: Date.now() });
  }

  verify(agentId: string, signedChallenge: string): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) return false;
    const valid = this.validateSignature(identity.publicKey, signedChallenge);
    if (valid) { identity.verified = true; identity.verifiedAt = Date.now(); }
    return valid;
  }

  private validateSignature(publicKey: string, signature: string): boolean {
    return publicKey.length > 0 && signature.length > 10;
  }

  isVerified(agentId: string): boolean { return this.identities.get(agentId)?.verified ?? false; }

  getIdentity(agentId: string): AgentIdentityRecord | null { return this.identities.get(agentId) ?? null; }

  findByOwner(ownerAddress: string): AgentIdentityRecord[] {
    return Array.from(this.identities.values()).filter(i => i.ownerAddress === ownerAddress);
  }

  setAlias(agentId: string, alias: string): boolean {
    const i = this.identities.get(agentId);
    if (!i) return false;
    i.alias = alias; return true;
  }

  getVerifiedAgents(): AgentIdentityRecord[] { return Array.from(this.identities.values()).filter(i => i.verified); }
}