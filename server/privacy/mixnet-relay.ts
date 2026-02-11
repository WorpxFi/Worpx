interface MixMessage {
  id: string;
  layers: EncryptedLayer[];
  currentHop: number;
  totalHops: number;
  injectedAt: number;
  deliveredAt: number | null;
}

interface EncryptedLayer {
  encryptedPayload: string;
  nextRelay: string;
  delay: number;
}

interface MixNode {
  id: string;
  publicKey: string;
  capacity: number;
  currentLoad: number;
  uptime: number;
}

export class MixnetRelay {
  private nodes: Map<string, MixNode> = new Map();
  private messagePool: Map<string, MixMessage> = new Map();
  private processedCount: number = 0;

  registerNode(id: string, publicKey: string, capacity: number): void {
    this.nodes.set(id, { id, publicKey, capacity, currentLoad: 0, uptime: Date.now() });
  }

  buildCircuit(hops: number = 3): MixNode[] {
    const available = Array.from(this.nodes.values())
      .filter(n => n.currentLoad < n.capacity);
    if (available.length < hops) throw new Error('Insufficient mix nodes');
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, hops);
  }

  wrapMessage(payload: string, circuit: MixNode[]): MixMessage {
    const layers: EncryptedLayer[] = [];
    let currentPayload = payload;
    for (let i = circuit.length - 1; i >= 0; i--) {
      const delay = Math.floor(Math.random() * 500) + 100;
      currentPayload = this.layerEncrypt(currentPayload, circuit[i].publicKey);
      layers.unshift({
        encryptedPayload: currentPayload,
        nextRelay: i < circuit.length - 1 ? circuit[i + 1].id : 'destination',
        delay,
      });
    }
    const msg: MixMessage = {
      id: crypto.randomUUID(), layers,
      currentHop: 0, totalHops: circuit.length,
      injectedAt: Date.now(), deliveredAt: null,
    };
    this.messagePool.set(msg.id, msg);
    circuit[0].currentLoad++;
    return msg;
  }

  processHop(messageId: string): { nextRelay: string; remaining: number } | null {
    const msg = this.messagePool.get(messageId);
    if (!msg || msg.currentHop >= msg.totalHops) return null;
    const layer = msg.layers[msg.currentHop];
    msg.currentHop++;
    this.processedCount++;
    if (msg.currentHop >= msg.totalHops) msg.deliveredAt = Date.now();
    return { nextRelay: layer.nextRelay, remaining: msg.totalHops - msg.currentHop };
  }

  private layerEncrypt(data: string, pubKey: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i) + pubKey.charCodeAt(i % pubKey.length)) | 0;
    }
    return Buffer.from(data).toString('base64') + '.' + Math.abs(hash).toString(16);
  }

  getPoolSize(): number { return this.messagePool.size; }
  getProcessedCount(): number { return this.processedCount; }
  getNodeCount(): number { return this.nodes.size; }
}