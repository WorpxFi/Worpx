import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Layers,
  Terminal,
  BookOpen,
} from "lucide-react";

interface ProtocolStats {
  totalAgents: number;
  totalTransactions: number;
  totalIntegrations: number;
  activeAgentSessions: number;
  totalChannels: number;
  totalSkills: number;
  totalVolume: string;
}

const CHAIN_COLORS: Record<string, string> = {
  Base: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Ethereum: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Polygon: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Solana: "bg-green-500/10 text-green-400 border-green-500/20",
};

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <p
            className="text-3xl font-bold text-white tracking-tight"
            data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
          >
            {value}
          </p>
        )}
        <p className="text-sm text-zinc-400 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function CodePreview() {
  const code = `import { WorpxAgent } from '@worpx/sdk';

const agent = new WorpxAgent({
  apiKey: process.env.WORPX_API_KEY,
  chain: 'base',
});

await agent.register('analyzer', ownerAddr, pubKey, {
  capabilities: ['market-analysis', 'price-alerts'],
});

const channel = await agent.openChannel({
  counterpartyId: traderAgent.id,
  depositAmount: '100.00',
  token: 'USDC',
});

const result = await agent.executeSkill('market-analysis', {
  token: 'ETH',
  timeframe: '24h',
});`;

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="text-xs text-zinc-500 ml-2 font-mono">
          agent.ts
        </span>
      </div>
      <pre className="p-4 text-sm text-zinc-300 font-mono leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Payment Channels",
    description:
      "Off-chain agent-to-agent payment channels with on-chain settlement. Sub-second micropayments between autonomous agents.",
  },
  {
    icon: Globe,
    title: "Multi-Chain Router",
    description:
      "Route transactions across Base, Ethereum, Polygon, and Solana with automatic chain selection and gas optimization.",
  },
  {
    icon: Layers,
    title: "Skill Marketplace",
    description:
      "Agents publish and consume skills through a decentralized marketplace. Pay-per-execution with programmable pricing.",
  },
  {
    icon: Shield,
    title: "Cryptographic Identity",
    description:
      "Every agent has a verifiable on-chain identity with capability attestations. No centralized auth required.",
  },
  {
    icon: Terminal,
    title: "TypeScript SDK",
    description:
      "Full-featured SDK with type-safe agent management, channel operations, and skill execution. Ship in minutes.",
  },
  {
    icon: BookOpen,
    title: "Open Protocol",
    description:
      "MIT licensed protocol specification with reference implementations. Build your own runtime or use ours.",
  },
];

export default function Landing() {
  const { data: stats, isLoading } = useQuery<ProtocolStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800/50 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">
              W
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Worpx Protocol
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="https://github.com/WorpxFi/Worpx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
              data-testid="link-github"
            >
              GitHub
            </a>
            <a
              href="#features"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
              data-testid="link-features"
            >
              Features
            </a>
            <a
              href="#sdk"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
              data-testid="link-sdk"
            >
              SDK
            </a>
            <Button size="sm" data-testid="button-get-started">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {Object.entries(CHAIN_COLORS).map(([chain, classes]) => (
              <Badge
                key={chain}
                variant="outline"
                className={classes}
                data-testid={`badge-chain-${chain.toLowerCase()}`}
              >
                {chain}
              </Badge>
            ))}
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
            Financial Infrastructure for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Agent Economies
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mb-10">
            Worpx Protocol enables autonomous agents to transact, coordinate,
            and execute skills across multiple blockchains. Open payment
            channels, route cross-chain transactions, and build composable
            agent services.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Button size="lg" data-testid="button-start-building">
              Start Building
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 text-zinc-300"
              data-testid="button-read-docs"
            >
              Read the Docs
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Agents"
            value={stats?.totalAgents ?? 0}
            loading={isLoading}
          />
          <StatCard
            label="Transactions"
            value={stats?.totalTransactions ?? 0}
            loading={isLoading}
          />
          <StatCard
            label="Open Channels"
            value={stats?.totalChannels ?? 0}
            loading={isLoading}
          />
          <StatCard
            label="Published Skills"
            value={stats?.totalSkills ?? 0}
            loading={isLoading}
          />
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-2">Protocol Features</h2>
        <p className="text-zinc-400 mb-10">
          Everything agents need to participate in autonomous economies.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="bg-zinc-900/30 border-zinc-800 hover-elevate"
              data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
            >
              <CardContent className="p-6">
                <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="sdk" className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ship in Minutes</h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              The Worpx SDK handles agent registration, payment channels, and
              skill execution with a clean TypeScript API. Install the SDK,
              set your API key, and start building.
            </p>
            <div className="rounded-md bg-zinc-900 border border-zinc-800 px-4 py-3 font-mono text-sm text-zinc-300 mb-6">
              npm install @worpx/sdk
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-blue-400 font-bold">1</span>
                </div>
                <p className="text-sm text-zinc-300">
                  Register your agent with a name, wallet address, and
                  capabilities
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-blue-400 font-bold">2</span>
                </div>
                <p className="text-sm text-zinc-300">
                  Open payment channels and execute micropayments between
                  agents
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-blue-400 font-bold">3</span>
                </div>
                <p className="text-sm text-zinc-300">
                  Publish and consume skills through the decentralized
                  marketplace
                </p>
              </div>
            </div>
          </div>
          <CodePreview />
        </div>
      </section>

      <footer className="border-t border-zinc-800/50 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-zinc-500">
            Worpx Protocol - MIT License
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/WorpxFi/Worpx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
