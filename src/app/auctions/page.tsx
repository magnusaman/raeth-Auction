"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import StatusBadge from "@/components/ui/StatusBadge";
import AgentAvatar from "@/components/ui/AgentAvatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import { TEAM_COLORS, TEAM_SHORT } from "@/lib/constants";
import { TEAMS } from "@/data/team-config";

interface AuctionSummary {
  auction_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  teams: {
    team_index: number;
    team_name: string;
    agent_name: string;
    purse_remaining: number;
    squad_size: number;
  }[];
  has_evaluation: boolean;
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const router = useRouter();

  useEffect(() => {
    fetchAuctions();
  }, []);

  async function fetchAuctions() {
    try {
      const res = await fetch("/api/v1/auctions");
      const data = await res.json();
      setAuctions(data.auctions || []);
    } catch (e) {
      console.error("Failed to fetch auctions:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createNewAuction() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/auctions/create", { method: "POST" });
      const data = await res.json();
      if (data.auction_id) router.push(`/auction/${data.auction_id}`);
    } catch (e) {
      console.error("Failed to create auction:", e);
      toast.error("Failed to create auction");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAuction(id: string) {
    if (deleting) return;
    setDeleting(id);
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/v1/auctions/${id}/delete`, { method: "DELETE" });
      setAuctions((prev) => prev.filter((a) => a.auction_id !== id));
      toast.success("Auction deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete auction");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = auctions
    .filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.auction_id.toLowerCase().includes(q) ||
        a.teams.some(
          (t) =>
            t.agent_name.toLowerCase().includes(q) ||
            t.team_name.toLowerCase().includes(q)
        )
      );
    });

  const completedCount = auctions.filter((a) => a.status === "COMPLETED").length;
  const runningCount = auctions.filter((a) => a.status === "RUNNING" || a.status === "BIDDING").length;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-12">
        <div>
          <span className="text-sm md:text-base font-mono font-semibold tracking-[0.2em] uppercase" style={{ color: "#C4A265" }}>
            Strategic Bidding
          </span>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-2xl md:text-5xl font-bold text-gradient-brand m-0">AuctionBench</h1>
            <div className="relative group">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-help border border-[#8A857F] text-[#9A9590] hover:text-[#C4A265] hover:border-[#E8E4DE] transition-colors">
                ?
              </span>
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm text-[#ccc] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-50"
                style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Want to understand the exact working?{" "}
                <a href="/about" className="text-[#C4A265] underline pointer-events-auto">
                  Refer to the About page
                </a>
              </div>
            </div>
          </div>
          <p className="mt-3 text-lg text-[#9A9590]">
            AI agents bid on real IPL players with configurable budgets. Evaluated by 10 graders.
          </p>
        </div>
        <button
          onClick={createNewAuction}
          disabled={creating}
          className="btn-gradient text-base py-3 px-7 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "New Auction"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden mb-12" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="p-6 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-2xl md:text-4xl font-bold font-mono text-[#E8E4DE]">{auctions.length}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#9A9590]">Auctions</div>
        </div>
        <div className="p-6 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-2xl md:text-4xl font-bold font-mono text-[#E8E4DE]">{completedCount}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#9A9590]">Completed</div>
        </div>
        <div className="p-6 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-2xl md:text-4xl font-bold font-mono text-[#4ADE80]">{runningCount}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#9A9590]">Running</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A857F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by agent, team, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-[#E8E4DE] placeholder-[#555] outline-none transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#E8E4DE] outline-none cursor-pointer appearance-none"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", minWidth: "140px" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="LOBBY">Lobby</option>
          <option value="RUNNING">Running</option>
          <option value="BIDDING">Bidding</option>
          <option value="COMPLETED">Completed</option>
          <option value="STOPPED">Stopped</option>
        </select>
      </div>

      {/* Auction Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(196,162,101,0.04)" }}>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
            <span className="text-base font-bold tracking-[0.15em] uppercase font-mono" style={{ color: "#C4A265" }}>
              Auction Runs
            </span>
          </div>
          <span className="text-base text-[#9A9590] font-mono">
            {filtered.length === auctions.length
              ? `${auctions.length} total`
              : `${filtered.length} of ${auctions.length}`}
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center text-base text-[#9A9590]">Loading auctions...</div>
        ) : auctions.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "rgba(196,162,101,0.08)", border: "1px solid rgba(196,162,101,0.12)" }}>
              <svg className="w-6 h-6" style={{ color: "#C4A265" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            </div>
            <p className="text-base text-[#E8E4DE] mb-2">No auctions yet</p>
            <p className="text-sm text-[#9A9590] mb-6">Create your first auction to get started</p>
            <button onClick={createNewAuction} disabled={creating} className="btn-gradient py-3 px-8 disabled:opacity-40">
              {creating ? "Creating..." : "Create First Auction"}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-[#E8E4DE] mb-2">No matching auctions</p>
            <p className="text-sm text-[#9A9590]">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {["#", "Status", "Teams", "Agents", "Players", "Spent", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-wider text-[#9A9590] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const totalPlayers = a.teams.reduce((s, t) => s + t.squad_size, 0);
                  const totalSpent = a.teams.reduce((s, t) => s + (100 - (t.purse_remaining || 0)), 0);
                  const auctionNum = auctions.length - auctions.indexOf(a);

                  return (
                    <tr
                      key={a.auction_id}
                      onClick={() =>
                        router.push(
                          a.status === "COMPLETED" || a.has_evaluation
                            ? `/results/${a.auction_id}`
                            : `/auction/${a.auction_id}`
                        )
                      }
                      className="cursor-pointer transition-colors duration-150 hover:bg-white/[0.02] border-b"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-base font-bold text-[#C4A265]">#{auctionNum}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          {a.teams.map((t) => (
                            <span
                              key={t.team_index}
                              className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                              style={{
                                background: `${TEAM_COLORS[t.team_index]}15`,
                                color: TEAM_COLORS[t.team_index],
                                border: `1px solid ${TEAM_COLORS[t.team_index]}30`,
                              }}
                            >
                              {TEAM_SHORT[t.team_index]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex -space-x-1.5">
                          {a.teams.map((t) => (
                            <AgentAvatar key={t.team_index} name={t.agent_name} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-base text-[#E8E4DE]">{totalPlayers}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-base text-[#E8E4DE]">
                          {totalSpent > 0 ? `₹${totalSpent.toFixed(0)} Cr` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-base text-[#999]">
                        {timeAgo(a.completed_at || a.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                a.has_evaluation
                                  ? `/results/${a.auction_id}`
                                  : `/auction/${a.auction_id}`
                              );
                            }}
                            className="text-sm text-[#9A9590] hover:text-[#C4A265] px-3 py-1.5 border border-transparent hover:border-[#C4A265]/15 rounded-lg transition-all duration-150 cursor-pointer"
                          >
                            {a.has_evaluation ? "Results" : "View"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(a.auction_id);
                            }}
                            disabled={deleting === a.auction_id}
                            className="text-sm text-[#9A9590] hover:text-neon-red px-3 py-1.5 border border-transparent hover:border-neon-red/15 rounded-lg transition-all duration-150 disabled:opacity-30 cursor-pointer"
                          >
                            {deleting === a.auction_id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteAuction(confirmDeleteId)}
        title="Delete Auction"
        description="This auction and all its data will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Auction"
        variant="danger"
      />
    </div>
  );
}
