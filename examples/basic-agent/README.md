# Basic Agent Example

Minimal example demonstrating WorpxAgent agent initialization, balance checking, and trade execution.

## Prerequisites

- Node.js 18+
- A Worpx API key
- Funded wallet on Base

## Setup

```bash
npm install @worpx/sdk
```

## Run

```bash
WORPX_API_KEY=your_key npx tsx examples/basic-agent/index.ts
```

## What This Example Does

1. Initializes a WorpxAgent agent on Base chain with simulation mode
2. Retrieves and displays agent information
3. Checks wallet balances across all tokens
4. Executes a natural language price query
5. Performs a $10 ETH market buy
