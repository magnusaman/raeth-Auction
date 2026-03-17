"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AgentAvatar from "@/components/ui/AgentAvatar";
import ScoreReveal from "@/components/ui/ScoreReveal";
// scroll reveal removed — animate on load instead

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
    3: { bg: "rgba(205,127,50,0.10)", text: "#B8856A", border: "rgba(205,127,50,0.25)", label: "3rd" },
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
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-mono text-[#78736E] bg-white/[0.03] border border-white/[0.06]">
      {rank}th
    </span>
  );
}

function ScoreBar({ value, max = 10, color = "#C4A265" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[6px] bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold" style={{ color, minWidth: 36, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function SparkLine({ results }: { results: { score: number; rank: number }[] }) {
  if (results.length === 0) return <span className="text-[#625D58] text-xs">No data</span>;
  const reversed = [...results].reverse();
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
      <polyline fill="none" stroke="#C4A265" strokeWidth="1.5" strokeLinejoin="round" points={points.join(" ")} />
      {reversed.length > 0 && (
        <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="3" fill="#C4A265" />
      )}
    </svg>
  );
}

const MEDAL_COLORS = ["#FDB913", "#C0C0C0", "#B8856A"];
const PODIUM_ORDER = [1, 0, 2]; // Display order: 2nd, 1st, 3rd

export default function LeaderboardPage() {
  const [data, setData] = useState<{ leaderboard: AgentEntry[]; totalAuctions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const podiumRef = null;
  const podiumVisible = true;
  const tableRef = null;
  const tableVisible = true;

  useEffect(() => {
    fetch("/api/v1/leaderboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ leaderboard: [], totalAuctions: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const top3 = data?.leaderboard.slice(0, 3) || [];
  const _rest = data?.leaderboard.slice(3) || [];

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      {/* Header */}
      <div className="mb-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#C4A265" }}>Rankings</p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-[#E8E4DE] font-display">Leaderboard</h1>
              <p className="mt-2 text-sm text-[#9A9590]">Cumulative AI agent performance across all completed auctions</p>
            </div>
            {data && data.totalAuctions > 0 && (
              <div className="text-right hidden md:block">
                <p className="text-xs text-[#78736E] uppercase tracking-wider">Total Auctions</p>
                <p className="text-2xl font-bold font-mono" style={{ color: "#C4A265" }}>
                  <ScoreReveal value={data.totalAuctions} triggerOnScroll={false} />
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="broadcast-card py-20 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-[#9A9590] mb-2 font-display text-lg">No completed auctions yet</p>
          <p className="text-sm text-[#78736E] mb-6">Run some auctions to see agent rankings</p>
          <Link href="/" className="btn-primary text-sm py-2.5 px-6">Create Auction</Link>
        </div>
      ) : (
        <>
          {/* ── Podium — Top 3 ── */}
          {top3.length >= 3 && (
            <div ref={podiumRef} className="mb-12">
              <div className="grid grid-cols-3 gap-4 items-end max-w-[800px] mx-auto">
                {PODIUM_ORDER.map((idx, visualIdx) => {
                  const agent = top3[idx];
                  if (!agent) return null;
                  const rank = idx + 1;
                  const isCenter = visualIdx === 1;
                  return (
                    <motion.div
                      key={agent.model}
                      initial={{ opacity: 0, y: 30 }}
                      animate={podiumVisible ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: visualIdx * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`broadcast-card p-5 text-center ${isCenter ? "pb-8" : "pb-5"}`}
                      style={{
                        borderColor: `${MEDAL_COLORS[idx]}25`,
                        boxShadow: isCenter ? `0 0 40px ${MEDAL_COLORS[idx]}15` : "none",
                      }}
                    >
                      <div className="mb-3">
                        <AgentAvatar name={agent.model} size={isCenter ? "lg" : "md"} className="mx-auto" />
                      </div>
                      <div
                        className="text-2xl font-black font-mono mb-1"
                        style={{ color: MEDAL_COLORS[idx] }}
                      >
                        #{rank}
                      </div>
                      <p className="text-sm font-bold text-[#E8E4DE] truncate font-display">{agent.model}</p>
                      <p className="text-xs text-[#78736E] mb-3 font-mono">
                        {agent.wins}W / {agent.auctions} played
                      </p>
                      <div className="text-xl font-bold font-mono" style={{ color: MEDAL_COLORS[idx] }}>
                        <ScoreReveal value={agent.avgScore} decimals={1} triggerOnScroll={true} />
                      </div>
                      <p className="text-xs text-[#78736E] uppercase tracking-wider">Avg Score</p>
                      <div className="mt-3">
                        <div
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-bold font-mono"
                          style={{
                            background: `${agent.winRate >= 50 ? "#22C55E" : "#F59E0B"}15`,
                            color: agent.winRate >= 50 ? "#22C55E" : "#F59E0B",
                          }}
                        >
                          {agent.winRate}% win rate
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Agents Tracked", value: data.leaderboard.length.toString(), color: "#C4A265" },
              { label: "Highest Score", value: Math.max(...data.leaderboard.map((a) => a.bestScore)).toFixed(1), color: "#22C55E" },
              { label: "Most Wins", value: Math.max(...data.leaderboard.map((a) => a.wins)).toString(), color: "#FDB913" },
              { label: "Avg Spend", value: `₹${(data.leaderboard.reduce((s, a) => s + a.avgSpend, 0) / data.leaderboard.length).toFixed(0)} Cr`, color: "#A855F7" },
            ].map((stat) => (
              <div key={stat.label} className="stat-orb">
                <p className="text-xs uppercase tracking-wider text-[#78736E]">{stat.label}</p>
                <p className="text-xl font-bold font-mono mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* ── Full Scoreboard ── */}
          <div ref={tableRef} className="broadcast-card overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[60px_1fr_80px_80px_100px_80px_120px] gap-4 px-5 py-3 text-xs uppercase tracking-wider text-[#78736E] font-bold" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span>Rank</span>
              <span>Agent</span>
              <span className="text-center">Played</span>
              <span className="text-center">Wins</span>
              <span className="text-center">Avg Score</span>
              <span className="text-center">Win %</span>
              <span className="text-center">Trend</span>
            </div>

            {data.leaderboard.map((agent, idx) => {
              const isExpanded = expandedAgent === agent.model;
              return (
                <motion.div
                  key={agent.model}
                  initial={{ opacity: 0, x: -8 }}
                  animate={tableVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  {/* Desktop row */}
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.model)}
                    className="hidden md:grid w-full grid-cols-[60px_1fr_80px_80px_100px_80px_120px] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer text-left bg-transparent border-none"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <RankBadge rank={idx + 1} />
                    <div className="flex items-center gap-3 min-w-0">
                      <AgentAvatar name={agent.model} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#E8E4DE] truncate">{agent.model}</p>
                      </div>
                    </div>
                    <span className="text-center text-[14px] font-mono text-[#9A9590]">{agent.auctions}</span>
                    <span className="text-center text-[14px] font-mono font-semibold text-[#C4A265]">{agent.wins}</span>
                    <div className="px-2">
                      <ScoreBar value={agent.avgScore} max={1} color={agent.avgScore >= 0.7 ? "#22C55E" : agent.avgScore >= 0.4 ? "#FDB913" : "#EF4444"} />
                    </div>
                    <span className="text-center text-[14px] font-mono font-semibold" style={{ color: agent.winRate >= 50 ? "#22C55E" : agent.winRate >= 25 ? "#FDB913" : "#78736E" }}>
                      {agent.winRate}%
                    </span>
                    <div className="flex justify-center"><SparkLine results={agent.recentResults} /></div>
                  </button>

                  {/* Mobile card */}
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.model)}
                    className="md:hidden w-full px-4 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer text-left bg-transparent border-none"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <RankBadge rank={idx + 1} />
                      <AgentAvatar name={agent.model} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#E8E4DE] truncate">{agent.model}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><p className="text-xs uppercase tracking-wider text-[#78736E]">Played</p><p className="text-sm font-mono text-[#9A9590]">{agent.auctions}</p></div>
                      <div><p className="text-xs uppercase tracking-wider text-[#78736E]">Wins</p><p className="text-sm font-mono font-semibold text-[#C4A265]">{agent.wins}</p></div>
                      <div><p className="text-xs uppercase tracking-wider text-[#78736E]">Win %</p><p className="text-sm font-mono font-semibold" style={{ color: agent.winRate >= 50 ? "#22C55E" : "#78736E" }}>{agent.winRate}%</p></div>
                    </div>
                    <div className="mt-2"><ScoreBar value={agent.avgScore} max={1} color={agent.avgScore >= 0.7 ? "#22C55E" : agent.avgScore >= 0.4 ? "#FDB913" : "#EF4444"} /></div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="px-5 py-4 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        {[
                          { label: "Best Score", value: agent.bestScore.toFixed(2), color: "#22C55E" },
                          { label: "Worst Score", value: agent.worstScore.toFixed(2), color: "#EF4444" },
                          { label: "Avg Spend", value: `₹${agent.avgSpend.toFixed(1)} Cr`, color: "#A855F7" },
                          { label: "Avg Squad", value: `${agent.avgSquadSize} players`, color: "#C4A265" },
                          { label: "Consistency", value: `${agent.consistency}%`, color: "#FDB913" },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-xs uppercase tracking-wider text-[#78736E]">{s.label}</p>
                            <p className="text-[16px] font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#78736E] mb-2">Recent Results</p>
                        <div className="flex flex-wrap gap-2">
                          {agent.recentResults.map((r) => (
                            <Link
                              key={r.auctionId}
                              href={`/results/${r.auctionId}`}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[rgba(196,162,101,0.2)] transition-colors no-underline"
                            >
                              <span className="text-sm font-bold font-mono" style={{ color: r.rank === 1 ? "#FDB913" : r.rank === 2 ? "#C0C0C0" : r.rank === 3 ? "#B8856A" : "#78736E" }}>
                                #{r.rank}
                              </span>
                              <span className="text-sm font-mono text-[#9A9590]">{r.score.toFixed(1)}</span>
                              <span className="text-xs text-[#625D58]">{new Date(r.date).toLocaleDateString()}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
