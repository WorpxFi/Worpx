interface DiscoveryRecord {
  platformId: string;
  name: string;
  category: string;
  capabilities: string[];
  agentCount: number;
  avgLatency: number;
  trustScore: number;
  discoveredAt: number;
}

export class PlatformDiscovery {
  private discovered: Map<string, DiscoveryRecord> = new Map();

  register(platformId: string, name: string, category: string, capabilities: string[]): void {
    this.discovered.set(platformId, { platformId, name, category, capabilities, agentCount: 0, avgLatency: 0, trustScore: 50, discoveredAt: Date.now() });
  }

  updateMetrics(platformId: string, agentCount: number, avgLatency: number): void {
    const r = this.discovered.get(platformId);
    if (r) { r.agentCount = agentCount; r.avgLatency = avgLatency; }
  }

  adjustTrust(platformId: string, delta: number): void {
    const r = this.discovered.get(platformId);
    if (r) r.trustScore = Math.max(0, Math.min(100, r.trustScore + delta));
  }

  search(query: { category?: string; capability?: string; minTrust?: number }): DiscoveryRecord[] {
    let results = Array.from(this.discovered.values());
    if (query.category) results = results.filter(r => r.category === query.category);
    if (query.capability) results = results.filter(r => r.capabilities.includes(query.capability!));
    if (query.minTrust) results = results.filter(r => r.trustScore >= query.minTrust!);
    return results.sort((a, b) => b.trustScore - a.trustScore);
  }

  getTopPlatforms(limit: number = 10): DiscoveryRecord[] {
    return Array.from(this.discovered.values()).sort((a, b) => b.trustScore - a.trustScore).slice(0, limit);
  }

  getCount(): number { return this.discovered.size; }
}