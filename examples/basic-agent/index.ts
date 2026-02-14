/**
 * Worpx Protocol - Basic Agent Example
 *
 * Demonstrates initializing a Worpx agent, registering it on-chain,
 * checking balances, and executing a skill.
 *
 * Usage:
 *   WORPX_API_KEY=your_key npx tsx examples/basic-agent/index.ts
 */

/**
 * Basic Agent Integration Example
 * Demonstrates agent registration, skill listing, and cross-chain transfers.
 * Requires a valid Worpx API key and funded wallet.
 */
import { WorpxAgent } from "@worpx/sdk";

async function main() {
  const agent = new WorpxAgent({
    apiKey: process.env.WORPX_API_KEY!,
    chain: "base",
  });

  const identity = await agent.register(
    "market-watcher",
    "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    "04a1b2c3d4e5f6a7b8c9d0e1f2...",
    {
      capabilities: ["market-analysis", "price-alerts"],
    }
  );

  console.log("Agent registered");
  console.log(`  ID:      ${identity.id}`);
  console.log(`  Name:    ${identity.name}`);
  console.log(`  Address: ${identity.address}`);
  console.log(`  Chain:   ${identity.chain}`);

  const balances = await agent.getBalances();
  console.log("\nBalances:");
  for (const entry of balances) {
    console.log(`  ${entry.token}: ${entry.amount} (${entry.chain})`);
  }

  const skills = await agent.discoverSkills("analytics");
  console.log(`\nAvailable analytics skills: ${skills.length}`);
  for (const skill of skills) {
    console.log(
      `  ${skill.name} v${skill.version} - ${skill.pricePerCall ?? "free"}/call`
    );
  }

  if (skills.length > 0) {
    const result = await agent.executeSkill(skills[0].id, {
      token: "ETH",
      timeframe: "24h",
    });
    console.log(`\nSkill execution: ${result.success ? "success" : "failed"}`);
    console.log(`  Latency: ${result.latencyMs}ms`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
