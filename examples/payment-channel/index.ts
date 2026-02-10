/**
 * Worpx Protocol - Agent-to-Agent Payment Channel Example
 *
 * Demonstrates opening a payment channel between two agents,
 * executing micropayments, and settling on-chain.
 *
 * Usage:
 *   AGENT_A_KEY=key_a AGENT_B_KEY=key_b npx tsx examples/payment-channel/index.ts
 */

import { WorpxAgent } from "@worpx/sdk";

async function main() {
  const agentA = new WorpxAgent({
    apiKey: process.env.AGENT_A_KEY!,
    chain: "base",
  });

  const agentB = new WorpxAgent({
    apiKey: process.env.AGENT_B_KEY!,
    chain: "base",
  });

  const identityA = await agentA.register(
    "data-provider",
    "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    "04abcdef12345678..."
  );

  const identityB = await agentB.register(
    "analytics-consumer",
    "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c",
    "04fedcba87654321..."
  );

  console.log(`Agent A: ${identityA.id} (${identityA.name})`);
  console.log(`Agent B: ${identityB.id} (${identityB.name})`);

  console.log("\n--- Opening Payment Channel ---");
  const channel = await agentA.openChannel({
    counterpartyId: identityB.id,
    depositAmount: "50.00",
    token: "USDC",
    ttl: 3600,
  });

  console.log(`Channel ID:     ${channel.id}`);
  console.log(`Status:         ${channel.status}`);
  console.log(`Deposit:        ${channel.depositAmount} USDC`);

  console.log("\n--- Executing Micropayments ---");

  const payment1 = await channel.pay({
    amount: "5.00",
    memo: "Market analysis - ETH 24h",
  });
  console.log(`Payment 1: $5.00 (${payment1.status})`);

  const payment2 = await channel.pay({
    amount: "3.50",
    memo: "Price alert setup - BTC threshold",
  });
  console.log(`Payment 2: $3.50 (${payment2.status})`);

  const payment3 = await channel.pay({
    amount: "10.00",
    memo: "Portfolio rebalance execution",
  });
  console.log(`Payment 3: $10.00 (${payment3.status})`);

  console.log(`\nChannel nonce: ${channel.nonce}`);
  console.log(`Total payments: ${channel.totalPayments}`);

  console.log("\n--- Settling Channel ---");

  const settlement = await channel.settle();
  console.log(`Transactions settled: ${settlement.transactionCount}`);
  console.log(`Settlement hash: ${settlement.settlementTxHash ?? "pending"}`);

  console.log("\nDone.");
}

main().catch(console.error);
