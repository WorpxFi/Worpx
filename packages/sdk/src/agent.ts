import { WorpxClient } from "./client";
import { PaymentChannel } from "./channel";
import type {
  WorpxConfig,
  AgentIdentity,
  BalanceEntry,
  TransactionRequest,
  TransactionReceipt,
  ChannelConfig,
  SkillDescriptor,
  SkillExecutionResult,
  SupportedChain,
} from "./types";

export class WorpxAgent {
  private client: WorpxClient;
  private identity: AgentIdentity | null = null;
  private channels: Map<string, PaymentChannel> = new Map();

  constructor(config: WorpxConfig) {
    this.client = new WorpxClient(config);
  }

  async register(
    name: string,
    ownerAddress: string,
    publicKey: string,
    options?: {
      chain?: SupportedChain;
      capabilities?: string[];
      endpoint?: string;
    }
  ): Promise<AgentIdentity> {
    this.identity = await this.client.registerAgent(
      name,
      ownerAddress,
      publicKey,
      options
    );
    return this.identity;
  }

  async load(agentId: string): Promise<AgentIdentity> {
    this.identity = await this.client.getAgent(agentId);
    return this.identity;
  }

  getIdentity(): AgentIdentity {
    if (!this.identity) throw new Error("Agent not initialized");
    return this.identity;
  }

  async getBalances(): Promise<BalanceEntry[]> {
    return this.client.getBalances(this.requireId());
  }

  async send(
    toAgentId: string,
    token: string,
    amount: string,
    options?: { chain?: SupportedChain; memo?: string }
  ): Promise<TransactionReceipt> {
    const tx: TransactionRequest = {
      toAgentId,
      token,
      amount,
      chain: options?.chain,
      memo: options?.memo,
    };
    return this.client.sendTransaction(tx);
  }

  async getTransactionHistory(): Promise<TransactionReceipt[]> {
    return this.client.getAgentTransactions(this.requireId());
  }

  async openChannel(config: ChannelConfig): Promise<PaymentChannel> {
    const state = await this.client.openChannel(config);
    const channel = new PaymentChannel(this.client, state);
    this.channels.set(state.id, channel);
    return channel;
  }

  getChannel(channelId: string): PaymentChannel | undefined {
    return this.channels.get(channelId);
  }

  async discoverSkills(category?: string): Promise<SkillDescriptor[]> {
    return this.client.listSkills(category);
  }

  async executeSkill(
    skillId: string,
    params?: Record<string, unknown>,
    channelId?: string
  ): Promise<SkillExecutionResult> {
    return this.client.executeSkill({
      skillId,
      params,
      channelId,
    });
  }

  setChain(chain: SupportedChain): void {
    this.client.setChain(chain);
  }

  private requireId(): string {
    if (!this.identity) throw new Error("Agent not initialized");
    return this.identity.id;
  }
}
