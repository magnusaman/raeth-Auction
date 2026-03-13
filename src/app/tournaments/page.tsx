"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "@/components/ui/StatusBadge";
import AgentAvatar from "@/components/ui/AgentAvatar";
import { AVAILABLE_MODELS, PROVIDER_META, PROVIDER_GROUPS, DEFAULT_SELECTIONS, TEAM_COLORS } from "@/lib/constants";

const DEFAULT_PREDICTOR_MODELS = DEFAULT_SELECTIONS;

const SEASONS = [
  { id: "S1", label: "S1", desc: "Season 1 — 59 matches", matches: 59 },
  { id: "S2", label: "S2", desc: "Season 2 — 74 matches", matches: 74 },
  { id: "S3", label: "S3", desc: "Season 3 — 73 matches", matches: 73 },
  { id: "S4", label: "S4", desc: "Season 4 — 71 matches", matches: 71 },
];

interface TournamentSummary {
  tournament_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  auction_id: string | null;
  data_source: string;
  eval_season: string;
  champion: { name: string; shortName: string; logo: string } | null;
  standings: { team_index: number; team_name: string; logo: string; wins: number; losses: number; points: number }[];
  total_matches: number;
  agent_count: number;
  has_evaluation: boolean;
}

interface AuctionOption {
  auction_id: string;
  status: string;
  created_at: string;
  teams: { team_index: number; team_name: string; agent_name: string; squad_size: number }[];
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [auctions, setAuctions] = useState<AuctionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [mode, setMode] = useState<"real" | "synthetic">("real");
  const [selectedSeason, setSelectedSeason] = useState("S4");
  const [setupSource, setSetupSource] = useState<string | null>(null);
  const [predictorModels, setPredictorModels] = useState<string[]>([...DEFAULT_PREDICTOR_MODELS]);
  const [agentCount, setAgentCount] = useState(4);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const router = useRouter();

  useEffect(() => {
    Promise.all([fetchTournaments(), fetchAuctions()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openDropdown !== null) {
        const ref = dropdownContainerRefs.current[openDropdown];
        const menu = dropdownMenuRef.current;
        const target = e.target as Node;
        if (ref && !ref.contains(target) && (!menu || !menu.contains(target))) { setOpenDropdown(null); setDropdownPos(null); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  async function fetchTournaments() {
    try {
      const res = await fetch("/api/v1/tournaments");
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch (e) { console.error("Failed to fetch tournaments:", e); }
  }

  async function fetchAuctions() {
    try {
      const res = await fetch("/api/v1/auctions");
      const data = await res.json();
      setAuctions((data.auctions || []).filter((a: AuctionOption) => a.status === "COMPLETED"));
    } catch (e) { console.error("Failed to fetch auctions:", e); }
  }

  async function launchTournament() {
    setRunning(true);
    try {
      const agents = predictorModels.slice(0, agentCount).map((modelId, i) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        const label = model?.label || modelId.split("/").pop() || "Agent";
        const suffix = AGENT_SUFFIXES[i] || `Agent${i + 1}`;
        return { name: `${label}-${suffix}`, model: modelId };
      });

      const payload: any = { agents };
      if (mode === "real") {
        payload.seasonId = selectedSeason;
      } else if (setupSource) {
        payload.auctionId = setupSource;
      }

      const res = await fetch("/api/v1/tournaments/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.tournament_id) {
        router.push(`/tournaments/${data.tournament_id}`);
      }
    } catch (e) { console.error("Failed to start tournament:", e); }
    finally { setRunning(false); }
  }

  async function deleteTournament(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/tournaments/${id}/delete`, { method: "DELETE" });
      if (res.ok) {
        setTournaments((prev) => prev.filter((t) => t.tournament_id !== id));
      } else {
        console.error("Delete failed:", await res.text());
        await fetchTournaments();
      }
    } catch (err) { console.error("Delete failed:", err); }
    finally { setDeleting(null); }
  }

  async function stopTournament(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading(`stop-${id}`);
    try {
      await fetch(`/api/v1/tournaments/${id}/stop`, { method: "POST" });
      await fetchTournaments();
    } catch (err) { console.error("Stop failed:", err); }
    finally { setActionLoading(null); }
  }

  async function clearPredictions(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete ALL predictions for this tournament?")) return;
    setActionLoading(`clear-${id}`);
    try {
      await fetch(`/api/v1/tournaments/${id}/clear-predictions`, { method: "POST" });
      await fetchTournaments();
    } catch (err) { console.error("Clear failed:", err); }
    finally { setActionLoading(null); }
  }

  function addAgent() {
    if (agentCount >= 10) return;
    const next = agentCount + 1;
    setAgentCount(next);
    setPredictorModels(prev => {
      const updated = [...prev];
      if (updated.length < next) {
        updated.push(AVAILABLE_MODELS[updated.length % AVAILABLE_MODELS.length].id);
      }
      return updated;
    });
  }
  function removeAgent() {
    if (agentCount <= 2) return;
    const next = agentCount - 1;
    setAgentCount(next);
    setPredictorModels(prev => prev.slice(0, next));
  }

  const filteredTournaments = tournaments.filter((t) => {
    if (searchQuery && !t.tournament_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (sourceFilter === "real" && t.data_source !== "real") return false;
    if (sourceFilter === "synthetic" && t.data_source === "real") return false;
    return true;
  });

  const completedCount = tournaments.filter((t) => t.status === "COMPLETED").length;
  const currentSeasonInfo = SEASONS.find((s) => s.id === selectedSeason);

  const AGENT_COLORS = ["#D4A853", "#4ADE80", "#CD7F32", "#F5C842", "#EF4444", "#8B7A4A", "#F97316", "#A09888", "#E8D5A3", "#F59E0B"];
  const AGENT_SUFFIXES = ["Oracle", "Forecaster", "Seer", "Analyst", "Strategist", "Prophet", "Navigator", "Visionary", "Sentinel", "Scholar"];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <span className="text-base font-mono font-semibold tracking-[0.2em] uppercase" style={{ color: "#D4A853" }}>Predictive Reasoning</span>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-5xl font-bold text-gradient-brand m-0">TourBench</h1>
            <div className="relative group">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-help border border-[#6B6560] text-[#A09888] hover:text-[#D4A853] hover:border-[#F5F0E8] transition-colors">?</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm text-[#ccc] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-50" style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Want to understand the exact working? <a href="/about" className="text-[#D4A853] underline pointer-events-auto">Refer to the About page</a>
              </div>
            </div>
          </div>
          <p className="mt-3 text-lg text-[#A09888]">
            AI agents predict match outcomes. Evaluated on accuracy, calibration, and reasoning.
          </p>
        </div>
        <button
          onClick={() => setShowSetup(!showSetup)}
          disabled={running}
          className="btn-gradient text-base py-3 px-7 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "Launching..." : showSetup ? "Cancel" : "New Tournament"}
        </button>
      </div>

      {/* ═══ SETUP PANEL ═══ */}
      {showSetup && !running && (
        <div className="bento-card mb-12 overflow-hidden">
          <div className="px-7 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-xl font-bold text-[#F5F0E8]">Tournament Setup</h3>
          </div>

          <div className="p-7">
            {/* Mode Picker */}
            <div className="mb-9">
              <div className="text-sm font-bold tracking-[0.15em] uppercase text-[#A09888] mb-3">
                Data Source
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode("real")}
                  className={`px-6 py-3 text-base font-medium border rounded-xl transition-all duration-150 cursor-pointer ${
                    mode === "real"
                      ? "border-amber-500/35 bg-amber-500/8 text-amber-400"
                      : "border-[#2a2520] text-[#A09888] hover:border-[#4a4540]"
                  }`}
                >
                  Real Match Data (S1–S4)
                </button>
                <button
                  onClick={() => setMode("synthetic")}
                  className={`px-6 py-3 text-base font-medium border rounded-xl transition-all duration-150 cursor-pointer ${
                    mode === "synthetic"
                      ? "border-[#4a4540] bg-white/5 text-[#F5F0E8]"
                      : "border-[#2a2520] text-[#A09888] hover:border-[#4a4540]"
                  }`}
                >
                  Synthetic (Simulated)
                </button>
              </div>
            </div>

            {/* Season Picker */}
            {mode === "real" && (
              <div className="mb-9">
                <div className="text-sm font-bold tracking-[0.15em] uppercase text-[#A09888] mb-3">
                  Evaluation Season
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SEASONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSeason(s.id)}
                      className={`relative px-5 py-4 border rounded-xl transition-all duration-150 text-left cursor-pointer ${
                        selectedSeason === s.id
                          ? "border-amber-500/35 bg-amber-500/8"
                          : "border-[#2a2520] hover:border-[#4a4540]"
                      }`}
                    >
                      <div className={`text-xl font-bold font-mono ${
                        selectedSeason === s.id ? "text-amber-400" : "text-[#F5F0E8]"
                      }`}>
                        {s.label}
                      </div>
                      <div className="text-base text-[#A09888] mt-1">
                        {s.matches} matches
                      </div>
                      {selectedSeason === s.id && (
                        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-base text-[#A09888] mt-3">
                  Agents see historical data prior to the evaluation season. No future data leakage.
                </div>
              </div>
            )}

            {/* Source Picker */}
            {mode === "synthetic" && (
              <div className="mb-9">
                <div className="text-sm font-bold tracking-[0.15em] uppercase text-[#A09888] mb-3">
                  Squad Source
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSetupSource(null)}
                    className={`px-5 py-3 text-base font-medium border rounded-xl transition-all duration-150 cursor-pointer ${
                      !setupSource
                        ? "border-[#4a4540] bg-white/5 text-[#F5F0E8]"
                        : "border-[#2a2520] text-[#A09888] hover:border-[#4a4540]"
                    }`}
                  >
                    Standalone (Random Squads)
                  </button>
                  {auctions.map((a) => (
                    <button
                      key={a.auction_id}
                      onClick={() => setSetupSource(a.auction_id)}
                      className={`px-5 py-3 text-base font-medium border rounded-xl transition-all duration-150 cursor-pointer ${
                        setupSource === a.auction_id
                          ? "border-[#4a4540] bg-white/5 text-[#F5F0E8]"
                          : "border-[#2a2520] text-[#A09888] hover:border-[#4a4540]"
                      }`}
                    >
                      Auction {a.auction_id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Predictor Model Selection */}
            <div className="mb-9">
              <div className="text-sm font-bold tracking-[0.15em] uppercase text-[#A09888] mb-3">
                Predictor Agents ({agentCount} models)
              </div>
              <div className="flex items-center gap-4 mb-4">
                <button onClick={removeAgent} disabled={agentCount <= 2} className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#4a4540] transition-colors cursor-pointer" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#F5F0E8" }}>&minus;</button>
                <span className="text-lg font-bold font-mono text-[#F5F0E8] w-6 text-center">{agentCount}</span>
                <button onClick={addAgent} disabled={agentCount >= 10} className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#4a4540] transition-colors cursor-pointer" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#F5F0E8" }}>+</button>
                <span className="text-sm text-[#A09888]">2–10 agents</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: agentCount }, (_, i) => i).map((idx) => {
                  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === predictorModels[idx]);
                  const providerMeta = selectedModel ? PROVIDER_META[selectedModel.provider] : null;
                  const isOpen = openDropdown === idx;
                  const agentColor = AGENT_COLORS[idx];
                  return (
                    <div key={idx} ref={(el) => { dropdownContainerRefs.current[idx] = el; }} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-base font-bold font-mono mb-3" style={{ color: agentColor }}>
                        Agent {idx + 1} — {AGENT_SUFFIXES[idx]}
                      </div>
                      <button
                        ref={(el) => { dropdownBtnRefs.current[idx] = el; }}
                        onClick={() => {
                          if (isOpen) { setOpenDropdown(null); setDropdownPos(null); }
                          else {
                            const btn = dropdownBtnRefs.current[idx];
                            if (btn) { const rect = btn.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 240) }); }
                            setOpenDropdown(idx);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#0a0a0a] text-left cursor-pointer transition-all duration-200"
                        style={{ borderColor: isOpen ? `${agentColor}60` : "rgba(255,255,255,0.08)", boxShadow: isOpen ? `0 0 16px ${agentColor}15` : "none" }}
                      >
                        {providerMeta && <span className="text-lg flex-shrink-0">{providerMeta.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#F5F0E8]">{selectedModel?.label || "Select model"}</div>
                          {selectedModel && <div className="text-xs font-medium mt-0.5" style={{ color: providerMeta?.color || "#94A3B8" }}>{selectedModel.provider}</div>}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      {typeof document !== "undefined" && createPortal(
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div ref={dropdownMenuRef} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} className="fixed z-[9999] rounded-xl py-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", maxHeight: "320px", overflowY: "auto", top: dropdownPos?.top ?? 0, left: dropdownPos?.left ?? 0, width: dropdownPos?.width ?? 240 } as React.CSSProperties}>
                              {PROVIDER_GROUPS.map((group) => (
                                <div key={group.provider}>
                                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                                    <span className="text-sm">{PROVIDER_META[group.provider]?.icon}</span>
                                    <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: PROVIDER_META[group.provider]?.color || "#94A3B8" }}>{group.provider}</span>
                                  </div>
                                  {group.models.map((m) => {
                                    const isSel = predictorModels[idx] === m.id;
                                    return (
                                      <button key={m.id} onClick={() => { const next = [...predictorModels]; next[idx] = m.id; setPredictorModels(next); setOpenDropdown(null); setDropdownPos(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all duration-150 border-none" style={{ background: isSel ? `${PROVIDER_META[m.provider]?.color || "#94A3B8"}12` : "transparent" }} onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSel ? `${PROVIDER_META[m.provider]?.color || "#94A3B8"}12` : "transparent"; }}>
                                        <span className="text-sm font-semibold text-[#F5F0E8] flex-1">{m.label}</span>
                                        {isSel && <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>,
                        document.body
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Button */}
            <div className="text-center pt-3">
              <button
                onClick={launchTournament}
                className="btn-gradient text-base py-3.5 px-12 font-bold tracking-wide group"
              >
                {mode === "real" ? `LAUNCH ${selectedSeason} TOURNAMENT` : "LAUNCH TOURNAMENT"}
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <div className="text-sm text-[#A09888] mt-4">
                {mode === "real"
                  ? `${currentSeasonInfo?.matches || 0} matches \u00b7 ${agentCount} agents \u00b7 ~${(currentSeasonInfo?.matches || 0) * agentCount} LLM predictions`
                  : `14 matches \u00b7 ${agentCount} agents \u00b7 ~${14 * agentCount} LLM predictions`
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden mb-12" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="p-8 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-4xl font-bold font-mono text-[#F5F0E8]">{tournaments.length}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#A09888]">Tournaments</div>
        </div>
        <div className="p-8 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-4xl font-bold font-mono text-[#F5F0E8]">{completedCount}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#A09888]">Completed</div>
        </div>
        <div className="p-8 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
          <div className="text-4xl font-bold font-mono text-[#F5F0E8]">
            {tournaments.length > 0 ? tournaments.reduce((sum, t) => sum + t.total_matches, 0) : 0}
          </div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#A09888]">Total Matches</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6560]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by tournament ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-[#F5F0E8] placeholder-[#555] outline-none transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#F5F0E8] outline-none cursor-pointer appearance-none"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", minWidth: "140px" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PREDICTING">Predicting</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#F5F0E8] outline-none cursor-pointer appearance-none"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", minWidth: "140px" }}
        >
          <option value="ALL">All Sources</option>
          <option value="real">Real Data</option>
          <option value="synthetic">Synthetic</option>
        </select>
      </div>

      {/* Tournament Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(212,168,83,0.04)" }}>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#F97316" }} />
            <span className="text-base font-bold tracking-[0.15em] uppercase font-mono" style={{ color: "#D4A853" }}>
              Tournament Runs
            </span>
          </div>
          <span className="text-base text-[#A09888] font-mono">
            {filteredTournaments.length === tournaments.length
              ? `${tournaments.length} total`
              : `${filteredTournaments.length} of ${tournaments.length}`}
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center text-base text-[#A09888]">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-[#F5F0E8] mb-2">No tournaments yet</p>
            <p className="text-sm text-[#A09888]">Click &quot;New Tournament&quot; to run a predictive reasoning evaluation</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-[#F5F0E8] mb-2">No matching tournaments</p>
            <p className="text-sm text-[#A09888]">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {["Run ID", "Status", "Source", "Season", "Date", "Matches", "Standings", "Agents", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-wider text-[#A09888] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTournaments.map((t) => (
                <tr
                  key={t.tournament_id}
                  onClick={() => router.push(`/tournaments/${t.tournament_id}`)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-white/[0.02] border-b"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-base text-[#999]">{t.tournament_id.slice(0, 10)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-bold font-mono tracking-wider px-3 py-1.5 border rounded-md ${
                      t.data_source === "real"
                        ? "text-amber-400 bg-amber-500/8 border-amber-500/15"
                        : t.auction_id
                        ? "text-[#8B5CF6] bg-[#8B5CF6]/8 border-[#8B5CF6]/15"
                        : "text-[#A09888] bg-white/3 border-[#2a2520]"
                    }`}>
                      {t.data_source === "real" ? "REAL DATA" : t.auction_id ? "AUCTION" : "SYNTHETIC"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {t.eval_season ? (
                      <span className="font-mono text-base font-bold text-amber-400">{t.eval_season}</span>
                    ) : (
                      <span className="text-[#6B6560]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-base text-[#999]">
                    {new Date(t.completed_at || t.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-base text-[#F5F0E8]">{t.total_matches}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2.5 flex-wrap">
                      {t.standings.slice(0, 4).map((s) => (
                        <span key={s.team_index} className="font-mono text-base font-semibold" style={{ color: TEAM_COLORS[s.team_index] || "#888" }}>
                          {s.team_name}:{s.points}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-base font-bold text-[#F5F0E8]">{t.agent_count}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.status === "PREDICTING" && (
                        <button
                          onClick={(e) => stopTournament(t.tournament_id, e)}
                          disabled={actionLoading === `stop-${t.tournament_id}`}
                          className="text-base text-neon-red hover:text-red-400 px-3 py-1.5 border border-neon-red/15 hover:border-neon-red/35 bg-neon-red/5 rounded-lg transition-all duration-150 disabled:opacity-30 cursor-pointer"
                        >
                          {actionLoading === `stop-${t.tournament_id}` ? "..." : "Stop"}
                        </button>
                      )}
                      {(t.status === "COMPLETED" || t.status === "CANCELLED") && t.agent_count > 0 && (
                        <button
                          onClick={(e) => clearPredictions(t.tournament_id, e)}
                          disabled={actionLoading === `clear-${t.tournament_id}`}
                          className="text-base text-neon-orange hover:text-orange-400 px-3 py-1.5 border border-neon-orange/15 hover:border-neon-orange/35 bg-neon-orange/5 rounded-lg transition-all duration-150 disabled:opacity-30 cursor-pointer"
                        >
                          {actionLoading === `clear-${t.tournament_id}` ? "..." : "Clear"}
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteTournament(t.tournament_id, e)}
                        disabled={deleting === t.tournament_id}
                        className="text-base text-[#A09888] hover:text-neon-red px-3 py-1.5 border border-transparent hover:border-neon-red/15 rounded-lg transition-all duration-150 disabled:opacity-30 cursor-pointer"
                      >
                        {deleting === t.tournament_id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

