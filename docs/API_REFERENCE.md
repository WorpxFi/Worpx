# API Reference

> Worpx Protocol REST API v1

## Base URL

```
https://api.worpx.dev/v1
```

## Authentication

All API requests require a valid API key passed via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

API keys are scoped to specific permissions. See [Key Scopes](#key-scopes) for details.

## Rate Limits

| Plan | Requests/min | Concurrent Jobs |
|:-----|:-------------|:----------------|
| Free | 30 | 2 |
| Pro | 300 | 20 |
| Enterprise | Custom | Custom |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1700000000
```

---

## Endpoints

### Agent

#### `POST /agent/prompt`

Submit a natural language prompt for agent execution.

**Request:**

```json
{
  "prompt": "buy $50 of ETH on Base",
  "chain": "base",
  "options": {
    "simulate": true,
    "maxSlippageBps": 100
  }
}
```

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `prompt` | string | Yes | Natural language instruction |
| `chain` | string | No | Target chain (default: agent's primary chain) |
| `options.simulate` | boolean | No | Dry-run before execution (default: false) |
| `options.maxSlippageBps` | number | No | Max slippage in basis points |

**Response (202 Accepted):**

```json
{
  "success": true,
  "jobId": "job_a1b2c3d4e5",
  "status": "pending",
  "estimatedTime": 3000,
  "message": "Job created successfully"
}
```

---

#### `GET /agent/job/:jobId`

Check the status of a submitted job.

**Response (200 OK):**

```json
{
  "success": true,
  "jobId": "job_a1b2c3d4e5",
  "status": "completed",
  "prompt": "buy $50 of ETH on Base",
  "response": "Successfully purchased 0.0154 ETH for $50.00 on Base",
  "transactions": [
    {
      "hash": "0xabc123...",
      "chain": "base",
      "type": "swap",
      "status": "confirmed",
      "gasUsed": "145000",
      "timestamp": "2025-01-15T10:30:03Z"
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T10:30:03Z",
  "processingTime": 3000
}
```

**Job Statuses:**

| Status | Description |
|:-------|:------------|
| `pending` | Queued for processing |
| `processing` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Encountered an error |
| `cancelled` | Cancelled by user |

---

#### `DELETE /agent/job/:jobId`

Cancel a pending or processing job.

**Response (200 OK):**

```json
{
  "success": true,
  "jobId": "job_a1b2c3d4e5",
  "status": "cancelled"
}
```

---

#### `GET /agent/info`

Retrieve agent account information.

**Response (200 OK):**

```json
{
  "success": true,
  "agent": {
    "id": "agt_f6g7h8i9j0",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
    "chain": "base",
    "capabilities": ["trading", "payments", "defi"],
    "skills": [
      {
        "name": "trading-advanced",
        "version": "2.1.0",
        "status": "active"
      }
    ],
    "balances": {
      "ETH": "1.5432",
      "USDC": "2500.00"
    }
  }
}
```

---

### Transactions

#### `POST /agent/sign`

Sign a message or transaction using the agent's custodial wallet.

**Request:**

```json
{
  "type": "message",
  "data": "Hello, Worpx!",
  "chain": "base"
}
```

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `type` | string | Yes | `message`, `typed_data`, or `transaction` |
| `data` | string/object | Yes | Data to sign |
| `chain` | string | No | Target chain |

**Response (200 OK):**

```json
{
  "success": true,
  "signature": "0x1234abcd...",
  "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38"
}
```

---

#### `POST /agent/submit`

Submit a signed transaction on-chain.

**Request:**

```json
{
  "chain": "base",
  "signedTransaction": "0xf86c...",
  "options": {
    "waitForConfirmation": true,
    "confirmations": 1
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "hash": "0xabc123...",
  "status": "confirmed",
  "blockNumber": 12345678,
  "gasUsed": "21000"
}
```

---

### Payments (Agent-to-Agent)

#### `POST /payments/channel/open`

Open a payment channel between two agents.

**Request:**

```json
{
  "counterparty": "0xRecipientAddress...",
  "deposit": "100.00",
  "token": "USDC",
  "chain": "base",
  "ttl": 86400
}
```

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `counterparty` | string | Yes | Recipient agent address |
| `deposit` | string | Yes | Initial deposit amount |
| `token` | string | Yes | Payment token symbol |
| `chain` | string | No | Settlement chain |
| `ttl` | number | No | Channel time-to-live in seconds |

**Response (201 Created):**

```json
{
  "success": true,
  "channel": {
    "id": "ch_k1l2m3n4o5",
    "participants": [
      "0x742d35Cc...",
      "0xRecipient..."
    ],
    "deposit": "100.00",
    "token": "USDC",
    "chain": "base",
    "status": "open",
    "expiresAt": "2025-01-16T10:30:00Z"
  }
}
```

---

#### `POST /payments/channel/:channelId/pay`

Execute a payment within an open channel.

**Request:**

```json
{
  "amount": "5.00",
  "memo": "Skill execution: market-analysis",
  "skillId": "market-analysis",
  "metadata": {
    "executionId": "exec_p1q2r3"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "payment": {
    "id": "pmt_s4t5u6v7",
    "channelId": "ch_k1l2m3n4o5",
    "amount": "5.00",
    "token": "USDC",
    "from": "0x742d35Cc...",
    "to": "0xRecipient...",
    "memo": "Skill execution: market-analysis",
    "status": "settled",
    "timestamp": "2025-01-15T10:35:00Z"
  }
}
```

---

#### `POST /payments/channel/:channelId/close`

Close a payment channel and settle on-chain.

**Response (200 OK):**

```json
{
  "success": true,
  "settlement": {
    "channelId": "ch_k1l2m3n4o5",
    "totalPayments": 12,
    "netSettlement": {
      "0x742d35Cc...": "-60.00",
      "0xRecipient...": "+60.00"
    },
    "settlementTx": "0xdef456...",
    "status": "finalized"
  }
}
```

---

### Skills

#### `GET /skills`

List available skills in the registry.

**Query Parameters:**

| Param | Type | Description |
|:------|:-----|:------------|
| `category` | string | Filter by category |
| `search` | string | Full-text search |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |

**Response (200 OK):**

```json
{
  "success": true,
  "skills": [
    {
      "name": "trading-advanced",
      "version": "2.1.0",
      "description": "Advanced trading with limit orders, DCA, and stop-losses",
      "author": "WorpxDeveloper",
      "category": "trading",
      "chains": ["base", "ethereum", "solana"],
      "installs": 1250,
      "rating": 4.8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### `POST /skills/install`

Install a skill to the agent.

**Request:**

```json
{
  "name": "trading-advanced",
  "version": "2.1.0"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "skill": {
    "name": "trading-advanced",
    "version": "2.1.0",
    "status": "installed",
    "capabilities": ["limit-order", "dca", "stop-loss", "market-buy", "market-sell"]
  }
}
```

---

#### `DELETE /skills/:skillName`

Uninstall a skill from the agent.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Skill 'trading-advanced' uninstalled"
}
```

---

## Key Scopes

API keys can be scoped to specific permissions:

| Scope | Description |
|:------|:------------|
| `read` | Read-only access (balances, info, job status) |
| `trade` | Execute trades and swaps |
| `transfer` | Send tokens to other addresses |
| `sign` | Sign messages and transactions |
| `skills` | Install/uninstall skills |
| `payments` | Open/close payment channels |
| `admin` | Full access including key management |

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient USDC balance. Required: 50.00, Available: 23.45",
    "details": {
      "required": "50.00",
      "available": "23.45",
      "token": "USDC"
    }
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|:-----|:------------|:------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | API key lacks required scope |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_BALANCE` | 400 | Not enough tokens |
| `CHAIN_ERROR` | 502 | Blockchain RPC error |
| `SIMULATION_FAILED` | 400 | Transaction simulation reverted |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## WebSocket Events

Connect to `wss://api.worpx.dev/v1/ws` for real-time updates.

**Authentication:**

```json
{ "type": "auth", "apiKey": "YOUR_API_KEY" }
```

**Event Types:**

| Event | Description |
|:------|:------------|
| `job.update` | Job status change |
| `transaction.confirmed` | Transaction finalized on-chain |
| `payment.received` | Incoming payment via channel |
| `skill.executed` | Skill execution completed |
| `balance.change` | Wallet balance changed |

**Example:**

```json
{
  "type": "transaction.confirmed",
  "data": {
    "hash": "0xabc123...",
    "chain": "base",
    "type": "swap",
    "status": "confirmed"
  },
  "timestamp": "2025-01-15T10:30:03Z"
}
```
