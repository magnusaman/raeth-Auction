"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MODEL_ICONS: Record<string, string> = {
  "Claude": "🟣",
  "GPT": "🟢",
  "Gemini": "🔵",
  "DeepSeek": "⚫",
  "Llama": "🟠",
  "Mistral": "🔴",
};

function getModelIcon(name: string): string {
  for (const [key, icon] of Object.entries(MODEL_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🤖";
}

function getModelProvider(name: string): string {
  if (name.toLowerCase().includes("claude")) return "Anthropic";
  if (name.toLowerCase().includes("gpt")) return "OpenAI";
  if (name.toLowerCase().includes("gemini")) return "Google";
  if (name.toLowerCase().includes("deepseek")) return "DeepSeek";
  if (name.toLowerCase().includes("llama")) return "Meta";
  if (name.toLowerCase().includes("mistral")) return "Mistral";
  return "Unknown";
}

interface AgentEntry {
  model: string;
  auctions: number;
  wins: number;
  winRate: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  avgSpend: number;
  avgSquadSize: number;
  consistency: number;
  recentResults: { auctionId: string; score: number; rank: number; date: string }[];
}

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, { bg: string; text: string; border: string; label: string }> = {
    1: { bg: "rgba(253,185,19,0.12)", text: "#FDB913", border: "rgba(253,185,19,0.3)", label: "1st" },
    2: { bg: "rgba(192,192,192,0.10)", text: "#C0C0C0", border: "rgba(192,192,192,0.25)", label: "2nd" },
    3: { bg: "rgba(205,127,50,0.10)", text: "#CD7F32", border: "rgba(205,127,50,0.25)", label: "3rd" },
  };
  const s = styles[rank];
  if (s) {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold font-mono"
        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
      >
        {s.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-mono text-text-muted bg-bg-elevated border border-border-subtle">
      {rank}th
    </span>
  );
}

function ScoreBar({ value, max = 10, color = "#22D3EE" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[6px] bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold" style={{ color, minWidth: 36, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function SparkLine({ results }: { results: { score: number; rank: number }[] }) {
  if (results.length === 0) return <span className="text-text-disabled text-xs">No data</span>;
  const reversed = [...results].reverse(); // oldest first
  const maxS = Math.max(...reversed.map((r) => r.score), 1);
  const minS = Math.min(...reversed.map((r) => r.score), 0);
  const range = maxS - minS || 1;
  const h = 24;
  const w = Math.min(120, reversed.length * 16);
  const step = w / Math.max(1, reversed.length - 1);

  const points = reversed.map((r, i) => {
    const x = i * step;
    const y = h - ((r.score - minS) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        fill="none"
        stroke="#22D3EE"
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
      {reversed.length > 0 && (
        <circle
          cx={points[points.length - 1].split(",")[0]}
          cy={points[points.length - 1].split(",")[1]}
          r="3"
          fill="#22D3EE"
        />
      )}
    </svg>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<{ leaderboard: AgentEntry[]; totalAuctions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/leaderboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ leaderboard: [], totalAuctions: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">Rankings</span>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Leaderboard</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Cumulative AI agent performance across all completed auctions
            </p>
          </div>
          {data && data.totalAuctions > 0 && (
            <div className="text-right">
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Auctions</p>
              <p className="text-2xl font-bold font-mono text-accent-cyan">{data.totalAuctions}</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-bg-surface border border-border-subtle rounded-xl shimmer" />
          ))}
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="bg-bg-surface border border-border-default rounded-xl py-20 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-text-secondary mb-2">No completed auctions yet</p>
          <p className="text-sm text-text-muted mb-6">
            Run some auctions to see agent performance rankings here
          </p>
          <Link href="/" className="btn-primary text-sm py-2.5 px-6">
            Create Auction
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Agents Tracked", value: data.leaderboard.length.toString(), color: "#22D3EE" },
              { label: "Highest Score", value: Math.max(...data.leaderboard.map((a) => a.bestScore)).toFixed(1), color: "#22C55E" },
              { label: "Most Wins", value: Math.max(...data.leaderboard.map((a) => a.wins)).toString(), color: "#FDB913" },
              { label: "Avg Spend", value: `₹${(data.leaderboard.reduce((s, a) => s + a.avgSpend, 0) / data.leaderboard.length).toFixed(0)} Cr`, color: "#A855F7" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-bg-surface border border-border-subtle rounded-xl px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wider text-text-muted">{stat.label}</p>
                <p className="text-xl font-bold font-mono mt-0.5" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Leaderboard table */}
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[60px_1fr_80px_80px_100px_80px_120px] gap-4 px-5 py-3 border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted font-semibold">
              <span>Rank</span>
              <span>Agent</span>
              <span className="text-center">Played</span>
              <span className="text-center">Wins</span>
              <span className="text-center">Avg Score</span>
              <span className="text-center">Win %</span>
              <span className="text-center">Trend</span>
            </div>

            {/* Agent rows */}
            {data.leaderboard.map((agent, idx) => {
              const isExpanded = expandedAgent === agent.model;
              return (
                <div key={agent.model}>
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.model)}
                    className="w-full grid grid-cols-[60px_1fr_80px_80px_100px_80px_120px] gap-4 px-5 py-4 items-center hover:bg-bg-elevated/50 transition-colors border-b border-border-subtle cursor-pointer text-left"
                  >
                    <RankBadge rank={idx + 1} />

                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{getModelIcon(agent.model)}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-text-primary truncate">
                          {agent.model}
                        </p>
                        <p className="text-xs text-text-muted">{getModelProvider(agent.model)}</p>
                      </div>
                    </div>

                    <span className="text-center text-[14px] font-mono text-text-secondary">
                      {agent.auctions}
                    </span>

                    <span className="text-center text-[14px] font-mono font-semibold text-accent-gold">
                      {agent.wins}
                    </span>

                    <div className="px-2">
                      <ScoreBar
                        value={agent.avgScore}
                        max={10}
                        color={agent.avgScore >= 7 ? "#22C55E" : agent.avgScore >= 5 ? "#FDB913" : "#EF4444"}
                      />
                    </div>

                    <span
                      className="text-center text-[14px] font-mono font-semibold"
                      style={{
                        color:
                          agent.winRate >= 50 ? "#22C55E" : agent.winRate >= 25 ? "#FDB913" : "#94A3B8",
                      }}
                    >
                      {agent.winRate}%
                    </span>

                    <div className="flex justify-center">
                      <SparkLine results={agent.recentResults} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-bg-elevated/30 border-b border-border-subtle">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        {[
                          { label: "Best Score", value: agent.bestScore.toFixed(2), color: "#22C55E" },
                          { label: "Worst Score", value: agent.worstScore.toFixed(2), color: "#EF4444" },
                          { label: "Avg Spend", value: `₹${agent.avgSpend.toFixed(1)} Cr`, color: "#A855F7" },
                          { label: "Avg Squad", value: `${agent.avgSquadSize} players`, color: "#22D3EE" },
                          { label: "Consistency", value: `${agent.consistency}%`, color: "#FDB913" },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-xs uppercase tracking-wider text-text-muted">{s.label}</p>
                            <p className="text-[16px] font-bold font-mono mt-0.5" style={{ color: s.color }}>
                              {s.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Recent results */}
                      <div>
                        <p className="text-xs uppercase tracking-wider text-text-muted mb-2">
                          Recent Results
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {agent.recentResults.map((r) => (
                            <Link
                              key={r.auctionId}
                              href={`/results/${r.auctionId}`}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-subtle hover:border-border-hover transition-colors"
                            >
                              <span
                                className="text-sm font-bold font-mono"
                                style={{
                                  color:
                                    r.rank === 1
                                      ? "#FDB913"
                                      : r.rank === 2
                                      ? "#C0C0C0"
                                      : r.rank === 3
                                      ? "#CD7F32"
                                      : "#94A3B8",
                                }}
                              >
                                #{r.rank}
                              </span>
                              <span className="text-sm font-mono text-text-secondary">
                                {r.score.toFixed(1)}
                              </span>
                              <span className="text-xs text-text-disabled">
                                {new Date(r.date).toLocaleDateString()}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
