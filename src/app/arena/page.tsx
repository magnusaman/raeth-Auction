"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ReplayViewer from "@/components/ReplayViewer";
import AgentAvatar from "@/components/ui/AgentAvatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { TEAM_COLORS, TEAM_SHORT } from "@/lib/constants";
import { TEAMS } from "@/data/team-config";

interface AuctionSummary {
  auction_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  has_evaluation: boolean;
  teams: {
    team_index: number;
    team_name: string;
    agent_name: string;
    squad_size: number;
    purse_remaining: number;
  }[];
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export default function ArenaPage() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "evaluated">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [replayOpen, setReplayOpen] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/auctions")
      .then((r) => r.json())
      .then((d) =>
        setAuctions(
          (d.auctions || []).filter((a: AuctionSummary) => a.status === "COMPLETED")
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = auctions
    .filter((a) => filter === "all" || a.has_evaluation)
    .filter((a) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        a.auction_id.toLowerCase().includes(term) ||
        a.teams.some(
          (t) =>
            t.agent_name.toLowerCase().includes(term) ||
            t.team_name.toLowerCase().includes(term)
        )
      );
    });

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4A853]">
          Archive
        </span>
        <h1 className="mt-1 text-3xl font-bold font-display text-[#F5F0E8]">
          Replays
        </h1>
        <p className="mt-1 text-[15px] text-[#A09888]">
          Browse completed auctions and review agent decisions
        </p>
      </motion.div>

      {/* Filters */}
      {auctions.length > 0 && (
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6560]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by ID, model, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-[#F5F0E8] placeholder:text-[#4a4540] transition-colors outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,168,83,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(212,168,83,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div
            className="flex gap-1 rounded-lg p-0.5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {(["all", "evaluated"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? "text-[#F5F0E8]"
                    : "text-[#6B6560] hover:text-[#A09888]"
                }`}
                style={
                  filter === f
                    ? { background: "rgba(212,168,83,0.1)", color: "#D4A853" }
                    : undefined
                }
              >
                {f === "all" ? "All" : "With Results"}
              </button>
            ))}
          </div>

          <span className="text-sm text-[#6B6560] font-mono ml-auto">
            {filtered.length} auction{filtered.length !== 1 ? "s" : ""}
          </span>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl skeleton"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="broadcast-card py-20 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-[#A09888] mb-2 font-display text-lg">
            {auctions.length === 0
              ? "No completed auctions to replay yet"
              : "No auctions match your search"}
          </p>
          {auctions.length === 0 && (
            <Link href="/" className="btn-primary text-sm py-2.5 px-6 mt-4 inline-block">
              Create Your First Auction
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid md:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filtered.map((a) => {
            const totalPlayers = a.teams.reduce((s, t) => s + t.squad_size, 0);
            const totalSpent = a.teams.reduce(
              (s, t) => s + (100 - (t.purse_remaining || 0)),
              0
            );
            const dateStr = a.completed_at
              ? new Date(a.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : new Date(a.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

            return (
              <motion.div
                key={a.auction_id}
                variants={cardVariants}
                className="broadcast-card overflow-hidden group"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() =>
                    router.push(
                      a.has_evaluation
                        ? `/results/${a.auction_id}`
                        : `/auction/${a.auction_id}`
                    )
                  }
                >
                  {/* Top row: ID + status badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-[#6B6560] group-hover:text-[#D4A853] transition-colors">
                      {a.auction_id.slice(0, 16)}...
                    </span>
                    <div className="flex items-center gap-2">
                      {a.has_evaluation && (
                        <StatusBadge status="EVALUATED" size="sm" />
                      )}
                      <StatusBadge status="COMPLETED" size="sm" />
                    </div>
                  </div>

                  {/* Teams row */}
                  <div className="flex gap-2 mb-4">
                    {a.teams.map((t) => (
                      <div
                        key={t.team_index}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{
                          background: `${TEAM_COLORS[t.team_index]}12`,
                          border: `1px solid ${TEAM_COLORS[t.team_index]}30`,
                        }}
                      >
                        <span className="text-sm">
                          {TEAMS[t.team_index]?.logo}
                        </span>
                        <span
                          className="text-xs font-bold font-mono"
                          style={{ color: TEAM_COLORS[t.team_index] }}
                        >
                          {TEAM_SHORT[t.team_index]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Agent models with avatars */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                    {a.teams.map((t) => (
                      <div
                        key={t.team_index}
                        className="flex items-center gap-1.5"
                      >
                        <AgentAvatar name={t.agent_name} size="sm" />
                        <span className="text-sm text-[#A09888]">
                          <span
                            className="font-semibold"
                            style={{ color: TEAM_COLORS[t.team_index] }}
                          >
                            {TEAM_SHORT[t.team_index]}
                          </span>{" "}
                          {t.agent_name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="stat-orb px-3 py-1.5">
                      <span className="font-mono font-semibold text-[#F5F0E8] text-sm">
                        {totalPlayers}
                      </span>
                      <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                        players
                      </span>
                    </div>
                    <div className="stat-orb px-3 py-1.5">
                      <span className="font-mono font-semibold text-[#F5F0E8] text-sm">
                        ₹{totalSpent.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                        Cr spent
                      </span>
                    </div>
                    <span className="text-xs text-[#6B6560] ml-auto font-mono">
                      {dateStr}
                    </span>
                  </div>
                </div>

                {/* Replay toggle */}
                <div className="flex" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplayOpen(replayOpen === a.auction_id ? null : a.auction_id);
                    }}
                    className="btn-ghost flex-1 justify-center gap-2 py-2.5 text-xs font-semibold rounded-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      {replayOpen === a.auction_id ? (
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                    {replayOpen === a.auction_id ? "Close Replay" : "Replay Bids"}
                  </button>
                  <div className="w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(a.has_evaluation ? `/results/${a.auction_id}` : `/auction/${a.auction_id}`);
                    }}
                    className="btn-ghost flex-1 justify-center gap-2 py-2.5 text-xs font-semibold rounded-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    {a.has_evaluation ? "View Results" : "View Auction"}
                  </button>
                </div>

                {/* Replay viewer */}
                {replayOpen === a.auction_id && (
                  <ReplayViewer auctionId={a.auction_id} />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
