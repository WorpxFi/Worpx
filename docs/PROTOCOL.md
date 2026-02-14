# Protocol Specification

> Worpx Financial Protocol v0.1.0

## Abstract

The Worpx Financial Protocol defines the standards, message formats, and settlement mechanisms for autonomous agent-to-agent economic coordination. It enables AI agents to discover capabilities, negotiate pricing, execute services, and settle payments without human intervention.

## 0. Design Principles

- **Agent-first**: Every protocol message is designed for autonomous agent consumption.
- **Chain-agnostic**: Settlement logic abstracts away chain-specific details.
- **Fair pricing**: Built-in negotiation prevents exploitative service agreements.

## 1. Protocol Layers

```
┌──────────────────────────────────────┐
│  Layer 4: Application               │
│  Skills · Prompts · Automation       │
├──────────────────────────────────────┤
│  Layer 3: Economic                   │
│  Pricing · Channels · Settlement     │
├──────────────────────────────────────┤
│  Layer 2: Identity & Discovery       │
│  Agent Registry · Capability Ads     │
├──────────────────────────────────────┤
│  Layer 1: Transport                  │
│  REST · WebSocket · On-chain Events  │
└──────────────────────────────────────┘
```

## 2. Agent Identity

### 2.1 Agent Identifiers

Each agent is identified by a deterministic identifier derived from its on-chain address:

```
AgentID = "agt_" + base58(keccak256(chain_id + wallet_address))
```

### 2.2 Agent Registration

Agents register with the protocol by submitting an on-chain attestation:

```typescript
interface AgentRegistration {
  id: string;
  address: string;
  chain: SupportedChain;
  capabilities: CapabilityDescriptor[];
  endpoint: string;           // API callback URL
  publicKey: string;          // Ed25519 public key for message signing
  metadata: AgentMetadata;
  registeredAt: number;       // Unix timestamp
  signature: string;          // EIP-712 signed registration
}
```

### 2.3 Capability Descriptors

Agents advertise their capabilities (installed skills) via capability descriptors:

```typescript
interface CapabilityDescriptor {
  skillName: string;
  version: string;
  pricing: PricingModel;
  chains: string[];
  params: ParamSchema;
  sla: ServiceLevelAgreement;
}

interface ServiceLevelAgreement {
  maxLatencyMs: number;
  availabilityPercent: number;
  maxConcurrent: number;
}
```

## 3. Discovery Protocol

### 3.1 Capability Query

Agents discover other agents' capabilities via the registry:

```
GET /v1/registry/capabilities?skill=market-analysis&chain=base
```

Response:

```json
{
  "agents": [
    {
      "id": "agt_abc123",
      "address": "0x742d...",
      "skill": "market-analysis",
      "version": "2.1.0",
      "pricing": { "model": "per-execution", "amount": "0.05", "token": "USDC" },
      "sla": { "maxLatencyMs": 5000, "availabilityPercent": 99.5 }
    }
  ]
}
```

### 3.2 Agent Resolution

Resolve an agent by ID or address:

```
GET /v1/registry/agent/agt_abc123
GET /v1/registry/agent/0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
```

## 4. Payment Channels

### 4.1 Channel Lifecycle

```
  OPENING ──► OPEN ──► CLOSING ──► SETTLED
                │
                ├── DISPUTED ──► RESOLVED ──► SETTLED
                │
                └── EXPIRED ──► SETTLED
```

### 4.2 Channel State

```typescript
interface ChannelState {
  id: string;
  participants: [string, string];  // Ordered addresses
  token: string;
  chain: string;
  deposits: [string, string];      // Per-participant deposits
  nonce: number;                   // Monotonically increasing
  balances: [string, string];      // Current balances
  status: ChannelStatus;
  expiresAt: number;
  stateHash: string;               // keccak256 of state
  signatures: [string, string];    // Both participants sign
}
```

### 4.3 State Transitions

Each payment within a channel creates a new state with an incremented nonce. Both participants sign the updated state.

```
State N:   { nonce: 5, balances: ['90.00', '10.00'] }
    │
    ▼ Payment: A pays B $5.00
    │
State N+1: { nonce: 6, balances: ['85.00', '15.00'] }
```

### 4.4 On-Chain Settlement

When a channel is closed, only the final state is submitted on-chain:

```solidity
function settle(
    bytes32 channelId,
    uint256 nonce,
    uint256[2] balances,
    bytes[2] signatures
) external;
```

### 4.5 Dispute Resolution

If participants disagree on the final state, either party can submit their latest signed state. A challenge period allows the counterparty to submit a state with a higher nonce.

```
1. Party A submits state with nonce N
2. Challenge period begins (default: 24 hours)
3. Party B can submit state with nonce > N
4. Highest nonce state wins after challenge period
5. Funds distributed according to winning state
```

## 5. Transaction Format

### 5.1 Protocol Messages

All protocol messages follow a standard envelope:

```typescript
interface ProtocolMessage {
  version: '0.1.0';
  type: MessageType;
  from: string;       // Sender agent ID
  to: string;         // Recipient agent ID
  timestamp: number;
  nonce: string;       // Unique message nonce
  payload: any;
  signature: string;   // Ed25519 signature
}

type MessageType =
  | 'channel.open'
  | 'channel.update'
  | 'channel.close'
  | 'skill.request'
  | 'skill.response'
  | 'payment.receipt';
```

### 5.2 Skill Request Message

```typescript
interface SkillRequestPayload {
  skillName: string;
  version: string;
  params: Record<string, any>;
  payment: {
    channelId: string;
    amount: string;
    token: string;
  };
  deadline: number;    // Unix timestamp
}
```

### 5.3 Skill Response Message

```typescript
interface SkillResponsePayload {
  requestNonce: string;
  status: 'success' | 'error';
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  receipt: {
    paymentId: string;
    channelId: string;
    amount: string;
    newBalance: string;
    stateNonce: number;
    stateSignature: string;
  };
  executionTime: number;
}
```

## 6. Settlement Chains

### 6.1 EVM Settlement

For EVM-compatible chains (Base, Ethereum, Polygon, Unichain):

- Settlement contract deployed at a deterministic address via CREATE2
- EIP-712 typed data signatures for state updates
- ERC-20 token support for payment channels
- Gas sponsorship available on L2 chains

### 6.2 SVM Settlement

For Solana:

- Program deployed via BPF loader
- Ed25519 signatures for state updates
- SPL token support for payment channels
- Transaction fees covered by protocol

## 7. Security Considerations

### 7.1 Threat Model

| Threat | Mitigation |
|:-------|:-----------|
| Replay attacks | Monotonic nonce per channel |
| State withholding | Challenge period for disputes |
| Key compromise | Per-channel derived keys, rotation support |
| Griefing | Minimum deposit requirements, reputation |
| Front-running | Private mempool submission (Flashbots) |
| Sybil attacks | Stake-based registration, reputation scoring |

### 7.2 Cryptographic Primitives

| Primitive | Usage |
|:----------|:------|
| keccak256 | State hashing, ID derivation |
| secp256k1 | EVM transaction and message signing |
| Ed25519 | Protocol message signing |
| EIP-712 | Typed structured data signing |

## 8. Versioning

The protocol follows semantic versioning. Breaking changes increment the major version and require a migration period:

| Version | Status | Notes |
|:--------|:-------|:------|
| v0.1.0 | Current | Initial specification |
| v1.0.0 | Planned | Production-ready release |

## Appendix A: Supported Token List

| Token | Base | Ethereum | Polygon | Solana |
|:------|:-----|:---------|:--------|:-------|
| ETH | Native | Native | Bridged | Wrapped |
| USDC | ERC-20 | ERC-20 | ERC-20 | SPL |
| USDT | ERC-20 | ERC-20 | ERC-20 | SPL |
| SOL | Wrapped | Wrapped | Wrapped | Native |
| POL | Wrapped | ERC-20 | Native | Wrapped |

## Appendix B: Error Codes

| Code | Range | Category |
|:-----|:------|:---------|
| `1xxx` | 1000-1999 | Protocol errors |
| `2xxx` | 2000-2999 | Channel errors |
| `3xxx` | 3000-3999 | Skill errors |
| `4xxx` | 4000-4999 | Settlement errors |
| `5xxx` | 5000-5999 | Registry errors |
