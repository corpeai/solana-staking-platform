"use client";

import Link from "next/link";
import { Sparkles, Flame, Wrench, ArrowRight } from "lucide-react";

const tools = [
  {
    id: "wallet-cleanup",
    name: "Wallet Cleanup",
    description: "Burn dust tokens and close empty accounts to reclaim SOL rent",
    icon: Sparkles,
    href: "/tools/wallet-cleanup",
    gradient: "from-[#fb57ff] to-purple-600",
    features: ["Burn tokens under $1", "Close empty accounts", "Reclaim ~0.002 SOL per account"],
  },
  // Future tools can be added here
  // {
  //   id: "airdrop-tool",
  //   name: "Airdrop Tool",
  //   description: "Send tokens to multiple wallets at once",
  //   icon: Send,
  //   href: "/tools/airdrop",
  //   gradient: "from-blue-500 to-cyan-500",
  //   features: ["Bulk send tokens", "CSV upload", "Transaction batching"],
  //   comingSoon: true,
  // },
];

export default function ToolsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb57ff] to-purple-600 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tools</h1>
            <p className="text-gray-400 text-sm">Useful utilities for managing your Solana wallet</p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group block p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#fb57ff]/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
                <tool.icon className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-white group-hover:text-[#fb57ff] transition-colors">
                    {tool.name}
                  </h2>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#fb57ff] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-gray-400 mb-4">{tool.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {tool.features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs text-gray-400"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Coming Soon Placeholder */}
      <div className="mt-8 p-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.05] text-center">
        <Wrench className="w-8 h-8 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">More tools coming soon...</p>
        <p className="text-gray-600 text-xs mt-1">Airdrop tool, wallet analyzer, and more</p>
      </div>
    </div>
  );
}