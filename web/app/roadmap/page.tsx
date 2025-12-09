"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Check,
  Circle,
  ArrowRight,
  Coins,
  Lock,
  TrendingUp,
  Users,
  Zap,
  Globe,
  Smartphone,
  Wrench,
  BarChart3,
  Send,
  Twitter,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles,
} from "lucide-react";

interface RoadmapPhase {
  phase: string;
  title: string;
  status: "completed" | "current" | "upcoming";
  icon: any;
  description: string;
  items: {
    title: string;
    description: string;
    completed: boolean;
  }[];
}

export default function RoadmapPage() {
  const router = useRouter();
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const socialLinks = {
    telegram: "https://t.me/StakePointPortal",
    twitter: "https://x.com/StakePointApp",
  };

  const roadmapPhases: RoadmapPhase[] = [
    {
      phase: "Phase 1",
      title: "Foundation",
      status: "completed",
      icon: Shield,
      description: "Core platform infrastructure and flagship features",
      items: [
        {
          title: "Multi-Pool Token Staking",
          description: "Flexible staking pools with customizable lock periods and reflection reward distribution",
          completed: true,
        },
        {
          title: "Jupiter-Powered Swaps",
          description: "Optimized token swapping with best-rate aggregation across Solana DEXs",
          completed: true,
        },
        {
          title: "Trader Leaderboard",
          description: "Gamified trading experience with rankings and performance tracking",
          completed: true,
        },
        {
          title: "Token & LP Lockers",
          description: "Secure vesting schedules for team tokens and liquidity locks",
          completed: true,
        },
        {
          title: "Whale Club",
          description: "Exclusive tier for high-value holders with premium benefits",
          completed: true,
        },
        {
          title: "Liquidity Farming",
          description: "Yield farming pools with competitive APY rewards",
          completed: true,
        },
      ],
    },
    {
      phase: "Phase 2",
      title: "Growth",
      status: "current",
      icon: TrendingUp,
      description: "Expanding reach and building the ecosystem",
      items: [
        {
          title: "Community Building",
          description: "Growing our presence across social platforms and crypto communities",
          completed: true,
        },
        {
          title: "Project Onboarding",
          description: "Partnering with Solana projects to list staking pools and increase TVL",
          completed: false,
        },
        {
          title: "Marketing & Visibility",
          description: "DappRadar, DefiLlama listings and influencer partnerships",
          completed: false,
        },
        {
          title: "Exchange Listings",
          description: "CoinGecko, CoinMarketCap, and CEX listings for platform token",
          completed: false,
        },
      ],
    },
    {
      phase: "Phase 3",
      title: "Expansion",
      status: "upcoming",
      icon: Wrench,
      description: "New tools and enhanced capabilities",
      items: [
        {
          title: "Airdrop Tools",
          description: "Bulk token distribution tools for projects running airdrops and rewards",
          completed: false,
        },
        {
          title: "Wallet Cleaner",
          description: "Clean up dust tokens and empty token accounts to reclaim SOL",
          completed: false,
        },
        {
          title: "Advanced Analytics",
          description: "Detailed portfolio tracking, yield analytics, and performance insights",
          completed: false,
        },
        {
          title: "Developer API",
          description: "Public API for integrations and third-party applications",
          completed: false,
        },
      ],
    },
    {
      phase: "Phase 4",
      title: "Scale",
      status: "upcoming",
      icon: Globe,
      description: "Multi-chain expansion and mobile access",
      items: [
        {
          title: "Mobile Application",
          description: "Native iOS and Android apps for staking and portfolio management on the go",
          completed: false,
        },
        {
          title: "EVM Chain Expansion",
          description: "Bringing StakePoint to Ethereum, Base, Arbitrum, and other EVM networks",
          completed: false,
        },
        {
          title: "Cross-Chain Staking",
          description: "Unified staking experience across multiple blockchain ecosystems",
          completed: false,
        },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#22c55e";
      case "current":
        return "#fb57ff";
      case "upcoming":
        return "#666666";
      default:
        return "#666666";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "completed":
        return "rgba(34, 197, 94, 0.1)";
      case "current":
        return "rgba(251, 87, 255, 0.1)";
      case "upcoming":
        return "rgba(102, 102, 102, 0.1)";
      default:
        return "rgba(102, 102, 102, 0.1)";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "current":
        return "In Progress";
      case "upcoming":
        return "Upcoming";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#060609] relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#060609]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full blur-3xl"
            style={{ background: "rgba(251, 87, 255, 0.05)" }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: "rgba(251, 87, 255, 0.1)", color: "#fb57ff" }}
            >
              <Rocket className="w-4 h-4" />
              Building the Future of DeFi
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-white">
              Roadmap
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Our vision for StakePoint — from foundation to global scale. 
              Track our progress as we build the most comprehensive DeFi platform on Solana and beyond.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span className="text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#fb57ff" }}
                />
                <span className="text-gray-400">In Progress</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#666666" }}
                />
                <span className="text-gray-400">Upcoming</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Timeline */}
      <section className="relative py-12 lg:py-16 bg-[#060609]">
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="space-y-4">
            {roadmapPhases.map((phase, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden transition-all"
                style={{
                  borderColor:
                    expandedPhase === idx
                      ? "rgba(251, 87, 255, 0.2)"
                      : undefined,
                }}
              >
                {/* Phase Header */}
                <button
                  onClick={() =>
                    setExpandedPhase(expandedPhase === idx ? null : idx)
                  }
                  className="w-full p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: getStatusBg(phase.status) }}
                  >
                    <phase.icon
                      className="w-6 h-6"
                      style={{ color: getStatusColor(phase.status) }}
                    />
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: getStatusBg(phase.status),
                          color: getStatusColor(phase.status),
                        }}
                      >
                        {phase.phase}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: getStatusColor(phase.status) }}
                      >
                        {getStatusLabel(phase.status)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-gray-500">{phase.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-white">
                        {phase.items.filter((i) => i.completed).length}/
                        {phase.items.length}
                      </p>
                      <p className="text-xs text-gray-500">completed</p>
                    </div>
                    {expandedPhase === idx ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Phase Items */}
                {expandedPhase === idx && (
                  <div className="px-5 pb-5 space-y-3">
                    <div className="h-px bg-white/[0.05] mb-4" />
                    {phase.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] hover:bg-white/[0.04] transition-all"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor =
                            "rgba(251, 87, 255, 0.15)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "")
                        }
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: item.completed
                              ? "rgba(34, 197, 94, 0.2)"
                              : "rgba(102, 102, 102, 0.2)",
                          }}
                        >
                          {item.completed ? (
                            <Check
                              className="w-3.5 h-3.5"
                              style={{ color: "#22c55e" }}
                            />
                          ) : (
                            <Circle
                              className="w-3 h-3"
                              style={{ color: "#666666" }}
                            />
                          )}
                        </div>
                        <div>
                          <h4
                            className="text-sm font-medium"
                            style={{
                              color: item.completed ? "#ffffff" : "#999999",
                            }}
                          >
                            {item.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Whale Club Input Section */}
      <section className="relative py-12 lg:py-16 bg-[#060609] border-t border-white/[0.05]">
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(251, 87, 255, 0.2)" }}
              >
                <Users className="w-6 h-6" style={{ color: "#fb57ff" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  Community-Driven Development
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Whale Club members have direct input on the evolution of StakePoint. 
                  High-value holders help shape new features, prioritize development, 
                  and guide the direction of the protocol.
                </p>
                <button
                  onClick={() => router.push("/whale-club")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{ background: "rgba(251, 87, 255, 0.1)", color: "#fb57ff" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(251, 87, 255, 0.2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(251, 87, 255, 0.1)")
                  }
                >
                  Learn About Whale Club
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 bg-[#060609]">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-3xl lg:text-4xl font-bold mb-3"
            style={{
              background: "linear-gradient(45deg, white, #fb57ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Start Earning Today
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Join the future of decentralized finance on Solana
          </p>
          <button
            onClick={() => router.push("/pools")}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-semibold text-sm"
            style={{ background: "linear-gradient(45deg, black, #fb57ff)" }}
          >
            <Sparkles className="w-4 h-4" />
            Explore Pools
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.05] bg-[#060609] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-gray-400">
                © 2025 StakePoint. Built on Solana with ❤️
              </p>
            </div>

            <div className="flex items-center gap-4">
              <a
                href={socialLinks.telegram || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-white/[0.02] border border-white/[0.05] rounded-full hover:bg-white/[0.05] transition-all"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(251, 87, 255, 0.3)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                aria-label="Telegram"
              >
                <Send className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href={socialLinks.twitter || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-white/[0.02] border border-white/[0.05] rounded-full hover:bg-white/[0.05] transition-all"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(251, 87, 255, 0.3)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}