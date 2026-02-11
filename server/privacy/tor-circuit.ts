interface CircuitNode {
  nodeId: string;
  address: string;
  publicKey: string;
  bandwidth: number;
  isExit: boolean;
  isGuard: boolean;
  lastSeen: number;
}

interface Circuit {
  id: string;
  nodes: CircuitNode[];
  createdAt: number;
  expiresAt: number;
  bytesRelayed: number;
  status: 'building' | 'open' | 'closed' | 'failed';
}

export class OnionCircuitBuilder {
  private directory: Map<string, CircuitNode> = new Map();
  private circuits: Map<string, Circuit> = new Map();
  private circuitTtl: number;

  constructor(circuitTtlMs: number = 600000) {
    this.circuitTtl = circuitTtlMs;
  }

  addNode(node: CircuitNode): void {
    this.directory.set(node.nodeId, { ...node, lastSeen: Date.now() });
  }

  buildCircuit(hopCount: number = 3): Circuit {
    const guards = this.getNodesByRole('guard');
    const middles = this.getNodesByRole('middle');
    const exits = this.getNodesByRole('exit');
    if (!guards.length || !exits.length) throw new Error('Insufficient nodes');

    const selected: CircuitNode[] = [];
    selected.push(guards[Math.floor(Math.random() * guards.length)]);
    const middleCount = Math.max(0, hopCount - 2);
    const shuffled = middles.sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, middleCount));
    selected.push(exits[Math.floor(Math.random() * exits.length)]);

    const circuit: Circuit = {
      id: crypto.randomUUID(), nodes: selected,
      createdAt: Date.now(), expiresAt: Date.now() + this.circuitTtl,
      bytesRelayed: 0, status: 'open',
    };
    this.circuits.set(circuit.id, circuit);
    return circuit;
  }

  relay(circuitId: string, payloadSize: number): boolean {
    const circuit = this.circuits.get(circuitId);
    if (!circuit || circuit.status !== 'open') return false;
    if (Date.now() > circuit.expiresAt) { circuit.status = 'closed'; return false; }
    circuit.bytesRelayed += payloadSize;
    return true;
  }

  closeCircuit(circuitId: string): boolean {
    const circuit = this.circuits.get(circuitId);
    if (!circuit) return false;
    circuit.status = 'closed';
    return true;
  }

  private getNodesByRole(role: 'guard' | 'exit' | 'middle'): CircuitNode[] {
    return Array.from(this.directory.values()).filter(n => {
      if (role === 'guard') return n.isGuard;
      if (role === 'exit') return n.isExit;
      return !n.isGuard && !n.isExit;
    });
  }

  cleanupExpired(): number {
    let closed = 0;
    for (const circuit of this.circuits.values()) {
      if (circuit.status === 'open' && Date.now() > circuit.expiresAt) {
        circuit.status = 'closed';
        closed++;
      }
    }
    return closed;
  }

  getActiveCircuits(): Circuit[] {
    return Array.from(this.circuits.values()).filter(c => c.status === 'open');
  }

  getDirectorySize(): number { return this.directory.size; }
}