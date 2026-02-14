export type SupportedChain = "base" | "ethereum" | "polygon" | "solana";

export interface WorpxConfig {
  apiKey: string;
  baseUrl?: string;
  chain?: SupportedChain;
  timeout?: number;
}

export interface AgentIdentity {
  id: string;
  name: string;
  address: string;
  chain: SupportedChain;
  publicKey: string;
  capabilities: string[];
}

export interface BalanceEntry {
  token: string;
  amount: string;
  chain: SupportedChain;
  usdValue?: string;
}

export interface TransactionRequest {
  toAgentId: string;
  token: string;
  amount: string;
  chain?: SupportedChain;
  memo?: string;
}

export interface TransactionReceipt {
  id: string;
  status: "pending" | "confirmed" | "failed" | "reverted";
  txHash: string | null;
  chain: SupportedChain;
  timestamp: number;
}

export interface ChannelConfig {
  counterpartyId: string;
  depositAmount: string;
  token?: string;
  ttl?: number;
}

export interface ChannelState {
  id: string;
  status: "opening" | "active" | "closing" | "settled" | "disputed";
  nonce: number;
  depositAmount: string;
  token: string;
  chain: SupportedChain;
}

export interface ChannelPayment {
  amount: string;
  memo?: string;
}

export interface ChannelSettlement {
  channelId: string;
  transactionCount: number;
  netSettlement: Record<string, string>;
  settlementTxHash: string | null;
}

export interface SkillDescriptor {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  chains: string[];
  pricePerCall: string | null;
}

export interface SkillExecutionRequest {
  skillId: string;
  params?: Record<string, unknown>;
  channelId?: string;
}

export interface SkillExecutionResult {
  executionId: string;
  success: boolean;
  result: Record<string, unknown> | null;
  latencyMs: number | null;
  paymentAmount: string | null;
}

export interface ProtocolStats {
  totalAgents: number;
  totalTransactions: number;
  totalChannels: number;
  totalSkills: number;
  totalVolume: string;
}

export interface AgentIntegrationConfig {
  platformId: string;
  authMethod: "bearer" | "api_key" | "oauth2";
  syncInterval?: number;
  capabilities: string[];
}

export interface AgentConnectionStatus {
  agentId: string;
  platformId: string;
  connected: boolean;
  lastSyncAt: number | null;
}
