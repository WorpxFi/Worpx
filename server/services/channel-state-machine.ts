type ChannelPhase = 'proposed' | 'funded' | 'active' | 'disputing' | 'settling' | 'closed';

interface StateTransition {
  from: ChannelPhase;
  to: ChannelPhase;
  guard?: (ctx: ChannelContext) => boolean;
  action?: (ctx: ChannelContext) => void;
}

interface ChannelContext {
  channelId: string;
  initiator: string;
  counterparty: string;
  deposit: bigint;
  nonce: number;
  lastUpdate: number;
  disputeDeadline: number | null;
}

const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'proposed', to: 'funded', guard: (ctx) => ctx.deposit > 0n },
  { from: 'funded', to: 'active' },
  { from: 'active', to: 'disputing', action: (ctx) => { ctx.disputeDeadline = Date.now() + 86400000; } },
  { from: 'active', to: 'settling' },
  { from: 'disputing', to: 'active', guard: (ctx) => ctx.disputeDeadline !== null && Date.now() < ctx.disputeDeadline },
  { from: 'disputing', to: 'settling', guard: (ctx) => ctx.disputeDeadline !== null && Date.now() >= ctx.disputeDeadline },
  { from: 'settling', to: 'closed' },
];

export class ChannelStateMachine {
  private phase: ChannelPhase = 'proposed';
  private context: ChannelContext;

  constructor(channelId: string, initiator: string, counterparty: string) {
    this.context = {
      channelId, initiator, counterparty,
      deposit: 0n, nonce: 0, lastUpdate: Date.now(), disputeDeadline: null,
    };
  }

  transition(targetPhase: ChannelPhase): boolean {
    const rule = VALID_TRANSITIONS.find(t => t.from === this.phase && t.to === targetPhase);
    if (!rule) return false;
    if (rule.guard && !rule.guard(this.context)) return false;
    rule.action?.(this.context);
    this.phase = targetPhase;
    this.context.nonce++;
    this.context.lastUpdate = Date.now();
    return true;
  }

  fund(amount: bigint): boolean {
    this.context.deposit += amount;
    return this.transition('funded');
  }

  getPhase(): ChannelPhase { return this.phase; }
  getContext(): Readonly<ChannelContext> { return { ...this.context }; }

  allowedTransitions(): ChannelPhase[] {
    return VALID_TRANSITIONS
      .filter(t => t.from === this.phase)
      .filter(t => !t.guard || t.guard(this.context))
      .map(t => t.to);
  }
}