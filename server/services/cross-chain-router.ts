type SupportedChain = 'base' | 'ethereum' | 'polygon' | 'solana';

interface CrossChainMessage {
  id: string;
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  senderAgent: string;
  receiverAgent: string;
  payload: Uint8Array;
  nonce: number;
  timestamp: number;
  status: 'queued' | 'relayed' | 'confirmed' | 'failed';
}

interface BridgeConfig {
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  relayerEndpoint: string;
  confirmations: number;
  maxPayloadBytes: number;
}

export class CrossChainRouter {
  private messageQueue: Map<string, CrossChainMessage> = new Map();
  private bridges: BridgeConfig[] = [];
  private nonceCounters: Map<string, number> = new Map();

  registerBridge(config: BridgeConfig): void {
    const existing = this.bridges.findIndex(
      b => b.sourceChain === config.sourceChain && b.targetChain === config.targetChain
    );
    if (existing >= 0) this.bridges[existing] = config;
    else this.bridges.push(config);
  }

  findRoute(source: SupportedChain, target: SupportedChain): BridgeConfig | null {
    return this.bridges.find(b => b.sourceChain === source && b.targetChain === target) ?? null;
  }

  queueMessage(sender: string, receiver: string, source: SupportedChain, target: SupportedChain, payload: Uint8Array): string {
    const bridge = this.findRoute(source, target);
    if (!bridge) throw new Error(`No bridge from ${source} to ${target}`);
    if (payload.byteLength > bridge.maxPayloadBytes) throw new Error('Payload exceeds bridge limit');

    const nonceKey = `${sender}-${target}`;
    const nonce = (this.nonceCounters.get(nonceKey) ?? 0) + 1;
    this.nonceCounters.set(nonceKey, nonce);

    const msg: CrossChainMessage = {
      id: crypto.randomUUID(), sourceChain: source, targetChain: target,
      senderAgent: sender, receiverAgent: receiver,
      payload, nonce, timestamp: Date.now(), status: 'queued',
    };
    this.messageQueue.set(msg.id, msg);
    return msg.id;
  }

  markRelayed(messageId: string): boolean {
    const msg = this.messageQueue.get(messageId);
    if (!msg || msg.status !== 'queued') return false;
    msg.status = 'relayed';
    return true;
  }

  confirmDelivery(messageId: string): boolean {
    const msg = this.messageQueue.get(messageId);
    if (!msg || msg.status !== 'relayed') return false;
    msg.status = 'confirmed';
    return true;
  }

  getPendingMessages(chain?: SupportedChain): CrossChainMessage[] {
    return Array.from(this.messageQueue.values())
      .filter(m => m.status === 'queued' && (!chain || m.targetChain === chain));
  }

  getMessageStats(): Record<SupportedChain, { sent: number; received: number }> {
    const stats: Record<string, { sent: number; received: number }> = {};
    for (const chain of ['base', 'ethereum', 'polygon', 'solana'] as SupportedChain[]) {
      stats[chain] = { sent: 0, received: 0 };
    }
    for (const msg of this.messageQueue.values()) {
      stats[msg.sourceChain].sent++;
      stats[msg.targetChain].received++;
    }
    return stats as Record<SupportedChain, { sent: number; received: number }>;
  }
}