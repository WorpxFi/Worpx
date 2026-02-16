interface TrustEdge {
  from: string;
  to: string;
  trustScore: number;
  endorsements: number;
  attestations: string[];
  lastInteraction: number;
}

interface TrustQuery {
  agentId: string;
  directTrust: number;
  networkTrust: number;
  endorsementCount: number;
  trustedBy: number;
}

export class AgentTrustNetwork {
  private edges: Map<string, TrustEdge> = new Map();

  private key(from: string, to: string): string { return from + '->' + to; }

  endorse(from: string, to: string, attestation: string): void {
    const k = this.key(from, to);
    const edge = this.edges.get(k) ?? { from, to, trustScore: 0, endorsements: 0, attestations: [], lastInteraction: 0 };
    edge.endorsements++;
    edge.attestations.push(attestation);
    edge.trustScore = Math.min(100, edge.trustScore + 5);
    edge.lastInteraction = Date.now();
    this.edges.set(k, edge);
  }

  penalize(from: string, to: string, amount: number = 10): void {
    const k = this.key(from, to);
    const edge = this.edges.get(k);
    if (edge) {
      edge.trustScore = Math.max(0, edge.trustScore - amount);
      edge.lastInteraction = Date.now();
    }
  }

  getDirectTrust(from: string, to: string): number {
    return this.edges.get(this.key(from, to))?.trustScore ?? 0;
  }

  getNetworkTrust(agentId: string): TrustQuery {
    const incoming = Array.from(this.edges.values()).filter(e => e.to === agentId);
    const directTrust = incoming.length > 0 ? incoming.reduce((s, e) => s + e.trustScore, 0) / incoming.length : 0;
    const totalEndorsements = incoming.reduce((s, e) => s + e.endorsements, 0);
    const networkTrust = Math.min(100, directTrust * 0.7 + Math.min(30, totalEndorsements * 2));
    return { agentId, directTrust: Math.round(directTrust), networkTrust: Math.round(networkTrust), endorsementCount: totalEndorsements, trustedBy: incoming.length };
  }

  getMostTrusted(limit: number = 10): TrustQuery[] {
    const agentIds = new Set<string>();
    for (const e of this.edges.values()) { agentIds.add(e.to); agentIds.add(e.from); }
    return Array.from(agentIds).map(id => this.getNetworkTrust(id)).sort((a, b) => b.networkTrust - a.networkTrust).slice(0, limit);
  }

  getEndorsements(agentId: string): TrustEdge[] {
    return Array.from(this.edges.values()).filter(e => e.to === agentId);
  }
}