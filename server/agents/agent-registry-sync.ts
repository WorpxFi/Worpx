interface RegistryEntry {
  agentId: string;
  chain: string;
  onChainAddress: string;
  registeredBlock: number;
  synced: boolean;
  syncedAt: number | null;
}

export class AgentRegistrySync {
  private entries: Map<string, RegistryEntry[]> = new Map();
  private syncLog: { agentId: string; fromChain: string; toChain: string; timestamp: number }[] = [];

  registerOnChain(agentId: string, chain: string, address: string, block: number): void {
    const existing = this.entries.get(agentId) ?? [];
    existing.push({ agentId, chain, onChainAddress: address, registeredBlock: block, synced: false, syncedAt: null });
    this.entries.set(agentId, existing);
  }

  sync(agentId: string, fromChain: string, toChain: string): boolean {
    const entries = this.entries.get(agentId);
    if (!entries) return false;
    const source = entries.find(e => e.chain === fromChain);
    if (!source) return false;
    const targetExists = entries.find(e => e.chain === toChain);
    if (targetExists) { targetExists.synced = true; targetExists.syncedAt = Date.now(); }
    else { entries.push({ agentId, chain: toChain, onChainAddress: source.onChainAddress, registeredBlock: 0, synced: true, syncedAt: Date.now() }); }
    this.syncLog.push({ agentId, fromChain, toChain, timestamp: Date.now() });
    return true;
  }

  getChains(agentId: string): string[] { return (this.entries.get(agentId) ?? []).map(e => e.chain); }
  isMultiChain(agentId: string): boolean { return (this.entries.get(agentId) ?? []).length > 1; }
  getUnsyncedAgents(): string[] {
    const result: string[] = [];
    for (const [id, entries] of this.entries) { if (entries.some(e => !e.synced)) result.push(id); }
    return result;
  }
}