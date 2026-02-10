# SDK Guide

> Complete guide to the Worpx TypeScript SDK

## Installation

```bash
npm install @worpx/sdk
```

## Quick Start

```typescript
import { WorpxAgent } from '@worpx/sdk';

const agent = new WorpxAgent({
  apiKey: process.env.WORPX_API_KEY,
  chain: 'base',
});

const result = await agent.prompt('What is the price of ETH?');
console.log(result.response);
```

## Configuration

### Full Configuration

```typescript
import { WorpxAgent, type WorpxAgentConfig } from '@worpx/sdk';

const config: WorpxAgentConfig = {
  apiKey: process.env.WORPX_API_KEY,
  chain: 'base',
  wallet: {
    privateKey: process.env.WALLET_PRIVATE_KEY,
  },
  options: {
    baseUrl: 'https://api.worpx.dev',
    timeout: 60_000,
    retries: 3,
    simulate: true,
    maxSlippageBps: 100,
  },
};

const agent = new WorpxAgent(config);
```

### Configuration Options

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `apiKey` | string | required | Your Worpx API key |
| `chain` | string | `'base'` | Primary chain for operations |
| `wallet.privateKey` | string | optional | Wallet private key for self-custody mode |
| `options.baseUrl` | string | `'https://api.worpx.dev'` | API base URL |
| `options.timeout` | number | `60000` | Request timeout in ms |
| `options.retries` | number | `3` | Retry count for failed requests |
| `options.simulate` | boolean | `false` | Simulate transactions before execution |
| `options.maxSlippageBps` | number | `100` | Default max slippage (basis points) |

## Core Operations

### Prompts

Execute natural language prompts:

```typescript
const result = await agent.prompt('buy $50 of ETH on Base');

console.log(result.response);       // Human-readable response
console.log(result.transactions);   // On-chain transactions (if any)
console.log(result.jobId);          // Job identifier for tracking
```

### Trading

Direct trading interface:

```typescript
// Market buy
const buy = await agent.trade({
  action: 'buy',
  token: 'ETH',
  amount: '50.00',
  chain: 'base',
});

// Market sell
const sell = await agent.trade({
  action: 'sell',
  token: 'ETH',
  amount: '0.015',
  chain: 'base',
});

// Limit order
const limit = await agent.trade({
  action: 'limit-buy',
  token: 'ETH',
  amount: '100.00',
  price: '3000.00',
  chain: 'base',
});

// Stop-loss
const stop = await agent.trade({
  action: 'stop-loss',
  token: 'ETH',
  amount: '0.5',
  triggerPrice: '2800.00',
  chain: 'base',
});
```

### Wallet Operations

```typescript
// Get balances
const balances = await agent.getBalances();
// { ETH: '1.5432', USDC: '2500.00', ... }

// Get balance for specific token
const ethBalance = await agent.getBalance('ETH');
// '1.5432'

// Transfer tokens
const tx = await agent.transfer({
  to: '0xRecipient...',
  amount: '100.00',
  token: 'USDC',
  chain: 'base',
});

// Get transaction history
const history = await agent.getTransactions({
  chain: 'base',
  limit: 50,
});
```

### Agent Info

```typescript
const info = await agent.getInfo();

console.log(info.id);             // Agent ID
console.log(info.address);        // Wallet address
console.log(info.capabilities);   // Installed skills
console.log(info.balances);       // Token balances
```

## Agent-to-Agent Payments

### Opening a Payment Channel

```typescript
import { WorpxAgent, AgentNetwork } from '@worpx/sdk';

const agentA = new WorpxAgent({ apiKey: AGENT_A_KEY, chain: 'base' });

// Open a channel with another agent
const channel = await agentA.openChannel({
  counterparty: '0xAgentB_Address...',
  deposit: '100.00',
  token: 'USDC',
  ttl: 86400, // 24 hours
});

console.log(channel.id);     // Channel identifier
console.log(channel.status); // 'open'
```

### Making Payments

```typescript
// Pay for a skill execution
const payment = await channel.pay({
  amount: '5.00',
  memo: 'market-analysis execution',
});

// Pay with metadata
const payment2 = await channel.pay({
  amount: '10.00',
  memo: 'Data feed subscription',
  metadata: { period: '1h', dataType: 'ohlcv' },
});
```

### Executing Skills with Payment

```typescript
// Combined skill execution + payment
const result = await channel.execute({
  skill: 'market-analysis',
  payment: '5.00',
  params: {
    token: 'ETH',
    timeframe: '24h',
    indicators: ['rsi', 'macd', 'volume'],
  },
});

console.log(result.data);      // Skill output
console.log(result.receipt);   // Payment receipt
```

### Closing a Channel

```typescript
const settlement = await channel.close();

console.log(settlement.totalPayments);  // Total number of payments
console.log(settlement.netSettlement);  // Net settlement amounts
console.log(settlement.settlementTx);   // On-chain settlement hash
```

## Skills

### Installing Skills

```typescript
// Install from registry
await agent.installSkill('trading-advanced');

// Install specific version
await agent.installSkill('trading-advanced', '2.1.0');

// List installed skills
const skills = await agent.listSkills();
```

### Using Skills Programmatically

```typescript
// Register a custom skill
import { TradingSkill, PaymentSkill } from '@worpx/skills-core';

agent.use(new TradingSkill());
agent.use(new PaymentSkill());

// Execute a skill directly
const result = await agent.executeSkill('trading', {
  action: 'analyze',
  token: 'ETH',
  chain: 'base',
});
```

## Event Handling

### WebSocket Events

```typescript
// Subscribe to real-time events
agent.on('transaction.confirmed', (event) => {
  console.log(`Confirmed: ${event.hash}`);
});

agent.on('payment.received', (event) => {
  console.log(`Received ${event.amount} ${event.token} from ${event.from}`);
});

agent.on('balance.change', (event) => {
  console.log(`${event.token}: ${event.oldBalance} -> ${event.newBalance}`);
});

// Connect to event stream
await agent.connect();

// Disconnect
await agent.disconnect();
```

## Error Handling

```typescript
import { WorpxAgent, WorpxAgentError, InsufficientBalanceError } from '@worpx/sdk';

try {
  const result = await agent.trade({
    action: 'buy',
    token: 'ETH',
    amount: '10000.00',
    chain: 'base',
  });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.log(`Need ${error.required}, have ${error.available}`);
  } else if (error instanceof WorpxAgentError) {
    console.log(`Error ${error.code}: ${error.message}`);
  }
}
```

### Error Types

| Error Class | Code | Description |
|:------------|:-----|:------------|
| `UnauthorizedError` | `UNAUTHORIZED` | Invalid API key |
| `ForbiddenError` | `FORBIDDEN` | Insufficient permissions |
| `RateLimitedError` | `RATE_LIMITED` | Rate limit exceeded |
| `InsufficientBalanceError` | `INSUFFICIENT_BALANCE` | Not enough tokens |
| `SimulationFailedError` | `SIMULATION_FAILED` | Transaction would revert |
| `ChainError` | `CHAIN_ERROR` | Blockchain RPC failure |
| `WorpxAgentError` | varies | Base error class |

## Multi-Chain Operations

```typescript
// Initialize with multiple chains
const agent = new WorpxAgent({
  apiKey: process.env.WORPX_API_KEY,
  chain: 'base',
});

// Execute on a specific chain
const ethTrade = await agent.trade({
  action: 'buy',
  token: 'UNI',
  amount: '100.00',
  chain: 'ethereum',
});

// Cross-chain balance check
const allBalances = await agent.getBalances({ chains: ['base', 'ethereum', 'solana'] });
```

## TypeScript Types

```typescript
import type {
  WorpxAgentConfig,
  TradeParams,
  TransferParams,
  ChannelConfig,
  PaymentParams,
  SkillExecutionResult,
  JobStatus,
  Transaction,
  AgentInfo,
  Balance,
} from '@worpx/sdk';
```

## Best Practices

1. **Store keys securely** &mdash; use environment variables, never hardcode
2. **Enable simulation** &mdash; set `simulate: true` during development
3. **Handle errors gracefully** &mdash; use typed error classes for specific handling
4. **Set spending limits** &mdash; configure per-transaction and daily limits
5. **Monitor events** &mdash; use WebSocket events for real-time tracking
6. **Test on testnets** &mdash; use testnet chains before mainnet deployment

## Next Steps

- [API Reference](API_REFERENCE.md) &mdash; Full REST API documentation
- [Skills Development](SKILLS.md) &mdash; Build custom skills
- [Architecture](ARCHITECTURE.md) &mdash; System design overview
- [Examples](../examples/) &mdash; Working code examples
