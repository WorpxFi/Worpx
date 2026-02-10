# Payment Channel Example

Demonstrates agent-to-agent payment channels: opening, making payments, executing skills with payment, and on-chain settlement.

## Prerequisites

- Node.js 18+
- Two Worpx API keys (one per agent)
- Both agents funded with USDC on Base

## Setup

```bash
npm install @worpx/sdk
```

## Run

```bash
AGENT_A_KEY=key_a AGENT_B_KEY=key_b npx tsx examples/payment-channel/index.ts
```

## What This Example Does

1. Initializes two WorpxAgent agents on Base chain
2. Agent A opens a payment channel with Agent B (50 USDC deposit)
3. Agent A makes three payments to Agent B within the channel
4. Agent A executes a skill on Agent B with an attached payment
5. The channel is closed and the net settlement is submitted on-chain
