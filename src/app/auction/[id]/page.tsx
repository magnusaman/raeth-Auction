"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TEAMS, MIN_TEAMS, MAX_TEAMS } from "@/data/team-config";
import { PROVIDER_META, AVAILABLE_MODELS, PROVIDER_GROUPS, DEFAULT_SELECTIONS } from "@/lib/constants";
import AgentAvatar from "@/components/ui/AgentAvatar";
import TeamHealthBar from "@/components/ui/TeamHealthBar";

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-md text-[15px] font-semibold font-mono tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
    >
      {text}
    </span>
  );
}

interface TeamData {
  team_index: number;
  team_name: string;
  short_name: string;
  logo: string;
  color: string;
  agent_name: string;
  purse_remaining: number;
  squad_size: number;
  overseas_count: number;
  players: { name: string; role: string; price: number | null }[];
}
interface BidEntry {
  lot_number: number;
  player_name: string;
  player_role: string;
  team_index: number;
  agent_name: string;
  action: string;
  amount: number | null;
  reasoning: string;
  timestamp: string;
}
interface ExternalAgentInfo {
  team_index: number;
  connected: boolean;
  connected_at: string | null;
}
interface LiveData {
  status: string;
  teams: TeamData[];
  waiting_for_external: { team_index: number; team_name: string } | null;
  has_external_agents: boolean;
  external_agents: ExternalAgentInfo[];
  current_lot: {
    lot_number: number;
    player_name: string;
    player_role: string;
    player_sub_type: string;
    nationality: string;
    base_price: number;
    current_bid: number | null;
    current_bidder: { team_index: number; agent_name: string } | null;
    career_stats?: Record<string, number>;
  } | null;
  last_result: {
    lot_number: number;
    player_name: string;
    status: string;
    final_price: number | null;
    winner_team: { team_index: number; agent_name: string } | null;
  } | null;
  progress: { total_lots: number; completed: number; sold: number; unsold: number };
  recent_bids: BidEntry[];
}

export default function AuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "lobby" | "running" | "completed">("loading");
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [addingBots, setAddingBots] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [botsAdded, setBotsAdded] = useState(false);
  const [teamCount, setTeamCount] = useState(4);
  const [modelSelections, setModelSelections] = useState<string[]>(DEFAULT_SELECTIONS.slice(0, 4));
  const [externalTokens, setExternalTokens] = useState<Record<number, string>>({});
  const [_copiedToken, _setCopiedToken] = useState<number | null>(null);
  const [connectedAgents, setConnectedAgents] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [prevBidCount, setPrevBidCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAllReasoning, setShowAllReasoning] = useState(false);
  const [expandedBids, setExpandedBids] = useState<Set<string>>(new Set());
  const [customPurse, setCustomPurse] = useState(100);
  const [customMaxSquad, setCustomMaxSquad] = useState(20);
  const [customMinSquad, setCustomMinSquad] = useState(15);
  const [customMaxOverseas, setCustomMaxOverseas] = useState(8);
  const feedRef = useRef<HTMLDivElement>(null);
  // pollRef removed — now using SSE with auto-reconnect
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  function toggleBidReasoning(key: string) {
    setExpandedBids(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function addTeamSlot() {
    if (teamCount >= MAX_TEAMS) return;
    const next = teamCount + 1;
    setTeamCount(next);
    setModelSelections(prev => {
      const updated = [...prev];
      if (updated.length < next) {
        updated.push(AVAILABLE_MODELS[updated.length % AVAILABLE_MODELS.length].id);
      }
      return updated;
    });
  }

  function removeTeamSlot() {
    if (teamCount <= MIN_TEAMS) return;
    const next = teamCount - 1;
    setTeamCount(next);
    setModelSelections(prev => prev.slice(0, next));
  }

  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  const processLiveData = useCallback((data: any) => {
    setLiveData(data);

    if (data.external_agents) {
      for (const ext of data.external_agents) {
        if (ext.connected) {
          setConnectedAgents((prev) => {
            if (!prev.has(ext.team_index)) {
              const next = new Set(prev);
              next.add(ext.team_index);
              setNotification(`${TEAMS[ext.team_index]?.shortName || `T${ext.team_index}`} external agent connected!`);
              setTimeout(() => setNotification(null), 5000);
              return next;
            }
            return prev;
          });
        }
      }
    }

    if (data.status === "LOBBY") {
      setPhase("lobby");
      setBotsAdded(data.teams?.length >= teamCount);
    } else if (data.status === "RUNNING") {
      setPhase("running");
    } else if (data.status === "COMPLETED" || data.status === "STOPPED") {
      setPhase("completed");
    }
  }, [teamCount]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/auctions/${id}/live`);
      const data = await res.json();
      processLiveData(data);
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, [id, processLiveData]);

  // SSE with fallback to polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let stopped = false;

    function connectSSE() {
      if (stopped) return;
      setConnectionStatus("connecting");

      try {
        eventSource = new EventSource(`/api/v1/auctions/${id}/stream`);

        eventSource.onopen = () => {
          retryCount = 0;
          setConnectionStatus("connected");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data.error) {
              setConnectionStatus("connected");
              processLiveData(data);
              if (data.status === "COMPLETED" || data.status === "STOPPED") {
                eventSource?.close();
              }
            }
          } catch {}
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (stopped) return;

          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 15000);
          setConnectionStatus("reconnecting");

          retryTimeout = setTimeout(connectSSE, delay);
        };
      } catch {
        // SSE not supported — fall back to polling
        setConnectionStatus("connected");
        fallbackInterval = setInterval(fetchLive, 2000);
      }
    }

    // Initial fetch then connect SSE
    fetchLive().then(connectSSE);

    return () => {
      stopped = true;
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [id, fetchLive, processLiveData]);

  useEffect(() => {
    if (autoScroll && feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    if (liveData?.recent_bids) setPrevBidCount(liveData.recent_bids.length);
  }, [liveData?.recent_bids, autoScroll]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openDropdown !== null) {
        const ref = dropdownRefs.current[openDropdown];
        const menu = dropdownMenuRef.current;
        const target = e.target as Node;
        if (ref && !ref.contains(target) && (!menu || !menu.contains(target))) { setOpenDropdown(null); setDropdownPos(null); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  async function addBots() {
    setAddingBots(true);
    try {
      const agents = modelSelections.map((modelId) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        return { name: model?.label || modelId.split("/").pop() || "Agent", model: modelId };
      });
      // Send custom config alongside agents
      const res = await fetch(`/api/v1/auctions/${id}/add-bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents,
          config: {
            pursePerTeam: customPurse,
            maxSquadSize: customMaxSquad,
            minSquadSize: customMinSquad,
            maxOverseas: customMaxOverseas,
          },
        }),
      });
      const data = await res.json();
      if (data.agents) {
        const tokens: Record<number, string> = {};
        for (const agent of data.agents) {
          if (agent.external_token) tokens[agent.team_index] = agent.external_token;
        }
        if (Object.keys(tokens).length > 0) setExternalTokens(tokens);
      }
      await fetchLive();
    } catch (e) {
      console.error("Add bots error:", e);
    } finally {
      setAddingBots(false);
    }
  }

  async function handleStartAuction() {
    setStarting(true);
    try {
      if (!botsAdded) await addBots();
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(0);
      await fetch(`/api/v1/auctions/${id}/start`, { method: "POST" });
      await new Promise((r) => setTimeout(r, 600));
      setCountdown(null);
      await fetchLive();
    } catch (e) {
      console.error("Start error:", e);
      setCountdown(null);
    } finally {
      setStarting(false);
    }
  }

  async function stopAuction() {
    setStopping(true);
    try {
      await fetch(`/api/v1/auctions/${id}/stop`, { method: "POST" });
      await fetchLive();
    } catch (e) {
      console.error("Stop error:", e);
    } finally {
      setStopping(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="py-24 text-center">
        <div className="text-[40px] mb-4">{"\u{1F3CF}"}</div>
        <div className="text-[#A09888] text-base">Loading auction...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {notification && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 py-4 px-8 rounded-xl flex items-center gap-3 animate-bid-slide"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.09))",
            border: "1px solid rgba(16,185,129,0.31)",
            boxShadow: "0 8px 32px rgba(16,185,129,0.19), 0 0 60px rgba(16,185,129,0.06)",
          } as React.CSSProperties}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-neon-green inline-block" style={{ boxShadow: "0 0 10px #10B981" }} />
          <span className="text-base font-bold text-neon-green">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="bg-transparent border-none text-[#A09888] cursor-pointer text-lg p-0 hover:text-[#F5F0E8] transition-colors">Auctions</button>
          <span className="text-[#6B6560]">/</span>
          <span className="text-base font-mono text-[#F5F0E8]">{id?.slice(0, 12)}</span>
          <Badge text={liveData?.status || "LOBBY"} color={phase === "completed" ? "#10B981" : phase === "running" ? "#D4A853" : "#F97316"} />
        </div>
        <div className="flex gap-3">
          {phase === "running" && (
            <button onClick={stopAuction} disabled={stopping} className={`btn-danger text-sm py-2.5 px-5 ${stopping ? "opacity-50 cursor-not-allowed" : ""}`}>
              {stopping ? "Stopping..." : "Stop Auction"}
            </button>
          )}
          {phase === "completed" && (
            <button onClick={() => router.push(`/results/${id}`)} className="py-2.5 px-6 rounded-xl border-none text-[15px] font-bold cursor-pointer text-bg-primary" style={{ background: "linear-gradient(135deg, #10B981, #D4A853)", boxShadow: "0 4px 16px rgba(16,185,129,0.25)" }}>
              View Results
            </button>
          )}
        </div>
      </div>

      {/* === LOBBY PHASE === */}
      {phase === "lobby" && (
        <div>
          <AnimatePresence>
            {countdown !== null && (
              <motion.div key="countdown-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)" } as React.CSSProperties}>
                <AnimatePresence mode="wait">
                  <motion.div key={countdown} initial={{ scale: 0.3, opacity: 0, filter: "blur(16px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} exit={{ scale: 2.5, opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="text-center">
                    {countdown > 0 ? (
                      <div className="text-[140px] font-black font-mono leading-none text-gradient-brand" style={{ textShadow: "0 0 80px rgba(212,168,83,0.4), 0 0 160px rgba(139,122,74,0.2)" }}>{countdown}</div>
                    ) : (
                      <div>
                        <div className="text-[100px] font-black leading-none text-gradient-green" style={{ textShadow: "0 0 80px rgba(16,185,129,0.5)" }}>GO!</div>
                        <div className="text-xl text-[#A09888] mt-4 font-mono tracking-widest uppercase">Auction is live</div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="bento-card p-10 text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h2 className="text-4xl font-extrabold text-gradient-brand m-0">Raeth Arena</h2>
              <div className="relative group">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-help border border-[#6B6560] text-[#A09888] hover:text-[#D4A853] hover:border-[#D4A853] transition-colors">?</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm text-[#ccc] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-50" style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Want to understand the exact working? <a href="/about" className="text-[#D4A853] underline pointer-events-auto">Refer to the About page</a>
                </div>
              </div>
            </div>
            <p className="text-lg text-[#A09888] m-0">Assign an AI model to each franchise, then start the auction.</p>
          </motion.div>

          {/* Team Count Selector */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex items-center justify-center gap-5 mb-8">
            <button
              onClick={removeTeamSlot}
              disabled={teamCount <= MIN_TEAMS}
              className="w-10 h-10 flex items-center justify-center rounded-xl border text-lg font-bold cursor-pointer transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: teamCount <= MIN_TEAMS ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: teamCount <= MIN_TEAMS ? "#4a4540" : "#F5F0E8",
                opacity: teamCount <= MIN_TEAMS ? 0.5 : 1,
                cursor: teamCount <= MIN_TEAMS ? "not-allowed" : "pointer",
              }}
            >
              &ndash;
            </button>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-[#F5F0E8]">Teams:</span>
              <span className="text-2xl font-extrabold font-mono text-gradient-brand">{teamCount}</span>
            </div>
            <button
              onClick={addTeamSlot}
              disabled={teamCount >= MAX_TEAMS}
              className="w-10 h-10 flex items-center justify-center rounded-xl border text-lg font-bold cursor-pointer transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: teamCount >= MAX_TEAMS ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: teamCount >= MAX_TEAMS ? "#4a4540" : "#F5F0E8",
                opacity: teamCount >= MAX_TEAMS ? 0.5 : 1,
                cursor: teamCount >= MAX_TEAMS ? "not-allowed" : "pointer",
              }}
            >
              +
            </button>
            <span className="text-sm text-[#A09888] ml-1">{MIN_TEAMS}–{MAX_TEAMS} teams</span>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
            {Array.from({ length: teamCount }, (_, i) => i).map((idx) => {
              const team = liveData?.teams?.find((t) => t.team_index === idx);
              const filled = !!team;
              const selectedModel = AVAILABLE_MODELS.find((m) => m.id === modelSelections[idx]);
              const providerMeta = selectedModel ? PROVIDER_META[selectedModel.provider] : null;
              const isDropdownOpen = openDropdown === idx;
              const hasSelection = !!modelSelections[idx];
              const teamColor = TEAMS[idx]?.color || "#6B7280";
              const teamShort = TEAMS[idx]?.shortName || `T${idx + 1}`;
              const teamName = TEAMS[idx]?.name || `Team ${idx + 1}`;
              const teamLogo = TEAMS[idx]?.logo || "\u{1F3CF}";

              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }} whileHover={openDropdown === idx ? undefined : { y: -4, transition: { duration: 0.22 } }} className="bento-card relative overflow-visible" style={{ borderColor: filled ? `${teamColor}66` : hasSelection ? `${teamColor}30` : undefined, boxShadow: filled ? `0 8px 32px ${teamColor}18, 0 0 24px ${teamColor}10` : "none" } as React.CSSProperties}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: teamColor }} />
                  <div className="py-7 px-5 text-center">
                    <div className="text-[48px] mb-2 drop-shadow-lg">{teamLogo}</div>
                    <div className="text-2xl font-extrabold mb-1" style={{ color: teamColor }}>{teamShort}</div>
                    <div className="text-base text-[#A09888] mb-5">{teamName}</div>

                    {filled ? (
                      <div className="rounded-xl py-4 px-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${teamColor}20` }}>
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          {providerMeta && <span className="text-base">{providerMeta.icon}</span>}
                          <span className="text-base font-bold" style={{ color: externalTokens[idx] ? (connectedAgents.has(idx) ? "#10B981" : "#F97316") : "#10B981" }}>{team.agent_name}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: externalTokens[idx] ? (connectedAgents.has(idx) ? "#10B981" : "#F97316") : "#10B981", boxShadow: `0 0 6px ${externalTokens[idx] ? (connectedAgents.has(idx) ? "#10B981" : "#F97316") : "#10B981"}` }} />
                          <span className={`text-sm font-medium ${externalTokens[idx] ? (connectedAgents.has(idx) ? "text-neon-green" : "text-neon-orange") : "text-neon-green"}`}>
                            {externalTokens[idx] ? (connectedAgents.has(idx) ? "Connected" : "Waiting...") : "Ready"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div ref={(el) => { dropdownRefs.current[idx] = el; }} className="relative">
                        <button ref={(el) => { dropdownBtnRefs.current[idx] = el; }} onClick={() => { if (isDropdownOpen) { setOpenDropdown(null); setDropdownPos(null); } else { const btn = dropdownBtnRefs.current[idx]; if (btn) { const rect = btn.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 240) }); } setOpenDropdown(idx); } }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-[#111] text-left cursor-pointer transition-all duration-200" style={{ borderColor: isDropdownOpen ? `${teamColor}60` : "rgba(255,255,255,0.08)", boxShadow: isDropdownOpen ? `0 0 16px ${teamColor}15` : "none" }}>
                          {providerMeta && <span className="text-lg flex-shrink-0">{providerMeta.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#F5F0E8]">{selectedModel?.label || "Select model"}</div>
                            {selectedModel && <div className="text-xs font-medium mt-0.5" style={{ color: providerMeta?.color || "#6B6560" }}>{selectedModel.provider}</div>}
                          </div>
                          {hasSelection && !isDropdownOpen ? (
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"><circle cx="8" cy="8" r="7" stroke="#22C55E" strokeWidth="1.5" fill="rgba(34,197,94,0.12)" /><path d="M5 8l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#6B6560" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </button>

                        {typeof document !== "undefined" && createPortal(
                          <AnimatePresence>
                            {isDropdownOpen && (
                              <motion.div ref={dropdownMenuRef} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} className="fixed z-[9999] rounded-xl py-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", maxHeight: "320px", overflowY: "auto", top: dropdownPos?.top ?? 0, left: dropdownPos?.left ?? 0, width: dropdownPos?.width ?? 240 } as React.CSSProperties}>
                                {PROVIDER_GROUPS.map((group) => (
                                  <div key={group.provider}>
                                    <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                                      <span className="text-sm">{PROVIDER_META[group.provider]?.icon}</span>
                                      <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: PROVIDER_META[group.provider]?.color || "#6B6560" }}>{group.provider}</span>
                                    </div>
                                    {group.models.map((m) => {
                                      const isSelected = modelSelections[idx] === m.id;
                                      return (
                                        <button key={m.id} onClick={() => { const next = [...modelSelections]; next[idx] = m.id; setModelSelections(next); setOpenDropdown(null); setDropdownPos(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all duration-150 border-none" style={{ background: isSelected ? `${PROVIDER_META[m.provider]?.color || "#6B6560"}12` : "transparent" }} onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? `${PROVIDER_META[m.provider]?.color || "#6B6560"}12` : "transparent"; }}>
                                          <span className="text-sm font-semibold text-[#F5F0E8] flex-1">{m.label}</span>
                                          {isSelected && <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
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
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>


          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="bento-card p-7 mb-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: "#D4A853" }} />
              <span className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color: "#D4A853" }}>Auction Settings</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {/* Purse per team */}
              <div>
                <label className="block text-xs text-[#A09888] uppercase tracking-wider mb-2 font-semibold">Purse (Cr)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={10}
                    value={customPurse}
                    onChange={(e) => setCustomPurse(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #D4A853 ${((customPurse - 50) / 150) * 100}%, rgba(255,255,255,0.08) ${((customPurse - 50) / 150) * 100}%)`, accentColor: "#D4A853" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#F5F0E8] min-w-[48px] text-right">{customPurse}</span>
                </div>
                <p className="text-xs text-[#6B6560] mt-1">50-200 Cr budget per team</p>
              </div>
              {/* Max squad */}
              <div>
                <label className="block text-xs text-[#A09888] uppercase tracking-wider mb-2 font-semibold">Max Squad</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={25}
                    step={1}
                    value={customMaxSquad}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCustomMaxSquad(v);
                      if (customMinSquad > v) setCustomMinSquad(v);
                    }}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #D4A853 ${((customMaxSquad - 10) / 15) * 100}%, rgba(255,255,255,0.08) ${((customMaxSquad - 10) / 15) * 100}%)`, accentColor: "#D4A853" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#F5F0E8] min-w-[32px] text-right">{customMaxSquad}</span>
                </div>
                <p className="text-xs text-[#6B6560] mt-1">Max players per squad</p>
              </div>
              {/* Min squad */}
              <div>
                <label className="block text-xs text-[#A09888] uppercase tracking-wider mb-2 font-semibold">Min Squad</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={5}
                    max={customMaxSquad}
                    step={1}
                    value={customMinSquad}
                    onChange={(e) => setCustomMinSquad(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #10B981 ${((customMinSquad - 5) / Math.max(1, customMaxSquad - 5)) * 100}%, rgba(255,255,255,0.08) ${((customMinSquad - 5) / Math.max(1, customMaxSquad - 5)) * 100}%)`, accentColor: "#10B981" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#F5F0E8] min-w-[32px] text-right">{customMinSquad}</span>
                </div>
                <p className="text-xs text-[#6B6560] mt-1">Min players required</p>
              </div>
              {/* Max overseas */}
              <div>
                <label className="block text-xs text-[#A09888] uppercase tracking-wider mb-2 font-semibold">Max Overseas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={customMaxSquad}
                    step={1}
                    value={customMaxOverseas}
                    onChange={(e) => setCustomMaxOverseas(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #F59E0B ${(customMaxOverseas / Math.max(1, customMaxSquad)) * 100}%, rgba(255,255,255,0.08) ${(customMaxOverseas / Math.max(1, customMaxSquad)) * 100}%)`, accentColor: "#F59E0B" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#F5F0E8] min-w-[32px] text-right">{customMaxOverseas}</span>
                </div>
                <p className="text-xs text-[#6B6560] mt-1">Max overseas players</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="flex justify-center">
            <motion.button onClick={handleStartAuction} disabled={starting || addingBots || !modelSelections.slice(0, teamCount).every(Boolean)} whileHover={!starting && !addingBots ? { scale: 1.03, y: -2 } : undefined} whileTap={!starting && !addingBots ? { scale: 0.98 } : undefined} className={`py-4 px-16 rounded-2xl border-none text-lg font-black tracking-wider transition-colors duration-200 relative overflow-hidden ${starting || addingBots ? "bg-[#222] text-[#A09888] cursor-not-allowed" : "text-white cursor-pointer"}`} style={starting || addingBots ? undefined : { background: "linear-gradient(135deg, #D4A853, #3B82F6)", boxShadow: "0 6px 32px rgba(212,168,83,0.3), 0 0 60px rgba(59,130,246,0.1)" }}>
              {!starting && !addingBots && <span className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)", backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite" }} />}
              <span className="relative z-10">{addingBots ? "Preparing Agents..." : starting ? "Starting..." : "START AUCTION"}</span>
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* === RUNNING / COMPLETED PHASE === */}
      {(phase === "running" || phase === "completed") && liveData && (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr_320px] grid-cols-1">
          {/* LEFT: Team Cards */}
          <div className="flex flex-col gap-3">
            {liveData.teams.map((team) => {
              const tColor = TEAMS[team.team_index]?.color || team.color || "#6B7280";
              return (
              <div key={team.team_index} className="rounded-xl py-4 px-5" style={{ background: `linear-gradient(135deg, #0a0a0a, ${tColor}08)`, borderTop: `1px solid ${tColor}30`, borderRight: `1px solid ${tColor}30`, borderBottom: `1px solid ${tColor}30`, borderLeft: `4px solid ${tColor}`, boxShadow: `0 2px 12px ${tColor}10` }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <AgentAvatar name={team.agent_name} size="sm" />
                  <div>
                    <div className="text-base font-extrabold font-display" style={{ color: tColor }}>{team.short_name}</div>
                    <div className="text-[12px] text-[#A09888] truncate max-w-[160px]">{team.agent_name}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-xl font-extrabold font-mono" style={{ color: team.purse_remaining > 50 ? "#22C55E" : team.purse_remaining >= 20 ? "#F59E0B" : "#EF4444" }}>{team.purse_remaining.toFixed(1)}</div>
                    <div className="text-[11px] text-[#6B6560] uppercase tracking-wide">Purse (Cr)</div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold font-mono text-[#F5F0E8]">{team.squad_size}</div>
                    <div className="text-[11px] text-[#6B6560] uppercase tracking-wide">Players</div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold font-mono" style={{ color: "#D4A853" }}>{team.overseas_count}</div>
                    <div className="text-sm text-[#6B6560] uppercase tracking-wide">O/S</div>
                  </div>
                </div>
                <div className="mt-3">
                  <TeamHealthBar current={team.purse_remaining} max={100} label={`₹${team.purse_remaining.toFixed(0)} Cr`} />
                </div>
              </div>
              );
            })}
          </div>

          {/* CENTER: Current Lot + Feed */}
          <div className="flex flex-col gap-4">
            {liveData.current_lot && (() => {
              const lot = liveData.current_lot!;
              const cs = lot.career_stats || {};
              const role = lot.player_role;
              const statsLine = (() => {
                if ((role === "BATSMAN" || role === "WICKET_KEEPER") && cs.battingAvg) return `Avg ${cs.battingAvg.toFixed(1)} | SR ${(cs.strikeRate || 0).toFixed(1)}`;
                if (role === "BOWLER" && cs.economy) return `Econ ${cs.economy.toFixed(1)} | Wkt ${cs.wickets || 0}`;
                if (role === "ALL_ROUNDER") { const parts: string[] = []; if (cs.battingAvg) parts.push(`Avg ${cs.battingAvg.toFixed(1)}`); if (cs.economy) parts.push(`Econ ${cs.economy.toFixed(1)}`); return parts.join(" | ") || null; }
                return null;
              })();
              return (
                <div className="rounded-xl p-6 neon-border" style={{ background: "linear-gradient(135deg, #0a0a0a, rgba(212,168,83,0.06))", border: "1px solid rgba(212,168,83,0.25)", boxShadow: "0 0 30px rgba(212,168,83,0.07)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#A09888]">LOT #{lot.lot_number}</span>
                      <span className="status-badge status-live animate-pulse text-sm">LIVE</span>
                      {connectionStatus === "reconnecting" && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold text-accent-gold bg-accent-gold/10 border border-accent-gold/20">
                          <span className="w-2 h-2 border border-accent-gold border-t-transparent rounded-full animate-spin" />
                          RECONNECTING
                        </span>
                      )}
                    </div>
                    <Badge text={lot.player_role} color="#D4A853" />
                  </div>
                  <div className="text-[32px] font-extrabold text-[#F5F0E8] mb-2">{lot.player_name}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-base text-[#A09888]">{lot.player_sub_type} | {lot.nationality}</span>
                    {statsLine && <span className="text-base font-mono font-semibold px-3 py-1 rounded-lg bg-[#111] text-[#D4A853] border border-[#D4A853]/20">{statsLine}</span>}
                  </div>
                  <div className="flex gap-8 items-end">
                    <div>
                      <div className="text-sm text-[#A09888] uppercase tracking-wide mb-1">Base Price</div>
                      <div className="text-2xl font-bold font-mono text-[#A09888]">{"\u20B9"}{lot.base_price} Cr</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#A09888] uppercase tracking-wide mb-1">Current Bid</div>
                      <div className="text-[36px] font-black font-mono text-gradient-gold leading-none">{lot.current_bid ? `\u20B9${Number(lot.current_bid).toFixed(1)} Cr` : "\u2014"}</div>
                    </div>
                    {lot.current_bidder && (
                      <div>
                        <div className="text-sm text-[#A09888] uppercase tracking-wide mb-1">Leading</div>
                        <div className="text-2xl font-extrabold" style={{ color: TEAMS[lot.current_bidder.team_index]?.color || "#6B7280" }}>{TEAMS[lot.current_bidder.team_index]?.shortName || `T${lot.current_bidder.team_index + 1}`}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}


            {liveData.last_result && !liveData.current_lot && (
              <div className="rounded-xl p-6" style={{ background: "#0a0a0a", border: `1px solid ${liveData.last_result.status === "SOLD" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                <div className="text-sm text-[#A09888] mb-2">LAST LOT</div>
                <div className="text-2xl font-extrabold text-[#F5F0E8] mb-3">{liveData.last_result.player_name}</div>
                <Badge text={liveData.last_result.status === "SOLD" ? `SOLD to ${TEAMS[liveData.last_result.winner_team?.team_index ?? 0]?.shortName || "??"} for \u20B9${Number(liveData.last_result.final_price).toFixed(1)} Cr` : "UNSOLD"} color={liveData.last_result.status === "SOLD" ? "#10B981" : "#EF4444"} />
              </div>
            )}

            {/* Progress */}
            <div className="rounded-xl py-4 px-5" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#A09888] uppercase font-bold tracking-wide">Progress</span>
                <span className="text-base font-mono text-[#F5F0E8] font-bold">{liveData.progress.completed} / {liveData.progress.total_lots}</span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 h-full rounded-l-full transition-all duration-500" style={{ width: `${(liveData.progress.sold / liveData.progress.total_lots) * 100}%`, background: "linear-gradient(90deg, #10B981, #22C55E)", boxShadow: "0 0 8px rgba(16,185,129,0.3)" }} />
                <div className="absolute top-0 h-full transition-all duration-500" style={{ left: `${(liveData.progress.sold / liveData.progress.total_lots) * 100}%`, width: `${(liveData.progress.unsold / liveData.progress.total_lots) * 100}%`, background: "linear-gradient(90deg, #EF4444, #F87171)", borderRadius: liveData.progress.sold === 0 ? "9999px 0 0 9999px" : "0" }} />
              </div>
              <div className="flex gap-5 mt-2">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#22C55E" }} /><span className="text-sm text-neon-green font-semibold">Sold: {liveData.progress.sold}</span></div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#EF4444" }} /><span className="text-sm text-neon-red font-semibold">Unsold: {liveData.progress.unsold}</span></div>
                <span className="text-sm text-[#A09888] ml-auto font-mono">{liveData.progress.total_lots - liveData.progress.completed} remaining</span>
              </div>
            </div>

            {/* Bid Feed */}
            <div className="rounded-xl flex-1 flex flex-col overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="py-3 px-5 border-b flex items-center gap-2.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(212,168,83,0.04)" }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: phase === "running" ? "#EF4444" : "#10B981", boxShadow: `0 0 8px ${phase === "running" ? "#EF4444" : "#10B981"}` }} />
                <span className="text-base font-bold uppercase tracking-widest font-mono" style={{ color: "#D4A853" }}>Agent Decisions</span>
                <span className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-2 rounded-full text-sm font-bold font-mono" style={{ background: "rgba(212,168,83,0.15)", color: "#D4A853", border: "1px solid rgba(212,168,83,0.3)" }}>{liveData.recent_bids.length}</span>

                {/* Show/Hide All Reasoning toggle */}
                <button
                  onClick={() => setShowAllReasoning(v => !v)}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150"
                  style={{
                    background: showAllReasoning ? "rgba(212,168,83,0.12)" : "rgba(255,255,255,0.04)",
                    color: showAllReasoning ? "#D4A853" : "#666",
                    border: `1px solid ${showAllReasoning ? "rgba(212,168,83,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {showAllReasoning ? "Hide All Reasoning" : "Show All Reasoning"}
                </button>

                <button onClick={() => setAutoScroll((v) => !v)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150" style={{ background: autoScroll ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", color: autoScroll ? "#22C55E" : "#666", border: `1px solid ${autoScroll ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}` }} title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  {autoScroll ? "Auto" : "Manual"}
                </button>
              </div>
              <div ref={feedRef} className="flex-1 overflow-y-auto max-h-[500px] py-2">
                {liveData.recent_bids.length === 0 ? (
                  <div className="p-12 text-center text-[#A09888] text-base">{phase === "running" ? "Waiting for first decision..." : "No bids recorded"}</div>
                ) : (
                  <AnimatePresence initial={false}>
                    {[...liveData.recent_bids].reverse().map((bid, i) => {
                      const isBid = bid.action === "bid";
                      const isNew = i >= liveData.recent_bids.length - 2;
                      const bidKey = `${bid.timestamp}-${bid.team_index}-${bid.lot_number}-${bid.action}`;
                      const bidColor = TEAMS[bid.team_index]?.color || "#6B7280";
                      const bidShort = TEAMS[bid.team_index]?.shortName || `T${bid.team_index + 1}`;
                      const bidLogo = TEAMS[bid.team_index]?.logo || "\u{1F3CF}";
                      const isReasoningOpen = showAllReasoning || expandedBids.has(bidKey);
                      return (
                        <motion.div key={bidKey} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="py-3 px-4 mx-2 my-1.5 rounded-xl" style={{ background: isNew ? (isBid ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)") : "transparent", borderTop: `1px solid ${isNew ? (isBid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)") : "transparent"}`, borderRight: `1px solid ${isNew ? (isBid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)") : "transparent"}`, borderBottom: `1px solid ${isNew ? (isBid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)") : "transparent"}`, borderLeft: `4px solid ${isBid ? "#10B981" : "#EF4444"}` }}>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="text-xl">{bidLogo}</span>
                            <span className="text-lg font-extrabold" style={{ color: bidColor }}>{bidShort}</span>
                            <Badge text={isBid ? "BID" : "PASS"} color={isBid ? "#10B981" : "#EF4444"} />
                            {isBid && bid.amount && <span className="text-xl font-extrabold font-mono text-gradient-gold ml-1">{"\u20B9"}{Number(bid.amount).toFixed(1)} Cr</span>}
                            <span className="text-sm text-[#6B6560] ml-auto font-mono">Lot #{bid.lot_number}</span>
                          </div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <span className="text-base font-semibold text-[#F5F0E8]">{bid.player_name}</span>
                            <span className="text-sm px-2 py-0.5 rounded bg-[#111] text-[#A09888]">{bid.player_role}</span>
                          </div>
                          {bid.reasoning && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleBidReasoning(bidKey)}
                                className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 transition-colors duration-150"
                                style={{ color: isReasoningOpen ? "#D4A853" : "#555" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isReasoningOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                Reasoning
                              </button>
                              {isReasoningOpen && (
                                <div className="text-sm text-[#A09888] leading-relaxed py-2.5 px-3.5 rounded-lg bg-[#111] border border-[#222] mt-2">
                                  {bid.reasoning}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Squad Lists */}
          <div className="flex flex-col gap-3">
            {liveData.teams.map((team) => {
              const sqColor = TEAMS[team.team_index]?.color || team.color || "#6B7280";
              const sqLogo = TEAMS[team.team_index]?.logo || team.logo || "\u{1F3CF}";
              return (
              <div key={team.team_index} className="rounded-xl py-4 px-4" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{sqLogo}</span>
                  <span className="text-base font-extrabold" style={{ color: sqColor }}>{team.short_name} Squad</span>
                  <span className="text-sm text-[#A09888] ml-auto font-mono">{team.squad_size} players</span>
                </div>
                {team.players.length === 0 ? (
                  <div className="text-sm text-[#6B6560] py-2">No players yet</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-base py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <span className="text-[#F5F0E8]">{p.name}</span>
                        <span className="font-mono text-gradient-gold text-sm font-semibold">{p.price ? `\u20B9${Number(p.price).toFixed(1)}` : "\u2014"}</span>
                      </div>
                    ))}
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
