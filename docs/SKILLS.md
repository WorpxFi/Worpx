# Skills Development Guide

> Build, test, and publish skills for the Worpx ecosystem

## Overview

Skills are modular, composable capabilities that extend what Worpx agents can do. A skill can be as simple as a price checker or as complex as a multi-step DeFi strategy executor.

Skills run in a sandboxed environment with access to a controlled set of APIs via the `SkillContext` object.

## Quick Start

### 1. Scaffold a Skill

```bash
npx @worpx/cli skill create my-skill
cd skills/my-skill
```

This generates:

```
skills/my-skill/
├── src/
│   └── index.ts        # Skill implementation
├── tests/
│   └── index.test.ts   # Test suite
├── skill.json           # Skill manifest
├── README.md
├── package.json
└── tsconfig.json
```

### 2. Implement the Skill

```typescript
// src/index.ts
import { Skill, SkillContext, SkillResult } from '@worpx/skills-core';

export default class MySkill extends Skill {
  name = 'my-skill';
  version = '1.0.0';
  description = 'A brief description of what this skill does';
  category = 'analytics';
  chains = ['base', 'ethereum'];

  async execute(ctx: SkillContext): Promise<SkillResult> {
    const { token } = ctx.params;

    const price = await ctx.market.getPrice(token);
    const volume = await ctx.market.getVolume(token, '24h');

    return {
      success: true,
      data: {
        token,
        price,
        volume,
        timestamp: Date.now(),
      },
    };
  }
}
```

### 3. Test Locally

```bash
npx @worpx/cli skill test my-skill --params '{"token": "ETH"}'
```

### 4. Publish

```bash
npx @worpx/cli skill publish my-skill
```

## Skill Manifest

Every skill requires a `skill.json` manifest:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Brief description",
  "author": "your-username",
  "category": "analytics",
  "chains": ["base", "ethereum", "solana"],
  "permissions": ["market:read", "wallet:read"],
  "params": {
    "token": {
      "type": "string",
      "required": true,
      "description": "Token symbol to analyze"
    },
    "timeframe": {
      "type": "string",
      "required": false,
      "default": "24h",
      "enum": ["1h", "4h", "24h", "7d", "30d"],
      "description": "Analysis timeframe"
    }
  },
  "pricing": {
    "model": "per-execution",
    "amount": "0.01",
    "token": "USDC"
  }
}
```

### Manifest Fields

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `name` | string | Yes | Unique skill identifier (lowercase, hyphens) |
| `version` | string | Yes | Semver version |
| `description` | string | Yes | One-line description |
| `author` | string | Yes | Publisher username |
| `category` | string | Yes | Skill category |
| `chains` | string[] | Yes | Supported chains |
| `permissions` | string[] | Yes | Required permissions |
| `params` | object | Yes | Parameter schema |
| `pricing` | object | No | Monetization configuration |

### Categories

| Category | Description |
|:---------|:------------|
| `trading` | Order execution, DEX interactions |
| `defi` | Lending, staking, yield farming |
| `analytics` | Market data, portfolio analysis |
| `payments` | Transfer, settlement, invoicing |
| `social` | Social media, messaging integrations |
| `data` | Data feeds, oracles, aggregation |
| `governance` | DAO voting, proposal management |
| `nft` | NFT minting, trading, metadata |
| `cross-chain` | Bridge, multi-chain operations |

## Skill Context API

The `SkillContext` provides controlled access to platform services:

### `ctx.market`

Market data operations (requires `market:read` permission):

```typescript
// Get current price
const price = await ctx.market.getPrice('ETH');
// 3245.67

// Get price on specific chain
const basePrice = await ctx.market.getPrice('ETH', { chain: 'base' });

// Get 24h volume
const volume = await ctx.market.getVolume('ETH', '24h');

// Get OHLCV candles
const candles = await ctx.market.getCandles('ETH', {
  interval: '1h',
  limit: 24,
});

// Get token info
const info = await ctx.market.getTokenInfo('0xTokenAddress...', 'base');
```

### `ctx.wallet`

Wallet operations (requires `wallet:read` or `wallet:write`):

```typescript
// Read balance (wallet:read)
const balance = await ctx.wallet.getBalance('USDC');

// Transfer tokens (wallet:write)
const tx = await ctx.wallet.transfer({
  to: '0xRecipient...',
  amount: '10.00',
  token: 'USDC',
});

// Get transaction history (wallet:read)
const txHistory = await ctx.wallet.getTransactions({ limit: 10 });
```

### `ctx.trade`

Trading operations (requires `trade:execute`):

```typescript
// Execute a swap
const swap = await ctx.trade.swap({
  tokenIn: 'USDC',
  tokenOut: 'ETH',
  amountIn: '100.00',
  maxSlippageBps: 50,
});

// Get a quote (no permission needed)
const quote = await ctx.trade.quote({
  tokenIn: 'USDC',
  tokenOut: 'ETH',
  amountIn: '100.00',
});
```

### `ctx.notify`

Notification service:

```typescript
// Send notification to agent owner
await ctx.notify('Price alert: ETH crossed $3,500');

// Structured notification
await ctx.notify({
  title: 'Price Alert',
  body: 'ETH crossed your $3,500 threshold',
  priority: 'high',
  data: { token: 'ETH', price: 3501.23 },
});
```

### `ctx.storage`

Persistent key-value storage scoped to the skill:

```typescript
// Store data
await ctx.storage.set('last_check', Date.now().toString());

// Retrieve data
const lastCheck = await ctx.storage.get('last_check');

// Delete data
await ctx.storage.delete('last_check');

// List keys
const keys = await ctx.storage.keys();
```

### `ctx.logger`

Structured logging:

```typescript
ctx.logger.info('Processing started', { token: 'ETH' });
ctx.logger.warn('High slippage detected', { slippageBps: 250 });
ctx.logger.error('Transaction failed', { error: err.message });
```

## Permissions

Skills must declare required permissions in their manifest. Agents grant permissions during installation.

| Permission | Description |
|:-----------|:------------|
| `market:read` | Read market data (prices, volumes, candles) |
| `wallet:read` | Read wallet balances and transaction history |
| `wallet:write` | Send transactions from the agent's wallet |
| `trade:execute` | Execute trades and swaps |
| `storage:read` | Read from skill-scoped storage |
| `storage:write` | Write to skill-scoped storage |
| `notify:send` | Send notifications to the agent owner |

## Monetization

Skills can charge per execution via the `pricing` field in the manifest:

```json
{
  "pricing": {
    "model": "per-execution",
    "amount": "0.05",
    "token": "USDC"
  }
}
```

| Model | Description |
|:------|:------------|
| `free` | No charge |
| `per-execution` | Charge per skill invocation |
| `subscription` | Recurring payment (daily/monthly) |

Payments are settled automatically via the agent-to-agent payment channel. Skill authors receive payments directly to their wallet.

## Testing

### Unit Tests

```typescript
import { createTestContext } from '@worpx/skills-core/testing';
import MySkill from '../src/index';

describe('MySkill', () => {
  it('should return price data', async () => {
    const ctx = createTestContext({
      params: { token: 'ETH' },
      mocks: {
        market: {
          getPrice: async () => 3245.67,
          getVolume: async () => 1_500_000_000,
        },
      },
    });

    const skill = new MySkill();
    const result = await skill.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(3245.67);
  });
});
```

### Integration Tests

```bash
# Test against testnet
npx @worpx/cli skill test my-skill \
  --chain base-sepolia \
  --params '{"token": "ETH"}'
```

## Publishing Checklist

- [ ] `skill.json` manifest is complete and valid
- [ ] All permissions are documented and minimal
- [ ] Unit tests pass with adequate coverage
- [ ] Integration test validates on at least one chain
- [ ] README.md describes usage, parameters, and examples
- [ ] Version follows semver
- [ ] No hardcoded addresses, keys, or chain IDs
- [ ] Error handling covers all failure paths

## Cross-Platform Compatibility

Skills built with `@worpx/skills-core` are compatible with:

| Platform | Support |
|:---------|:--------|
| Worpx Agents | Full |
| OpenClaw | Full (via adapter) |
| Claude Plugins | Partial (read-only skills) |
| Custom Integrations | Full (via SDK) |

## Examples

See the [`examples/custom-skill/`](../examples/custom-skill/) directory for a complete working example.

## Further Reading

- [Architecture](ARCHITECTURE.md) &mdash; How the skills runtime works
- [API Reference](API_REFERENCE.md) &mdash; REST API for skill management
- [SDK Guide](SDK_GUIDE.md) &mdash; Using skills via the SDK
