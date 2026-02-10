# Multi-Chain Operations Example

Demonstrates cross-chain portfolio management, multi-chain trading, and DCA automation across Base, Ethereum, Polygon, and Solana.

## Prerequisites

- Node.js 18+
- A Worpx API key with multi-chain access
- Funded wallets on target chains

## Setup

```bash
npm install @worpx/sdk
```

## Run

```bash
WORPX_API_KEY=your_key npx tsx examples/multi-chain/index.ts
```

## What This Example Does

1. Queries token balances across all supported chains
2. Executes trades on Base, Ethereum, Polygon, and Solana
3. Sets up automated DCA strategies across multiple chains
