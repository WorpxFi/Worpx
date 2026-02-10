import type {
  WorpxConfig,
  AgentIdentity,
  BalanceEntry,
  TransactionRequest,
  TransactionReceipt,
  ChannelConfig,
  ChannelState,
  ChannelPayment,
  ChannelSettlement,
  SkillDescriptor,
  SkillExecutionRequest,
  SkillExecutionResult,
  ProtocolStats,
  SupportedChain,
} from "./types";

const DEFAULT_BASE_URL = "https://api.worpx.dev/v1";
const DEFAULT_TIMEOUT = 30_000;

export class WorpxClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultChain: SupportedChain;
  private timeout: number;

  constructor(config: WorpxConfig) {
    if (!config.apiKey) throw new Error("apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultChain = config.chain ?? "base";
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Worpx-Chain": this.defaultChain,
      };

      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        throw new WorpxApiError(res.status, errorBody || res.statusText, path);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async registerAgent(
    name: string,
    ownerAddress: string,
    publicKey: string,
    options?: {
      chain?: SupportedChain;
      capabilities?: string[];
      endpoint?: string;
    }
  ): Promise<AgentIdentity> {
    return this.request("POST", "/agents", {
      name,
      ownerAddress,
      publicKey,
      chain: options?.chain ?? this.defaultChain,
      capabilities: options?.capabilities ?? [],
      endpoint: options?.endpoint,
    });
  }

  async getAgent(agentId: string): Promise<AgentIdentity> {
    return this.request("GET", `/agents/${agentId}`);
  }

  async listAgents(options?: {
    chain?: SupportedChain;
    limit?: number;
    offset?: number;
  }): Promise<AgentIdentity[]> {
    const params = new URLSearchParams();
    if (options?.chain) params.set("chain", options.chain);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.request("GET", `/agents${qs ? `?${qs}` : ""}`);
  }

  async getBalances(agentId: string): Promise<BalanceEntry[]> {
    return this.request("GET", `/agents/${agentId}/balances`);
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionReceipt> {
    return this.request("POST", "/transactions", {
      ...tx,
      chain: tx.chain ?? this.defaultChain,
    });
  }

  async getTransaction(txId: string): Promise<TransactionReceipt> {
    return this.request("GET", `/transactions/${txId}`);
  }

  async getAgentTransactions(agentId: string): Promise<TransactionReceipt[]> {
    return this.request("GET", `/agents/${agentId}/transactions`);
  }

  async openChannel(config: ChannelConfig): Promise<ChannelState> {
    return this.request("POST", "/channels", {
      ...config,
      chain: this.defaultChain,
      token: config.token ?? "USDC",
      ttl: config.ttl ?? 3600,
    });
  }

  async getChannel(channelId: string): Promise<ChannelState> {
    return this.request("GET", `/channels/${channelId}`);
  }

  async channelPay(
    channelId: string,
    payment: ChannelPayment
  ): Promise<TransactionReceipt> {
    return this.request("POST", `/channels/${channelId}/pay`, payment);
  }

  async settleChannel(channelId: string): Promise<ChannelSettlement> {
    return this.request("POST", `/channels/${channelId}/settle`);
  }

  async listSkills(category?: string): Promise<SkillDescriptor[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request("GET", `/skills${qs}`);
  }

  async getSkill(skillId: string): Promise<SkillDescriptor> {
    return this.request("GET", `/skills/${skillId}`);
  }

  async executeSkill(req: SkillExecutionRequest): Promise<SkillExecutionResult> {
    return this.request("POST", `/skills/${req.skillId}/execute`, {
      params: req.params,
      channelId: req.channelId,
    });
  }

  async getProtocolStats(): Promise<ProtocolStats> {
    return this.request("GET", "/stats");
  }

  setChain(chain: SupportedChain): void {
    this.defaultChain = chain;
  }

  getChain(): SupportedChain {
    return this.defaultChain;
  }
}

export class WorpxApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string,
    public readonly path: string
  ) {
    super(`Worpx API ${statusCode} on ${path}: ${body}`);
    this.name = "WorpxApiError";
  }
}
