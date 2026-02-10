# Architecture

> Technical architecture of Worpx Protocol

## System Overview

Worpx Protocol is a modular financial infrastructure layer designed around four core subsystems that work together to enable autonomous agent economies.

```
                           ┌─────────────────────┐
                           │    External Agents   │
                           │  (Worpx, OpenClaw│
                           │   Third-party)       │
                           └──────────┬───────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │          Gateway Layer             │
                    │   REST API · WebSocket · SDK       │
                    │   Auth · Rate Limiting · Routing   │
                    └─────────────────┬─────────────────┘
                                      │
          ┌───────────────┬───────────┴───────────┬───────────────┐
          │               │                       │               │
   ┌──────┴──────┐ ┌──────┴──────┐ ┌──────────────┴┐ ┌───────────┴───┐
   │   Agent     │ │   Skills    │ │  Transaction  │ │   Wallet      │
   │   Manager   │ │   Runtime   │ │  Router       │ │   Service     │
   │             │ │             │ │               │ │               │
   │  Lifecycle  │ │  Sandbox    │ │  Validation   │ │  Key Mgmt     │
   │  Identity   │ │  Registry   │ │  Batching     │ │  Signing      │
   │  Channels   │ │  Execution  │ │  MEV Protect  │ │  Derivation   │
   └──────┬──────┘ └──────┬──────┘ └───────┬──────┘ └───────┬───────┘
          │               │                │                 │
          └───────────────┴────────┬───────┴─────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │    Settlement Layer          │
                    │                              │
                    │  ┌────┐ ┌────┐ ┌────┐ ┌───┐ │
                    │  │Base│ │ ETH│ │Poly│ │SOL│ │
                    │  └────┘ └────┘ └────┘ └───┘ │
                    └─────────────────────────────┘
```

## Core Subsystems

### 1. Gateway Layer

The gateway layer handles all external communication and enforces security boundaries.

**Components:**

| Component | Responsibility |
|:----------|:---------------|
| REST API Server | HTTP endpoints for agent operations |
| WebSocket Server | Real-time event streaming and subscriptions |
| SDK Adapter | Protocol-level client abstraction |
| Auth Middleware | API key validation, scoping, rate enforcement |
| Request Router | Route classification and handler dispatch |

**Request Flow:**

```
Client Request
    │
    ├── Auth Middleware (validate API key, check scope)
    │
    ├── Rate Limiter (per-key, per-IP enforcement)
    │
    ├── Request Validator (schema validation via Zod)
    │
    ├── Route Handler (business logic dispatch)
    │
    └── Response Serializer (normalize output format)
```

### 2. Agent Manager

Manages the full lifecycle of agent instances, identity resolution, and inter-agent communication channels.

**Agent Lifecycle:**

```
  CREATED ──► INITIALIZING ──► ACTIVE ──► SUSPENDED ──► TERMINATED
                  │                          │
                  │                          ▼
                  └──────────────────── RECOVERING
```

**Key Responsibilities:**

- Agent identity registration and resolution
- Payment channel creation and management
- Agent-to-agent message routing
- Session management and state persistence
- Capability negotiation between agents

**Agent Identity Model:**

```typescript
interface AgentIdentity {
  id: string;                    // Unique agent identifier
  address: string;               // On-chain wallet address
  chain: SupportedChain;         // Primary chain
  capabilities: string[];        // Installed skill names
  channels: ChannelInfo[];       // Active payment channels
  metadata: Record<string, any>; // Custom agent metadata
}
```

### 3. Skills Runtime

The skills runtime provides a sandboxed execution environment for modular agent capabilities.

**Architecture:**

```
┌─────────────────────────────────────────┐
│              Skills Runtime              │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Registry  │  │ Loader   │  │ Sandbox││
│  │           │  │          │  │        ││
│  │ Discovery │  │ Resolve  │  │ Isolate││
│  │ Versions  │  │ Validate │  │ Execute││
│  │ Metadata  │  │ Cache    │  │ Monitor││
│  └──────────┘  └──────────┘  └────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │          Skill Context API           ││
│  │  market · wallet · notify · storage  ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Execution Model:**

1. Agent requests skill execution via prompt or direct call
2. Runtime resolves the skill from the registry
3. Skill is loaded and validated against its manifest
4. Sandboxed execution context is created with scoped permissions
5. Skill executes with access to the `SkillContext` API
6. Results are validated, logged, and returned to the agent

**Skill Context API:**

```typescript
interface SkillContext {
  agent: AgentIdentity;
  market: MarketDataProvider;
  wallet: WalletOperations;
  notify: NotificationService;
  storage: SkillStorage;
  params: Record<string, any>;
  logger: Logger;
}
```

### 4. Transaction Router

The transaction router handles validation, batching, simulation, and routing of all on-chain transactions.

**Pipeline:**

```
Incoming Transaction
    │
    ├── Schema Validation
    │   └── Verify required fields, amounts, addresses
    │
    ├── Policy Check
    │   └── Spending limits, allowlists, chain restrictions
    │
    ├── Simulation
    │   └── Dry-run via fork (revert detection)
    │
    ├── MEV Protection
    │   └── Flashbots bundle (if applicable)
    │
    ├── Gas Optimization
    │   └── Dynamic gas pricing, batch opportunities
    │
    ├── Signing
    │   └── Agent wallet signs via secure enclave
    │
    ├── Submission
    │   └── Submit to RPC (primary + fallback)
    │
    └── Confirmation
        └── Wait for finality, emit events
```

**Supported Transaction Types:**

| Type | Description |
|:-----|:------------|
| `transfer` | Native token or ERC-20 transfer |
| `swap` | DEX swap via aggregator |
| `approve` | Token approval for spender |
| `deploy` | Contract deployment |
| `call` | Arbitrary contract call |
| `batch` | Multiple operations in one transaction |
| `a2a_payment` | Agent-to-agent payment channel settlement |

### 5. Settlement Layer

The settlement layer abstracts multi-chain interactions behind a unified interface.

**Chain Adapters:**

```
┌────────────────────────────────────────────┐
│           Unified Settlement API           │
│                                            │
│   submit() · confirm() · simulate()        │
│   getBalance() · getTransaction()          │
└──────────────────┬─────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────┴────┐  ┌────┴────┐  ┌────┴────┐
│   EVM   │  │   EVM   │  │   SVM   │
│ Adapter │  │ Adapter │  │ Adapter │
│  Base   │  │  Poly   │  │ Solana  │
│  ETH    │  │         │  │         │
│ Unichain│  │         │  │         │
└─────────┘  └─────────┘  └─────────┘
```

Each adapter implements:

- RPC connection management with automatic failover
- Nonce management and resubmission logic
- Gas estimation and priority fee calculation
- Transaction receipt monitoring and confirmation
- Chain-specific encoding (EVM ABI vs Solana Borsh)

## Data Flow

### Agent-to-Agent Payment

```
Agent A                    Protocol                    Agent B
  │                           │                           │
  │  1. Open Channel          │                           │
  │  ────────────────────►    │                           │
  │                           │  2. Notify Channel Open   │
  │                           │  ────────────────────►    │
  │                           │                           │
  │  3. Execute Skill + Pay   │                           │
  │  ────────────────────►    │                           │
  │                           │  4. Execute Skill         │
  │                           │  ────────────────────►    │
  │                           │                           │
  │                           │  5. Return Result         │
  │                           │  ◄────────────────────    │
  │                           │                           │
  │                           │  6. Settle Payment        │
  │                           │  ────────────────────►    │
  │  7. Receipt               │                           │
  │  ◄────────────────────    │                           │
  │                           │                           │
```

### Prompt Execution Flow

```
1. Client submits prompt via API/SDK
2. Gateway authenticates and creates job
3. Agent Manager resolves agent identity
4. Skills Runtime identifies required skill(s)
5. Transaction Router validates any on-chain operations
6. Settlement Layer executes transactions
7. Results aggregated and returned to client
```

## Security Boundaries

```
┌─────────────────────────────────────────────┐
│               Public Internet               │
└──────────────────┬──────────────────────────┘
                   │ TLS 1.3
┌──────────────────┴──────────────────────────┐
│            Gateway (DMZ)                     │
│   Rate Limiting · Auth · Input Validation    │
└──────────────────┬──────────────────────────┘
                   │ Internal Network
┌──────────────────┴──────────────────────────┐
│         Application Layer                    │
│   Agent Manager · Skills Runtime · Router    │
└──────────────────┬──────────────────────────┘
                   │ Encrypted Channel
┌──────────────────┴──────────────────────────┐
│         Secure Enclave                       │
│   Key Storage · Transaction Signing          │
└─────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|:------|:-----------|
| Language | TypeScript 5.x |
| Runtime | Node.js 20+ / Bun 1.x |
| API Framework | Express 5.x |
| Validation | Zod |
| Database | PostgreSQL (Drizzle ORM) |
| Blockchain (EVM) | viem / ethers.js |
| Blockchain (SVM) | @solana/web3.js |
| Testing | Vitest |
| CI/CD | GitHub Actions |
| Documentation | Docusaurus |

## Configuration

The protocol is configured via environment variables and a typed configuration object:

```typescript
interface ProtocolConfig {
  api: {
    port: number;
    host: string;
    cors: string[];
  };
  chains: {
    [chain: string]: {
      rpcUrl: string;
      fallbackRpcUrl?: string;
      chainId: number;
      confirmations: number;
    };
  };
  security: {
    rateLimitPerMinute: number;
    maxSpendPerTransaction: string;
    maxSpendPerDay: string;
    allowedTokens: string[];
  };
  skills: {
    registryUrl: string;
    sandboxTimeout: number;
    maxConcurrent: number;
  };
}
```

## Further Reading

- [API Reference](API_REFERENCE.md)
- [SDK Guide](SDK_GUIDE.md)
- [Skills Development](SKILLS.md)
- [Protocol Specification](PROTOCOL.md)
