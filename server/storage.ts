import {
  type Agent,
  type InsertAgent,
  type Transaction,
  type InsertTransaction,
  type Channel,
  type InsertChannel,
  type Skill,
  type InsertSkill,
  type SkillExecution,
  type InsertSkillExecution,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentsByChain(chain: string): Promise<Agent[]>;
  listAgents(limit?: number, offset?: number): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: string, active: boolean): Promise<Agent | undefined>;

  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByAgent(agentId: string): Promise<Transaction[]>;
  getTransactionsByChannel(channelId: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(
    id: string,
    status: string,
    txHash?: string
  ): Promise<Transaction | undefined>;

  getChannel(id: string): Promise<Channel | undefined>;
  getChannelsByAgent(agentId: string): Promise<Channel[]>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannelStatus(
    id: string,
    status: string
  ): Promise<Channel | undefined>;
  incrementChannelNonce(id: string): Promise<Channel | undefined>;

  getSkill(id: string): Promise<Skill | undefined>;
  listSkills(category?: string): Promise<Skill[]>;
  getSkillsByAuthor(authorId: string): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  incrementSkillExecutions(
    id: string,
    latencyMs: number
  ): Promise<Skill | undefined>;

  createSkillExecution(exec: InsertSkillExecution): Promise<SkillExecution>;
  getSkillExecutions(skillId: string): Promise<SkillExecution[]>;

  getProtocolStats(): Promise<{
    totalAgents: number;
    totalTransactions: number;
    totalChannels: number;
    totalSkills: number;
    totalVolume: string;
  }>;
}

export class MemStorage implements IStorage {
  private agents: Map<string, Agent> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private channels: Map<string, Channel> = new Map();
  private skills: Map<string, Skill> = new Map();
  private skillExecutions: Map<string, SkillExecution> = new Map();

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentsByChain(chain: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter((a) => a.chain === chain);
  }

  async listAgents(limit = 50, offset = 0): Promise<Agent[]> {
    return Array.from(this.agents.values()).slice(offset, offset + limit);
  }

  async createAgent(input: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const agent: Agent = {
      id,
      name: input.name,
      ownerAddress: input.ownerAddress,
      chain: input.chain ?? "base",
      endpoint: input.endpoint ?? null,
      publicKey: input.publicKey,
      capabilities: (input.capabilities as string[]) ?? [],
      metadata: (input.metadata as Record<string, unknown>) ?? null,
      active: input.active ?? true,
      registeredAt: new Date(),
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgentStatus(
    id: string,
    active: boolean
  ): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, active };
    this.agents.set(id, updated);
    return updated;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByAgent(agentId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.fromAgentId === agentId || t.toAgentId === agentId
    );
  }

  async getTransactionsByChannel(channelId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.channelId === channelId
    );
  }

  async createTransaction(input: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const tx: Transaction = {
      id,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      chain: input.chain,
      token: input.token,
      amount: input.amount,
      status: input.status ?? "pending",
      txHash: input.txHash ?? null,
      channelId: input.channelId ?? null,
      memo: input.memo ?? null,
      createdAt: new Date(),
      confirmedAt: null,
    };
    this.transactions.set(id, tx);
    return tx;
  }

  async updateTransactionStatus(
    id: string,
    status: string,
    txHash?: string
  ): Promise<Transaction | undefined> {
    const tx = this.transactions.get(id);
    if (!tx) return undefined;
    const updated = {
      ...tx,
      status: status as Transaction["status"],
      txHash: txHash ?? tx.txHash,
      confirmedAt: status === "confirmed" ? new Date() : tx.confirmedAt,
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async getChannelsByAgent(agentId: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      (c) => c.initiatorId === agentId || c.counterpartyId === agentId
    );
  }

  async createChannel(input: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = {
      id,
      initiatorId: input.initiatorId,
      counterpartyId: input.counterpartyId,
      chain: input.chain,
      token: input.token ?? "USDC",
      depositAmount: input.depositAmount,
      status: input.status ?? "opening",
      nonce: 0,
      ttl: input.ttl ?? 3600,
      openedAt: new Date(),
      closedAt: null,
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannelStatus(
    id: string,
    status: string
  ): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;
    const updated = {
      ...channel,
      status: status as Channel["status"],
      closedAt: status === "settled" ? new Date() : channel.closedAt,
    };
    this.channels.set(id, updated);
    return updated;
  }

  async incrementChannelNonce(id: string): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;
    const updated = { ...channel, nonce: channel.nonce + 1 };
    this.channels.set(id, updated);
    return updated;
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    return this.skills.get(id);
  }

  async listSkills(category?: string): Promise<Skill[]> {
    const all = Array.from(this.skills.values()).filter((s) => s.published);
    if (category) return all.filter((s) => s.category === category);
    return all;
  }

  async getSkillsByAuthor(authorId: string): Promise<Skill[]> {
    return Array.from(this.skills.values()).filter(
      (s) => s.authorId === authorId
    );
  }

  async createSkill(input: InsertSkill): Promise<Skill> {
    const id = randomUUID();
    const skill: Skill = {
      id,
      name: input.name,
      version: input.version ?? "1.0.0",
      description: input.description,
      authorId: input.authorId,
      category: input.category,
      chains: (input.chains as string[]) ?? [],
      pricePerCall: input.pricePerCall ?? null,
      schema: (input.schema as Record<string, unknown>) ?? null,
      totalExecutions: 0,
      avgLatencyMs: null,
      published: input.published ?? false,
      createdAt: new Date(),
    };
    this.skills.set(id, skill);
    return skill;
  }

  async incrementSkillExecutions(
    id: string,
    latencyMs: number
  ): Promise<Skill | undefined> {
    const skill = this.skills.get(id);
    if (!skill) return undefined;
    const newTotal = skill.totalExecutions + 1;
    const currentAvg = skill.avgLatencyMs ?? latencyMs;
    const newAvg = Math.round(
      (currentAvg * skill.totalExecutions + latencyMs) / newTotal
    );
    const updated = {
      ...skill,
      totalExecutions: newTotal,
      avgLatencyMs: newAvg,
    };
    this.skills.set(id, updated);
    return updated;
  }

  async createSkillExecution(
    input: InsertSkillExecution
  ): Promise<SkillExecution> {
    const id = randomUUID();
    const exec: SkillExecution = {
      id,
      skillId: input.skillId,
      callerAgentId: input.callerAgentId,
      channelId: input.channelId ?? null,
      params: (input.params as Record<string, unknown>) ?? null,
      result: (input.result as Record<string, unknown>) ?? null,
      latencyMs: input.latencyMs ?? null,
      paymentAmount: input.paymentAmount ?? null,
      success: input.success ?? null,
      executedAt: new Date(),
    };
    this.skillExecutions.set(id, exec);
    return exec;
  }

  async getSkillExecutions(skillId: string): Promise<SkillExecution[]> {
    return Array.from(this.skillExecutions.values()).filter(
      (e) => e.skillId === skillId
    );
  }

  async getProtocolStats() {
    let totalVolume = 0;
    for (const tx of this.transactions.values()) {
      totalVolume += parseFloat(tx.amount);
    }
    return {
      totalAgents: this.agents.size,
      totalTransactions: this.transactions.size,
      totalChannels: this.channels.size,
      totalSkills: this.skills.size,
      totalVolume: totalVolume.toFixed(2),
    };
  }
}

export const storage = new MemStorage();
