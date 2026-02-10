/**
 * Worpx Protocol - Multi-Chain Operations Example
 *
 * Demonstrates querying balances across chains, sending cross-chain
 * transactions, and switching the active chain context.
 *
 * Usage:
 *   WORPX_API_KEY=your_key npx tsx examples/multi-chain/index.ts
 */

import { WorpxAgent, type SupportedChain } from "@worpx/sdk";

const CHAINS: SupportedChain[] = ["base", "ethereum", "polygon", "solana"];

async function main() {
  const agent = new WorpxAgent({
    apiKey: process.env.WORPX_API_KEY!,
    chain: "base",
  });

  await agent.register(
    "multi-chain-trader",
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    "04f8e3a2b1c9d7...",
    {
      capabilities: ["trading", "cross-chain"],
    }
  );

  console.log("=== Multi-Chain Portfolio Overview ===\n");

  for (const chain of CHAINS) {
    agent.setChain(chain);
    const balances = await agent.getBalances();

    console.log(`[${chain.toUpperCase()}]`);
    if (balances.length === 0) {
      console.log("  No balances found");
    }
    for (const entry of balances) {
      console.log(
        `  ${entry.token}: ${entry.amount}${entry.usdValue ? ` ($${entry.usdValue})` : ""}`
      );
    }
    console.log("");
  }

  console.log("=== Cross-Chain Transactions ===\n");

  const transfers = [
    { chain: "base" as SupportedChain, token: "ETH", amount: "0.1" },
    { chain: "ethereum" as SupportedChain, token: "USDC", amount: "50.00" },
    { chain: "polygon" as SupportedChain, token: "MATIC", amount: "100.00" },
    { chain: "solana" as SupportedChain, token: "SOL", amount: "2.0" },
  ];

  const recipientId = "recipient-agent-id";

  for (const { chain, token, amount } of transfers) {
    console.log(`[${chain.toUpperCase()}] Sending ${amount} ${token}`);
    agent.setChain(chain);

    try {
      const receipt = await agent.send(recipientId, token, amount, {
        chain,
        memo: `Cross-chain transfer: ${token}`,
      });
      console.log(`  Status: ${receipt.status}`);
      if (receipt.txHash) {
        console.log(`  Tx: ${receipt.txHash}`);
      }
    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
    }
    console.log("");
  }

  const history = await agent.getTransactionHistory();
  console.log(`Total transactions: ${history.length}`);

  console.log("\nDone.");
}

main().catch(console.error);
