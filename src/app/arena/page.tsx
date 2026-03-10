"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TEAM_SHORT = ["MI", "CSK", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"];
const TEAM_COLORS = ["#004BA0", "#FDB913", "#EC1C24", "#3A225D", "#FF822A", "#EA1A85", "#004C93", "#DD1F2D", "#1C1C2B", "#A72056"];
const TEAM_ICONS = ["🏏", "🦁", "👑", "⚡", "🌅", "🏰", "🦅", "🗡️", "🛡️", "🦁"];

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

export default function ArenaPage() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "evaluated">("all");
  const [searchTerm, setSearchTerm] = useState("");
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
      <div className="mb-8">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">
          Archive
        </span>
        <h1 className="mt-1 text-3xl font-bold text-text-primary">Replays</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Browse completed auctions and review agent decisions
        </p>
      </div>

      {/* Filters */}
      {auctions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
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
              className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
          </div>

          <div className="flex gap-1 bg-bg-surface border border-border-subtle rounded-lg p-0.5">
            {(["all", "evaluated"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-bg-elevated text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {f === "all" ? "All" : "With Results"}
              </button>
            ))}
          </div>

          <span className="text-sm text-text-muted font-mono ml-auto">
            {filtered.length} auction{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 bg-bg-surface border border-border-subtle rounded-xl shimmer"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-surface border border-border-default rounded-xl py-20 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-text-secondary mb-2">
            {auctions.length === 0
              ? "No completed auctions to replay yet"
              : "No auctions match your search"}
          </p>
          {auctions.length === 0 && (
            <Link href="/" className="btn-primary text-sm py-2.5 px-6 mt-4 inline-block">
              Create Your First Auction
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
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
              <button
                key={a.auction_id}
                onClick={() =>
                  router.push(
                    a.has_evaluation
                      ? `/results/${a.auction_id}`
                      : `/auction/${a.auction_id}`
                  )
                }
                className="bg-bg-surface border border-border-default rounded-xl p-5 text-left hover:border-border-hover hover:bg-bg-elevated/30 transition-all duration-200 cursor-pointer group"
              >
                {/* Top row: ID + status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-text-muted group-hover:text-accent-cyan transition-colors">
                    {a.auction_id.slice(0, 16)}...
                  </span>
                  <div className="flex items-center gap-2">
                    {a.has_evaluation && (
                      <span className="text-xs font-bold font-mono tracking-wider text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-2 py-0.5 rounded">
                        EVALUATED
                      </span>
                    )}
                    <span className="text-xs font-bold font-mono tracking-wider text-neon-green bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded">
                      COMPLETED
                    </span>
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
                        {TEAM_ICONS[t.team_index]}
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

                {/* Models used */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                  {a.teams.map((t) => (
                    <span
                      key={t.team_index}
                      className="text-sm text-text-muted"
                    >
                      <span
                        className="font-semibold"
                        style={{ color: TEAM_COLORS[t.team_index] }}
                      >
                        {TEAM_SHORT[t.team_index]}
                      </span>{" "}
                      {t.agent_name}
                    </span>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-3 border-t border-border-subtle">
                  <span className="text-sm text-text-muted">
                    <span className="font-mono font-semibold text-text-secondary">
                      {totalPlayers}
                    </span>{" "}
                    players sold
                  </span>
                  <span className="text-sm text-text-muted">
                    <span className="font-mono font-semibold text-text-secondary">
                      ₹{totalSpent.toFixed(0)}
                    </span>{" "}
                    Cr spent
                  </span>
                  <span className="text-sm text-text-muted ml-auto">
                    {dateStr}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
