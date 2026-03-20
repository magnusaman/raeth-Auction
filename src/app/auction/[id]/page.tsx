"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TEAMS, MIN_TEAMS, MAX_TEAMS } from "@/data/team-config";
import { PROVIDER_META, AVAILABLE_MODELS, PROVIDER_GROUPS, DEFAULT_SELECTIONS } from "@/lib/constants";
import AgentAvatar from "@/components/ui/AgentAvatar";
import TeamHealthBar from "@/components/ui/TeamHealthBar";
import { toast } from "sonner";

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
  const [externalToggles, setExternalToggles] = useState<Record<number, boolean>>({});
  const [registeringExternal, setRegisteringExternal] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
  const [openrouterKey, setOpenrouterKey] = useState("");
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

  function copyToClipboard(text: string, fieldKey: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function toggleExternal(idx: number) {
    const isCurrentlyOn = externalToggles[idx];
    if (isCurrentlyOn) {
      // Turn OFF — revert to normal model
      setExternalToggles(prev => ({ ...prev, [idx]: false }));
      setExternalTokens(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      setConnectedAgents(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      // Restore default model for this slot
      setModelSelections(prev => {
        const next = [...prev];
        next[idx] = DEFAULT_SELECTIONS[idx % DEFAULT_SELECTIONS.length];
        return next;
      });
      return;
    }

    // Turn ON — register external agent and get token
    setRegisteringExternal(idx);
    setExternalToggles(prev => ({ ...prev, [idx]: true }));
    setModelSelections(prev => {
      const next = [...prev];
      next[idx] = "external";
      return next;
    });

    try {
      const res = await fetch(`/api/v1/auctions/${id}/external/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_index: idx }),
      });
      const data = await res.json();
      if (data.token) {
        setExternalTokens(prev => ({ ...prev, [idx]: data.token }));
      }
    } catch (e) {
      console.error("External register error:", e);
      // Revert on failure
      setExternalToggles(prev => ({ ...prev, [idx]: false }));
      setModelSelections(prev => {
        const next = [...prev];
        next[idx] = DEFAULT_SELECTIONS[idx % DEFAULT_SELECTIONS.length];
        return next;
      });
    } finally {
      setRegisteringExternal(null);
    }
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

  // Poll for external agent connections when toggles are active
  useEffect(() => {
    const activeTokens = Object.entries(externalTokens);
    if (activeTokens.length === 0 || phase !== "lobby") return;

    // Check which ones still need to connect
    const unconnected = activeTokens.filter(([idx]) => !connectedAgents.has(parseInt(idx)));
    if (unconnected.length === 0) return;

    const interval = setInterval(async () => {
      for (const [idx, token] of unconnected) {
        try {
          const res = await fetch(`/api/v1/auctions/${id}/external/state?token=${token}`);
          if (res.ok) {
            const data = await res.json();
            // If we got a valid response, the agent has connected (first poll marks as connected)
            if (data.your_team) {
              setConnectedAgents(prev => {
                if (!prev.has(parseInt(idx))) {
                  const next = new Set(prev);
                  next.add(parseInt(idx));
                  setNotification(`${TEAMS[parseInt(idx)]?.shortName || `T${idx}`} external agent connected!`);
                  setTimeout(() => setNotification(null), 5000);
                  return next;
                }
                return prev;
              });
            }
          }
        } catch { /* ignore poll errors */ }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [externalTokens, connectedAgents, phase, id]);

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
          openrouterApiKey: openrouterKey || undefined,
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
    if (!openrouterKey.trim()) {
      toast.error("Please enter your OpenRouter API key to start the auction");
      return;
    }
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
        <div className="text-[#9A9590] text-base">Loading auction...</div>
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
          <button onClick={() => router.push("/")} className="bg-transparent border-none text-[#9A9590] cursor-pointer text-lg p-0 hover:text-[#E8E4DE] transition-colors">Auctions</button>
          <span className="text-[#78736E]">/</span>
          <span className="text-base font-mono text-[#E8E4DE]">{id?.slice(0, 12)}</span>
          <Badge text={liveData?.status || "LOBBY"} color={phase === "completed" ? "#10B981" : phase === "running" ? "#C4A265" : "#F97316"} />
        </div>
        <div className="flex gap-3">
          {phase === "running" && (
            <button onClick={stopAuction} disabled={stopping} className={`btn-danger text-sm py-2.5 px-5 ${stopping ? "opacity-50 cursor-not-allowed" : ""}`}>
              {stopping ? "Stopping..." : "Stop Auction"}
            </button>
          )}
          {phase === "completed" && (
            <button onClick={() => router.push(`/results/${id}`)} className="py-2.5 px-6 rounded-xl border-none text-[15px] font-bold cursor-pointer text-bg-primary" style={{ background: "linear-gradient(135deg, #10B981, #C4A265)", boxShadow: "0 4px 16px rgba(16,185,129,0.25)" }}>
              View Results
            </button>
          )}
        </div>
      </div>

      {/* === LOBBY PHASE === */}
      {phase === "lobby" && (
        <div>
          {typeof document !== "undefined" && createPortal(
            <AnimatePresence>
              {countdown !== null && (
                <motion.div key="countdown-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)" } as React.CSSProperties}>
                  <AnimatePresence mode="wait">
                    <motion.div key={countdown} initial={{ scale: 0.3, opacity: 0, filter: "blur(16px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} exit={{ scale: 2.5, opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="text-center">
                      {countdown > 0 ? (
                        <div className="text-[140px] font-black font-mono leading-none text-gradient-brand" style={{ textShadow: "0 0 80px rgba(196,162,101,0.4), 0 0 160px rgba(139,122,74,0.2)" }}>{countdown}</div>
                      ) : (
                        <div>
                          <div className="text-[100px] font-black leading-none text-gradient-green" style={{ textShadow: "0 0 80px rgba(16,185,129,0.5)" }}>GO!</div>
                          <div className="text-xl text-[#9A9590] mt-4 font-mono tracking-widest uppercase">Auction is live</div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="bento-card p-10 text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h2 className="text-4xl font-extrabold text-gradient-brand m-0">Raeth Arena</h2>
              <div className="relative group">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-help border border-[#78736E] text-[#9A9590] hover:text-[#C4A265] hover:border-[#C4A265] transition-colors">?</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm text-[#ccc] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-50" style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Want to understand the exact working? <a href="/about" className="text-[#C4A265] underline pointer-events-auto">Refer to the About page</a>
                </div>
              </div>
            </div>
            <p className="text-lg text-[#9A9590] m-0">Assign an AI model to each franchise, then start the auction.</p>
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
                color: teamCount <= MIN_TEAMS ? "#625D58" : "#E8E4DE",
                opacity: teamCount <= MIN_TEAMS ? 0.5 : 1,
                cursor: teamCount <= MIN_TEAMS ? "not-allowed" : "pointer",
              }}
            >
              &ndash;
            </button>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-[#E8E4DE]">Teams:</span>
              <span className="text-2xl font-extrabold font-mono text-gradient-brand">{teamCount}</span>
            </div>
            <button
              onClick={addTeamSlot}
              disabled={teamCount >= MAX_TEAMS}
              className="w-10 h-10 flex items-center justify-center rounded-xl border text-lg font-bold cursor-pointer transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: teamCount >= MAX_TEAMS ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: teamCount >= MAX_TEAMS ? "#625D58" : "#E8E4DE",
                opacity: teamCount >= MAX_TEAMS ? 0.5 : 1,
                cursor: teamCount >= MAX_TEAMS ? "not-allowed" : "pointer",
              }}
            >
              +
            </button>
            <span className="text-sm text-[#9A9590] ml-1">{MIN_TEAMS}–{MAX_TEAMS} teams</span>
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
                    <div className="text-base text-[#9A9590] mb-5">{teamName}</div>

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
                      <div>
                        {/* Model dropdown — hidden when external toggle is ON */}
                        {!externalToggles[idx] && (
                          <div ref={(el) => { dropdownRefs.current[idx] = el; }} className="relative">
                            <button ref={(el) => { dropdownBtnRefs.current[idx] = el; }} onClick={() => { if (isDropdownOpen) { setOpenDropdown(null); setDropdownPos(null); } else { const btn = dropdownBtnRefs.current[idx]; if (btn) { const rect = btn.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 240) }); } setOpenDropdown(idx); } }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-[#111] text-left cursor-pointer transition-all duration-200" style={{ borderColor: isDropdownOpen ? `${teamColor}60` : "rgba(255,255,255,0.08)", boxShadow: isDropdownOpen ? `0 0 16px ${teamColor}15` : "none" }}>
                              {providerMeta && <span className="text-lg flex-shrink-0">{providerMeta.icon}</span>}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[#E8E4DE]">{selectedModel?.label || "Select model"}</div>
                                {selectedModel && <div className="text-xs font-medium mt-0.5" style={{ color: providerMeta?.color || "#78736E" }}>{selectedModel.provider}</div>}
                              </div>
                              {hasSelection && !isDropdownOpen ? (
                                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"><circle cx="8" cy="8" r="7" stroke="#22C55E" strokeWidth="1.5" fill="rgba(34,197,94,0.12)" /><path d="M5 8l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#78736E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                                          <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: PROVIDER_META[group.provider]?.color || "#78736E" }}>{group.provider}</span>
                                        </div>
                                        {group.models.map((m) => {
                                          const isSelected = modelSelections[idx] === m.id;
                                          return (
                                            <button key={m.id} onClick={() => { const next = [...modelSelections]; next[idx] = m.id; setModelSelections(next); setOpenDropdown(null); setDropdownPos(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all duration-150 border-none" style={{ background: isSelected ? `${PROVIDER_META[m.provider]?.color || "#78736E"}12` : "transparent" }} onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? `${PROVIDER_META[m.provider]?.color || "#78736E"}12` : "transparent"; }}>
                                              <span className="text-sm font-semibold text-[#E8E4DE] flex-1">{m.label}</span>
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

                        {/* External Agent active label */}
                        {externalToggles[idx] && (
                          <div className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl mb-3" style={{ background: "rgba(196,162,101,0.06)", border: "1px solid rgba(196,162,101,0.2)" }}>
                            <span className="text-base">🔌</span>
                            <span className="text-sm font-bold" style={{ color: "#C4A265" }}>External Agent</span>
                            {registeringExternal === idx && (
                              <span className="w-3 h-3 border-2 border-[#C4A265] border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        )}

                        {/* External Agent Toggle */}
                        <button
                          onClick={() => toggleExternal(idx)}
                          disabled={registeringExternal !== null}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 mt-3 rounded-lg cursor-pointer transition-all duration-200 border"
                          style={{
                            background: externalToggles[idx] ? "rgba(196,162,101,0.08)" : "rgba(255,255,255,0.02)",
                            borderColor: externalToggles[idx] ? "rgba(196,162,101,0.2)" : "rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🔌</span>
                            <span className="text-xs font-semibold" style={{ color: externalToggles[idx] ? "#C4A265" : "#78736E" }}>External Agent</span>
                          </div>
                          {/* Toggle switch */}
                          <div
                            className="relative w-9 h-5 rounded-full transition-all duration-200"
                            style={{ background: externalToggles[idx] ? "#C4A265" : "rgba(255,255,255,0.1)" }}
                          >
                            <div
                              className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                              style={{
                                background: externalToggles[idx] ? "#fff" : "#78736E",
                                left: externalToggles[idx] ? "18px" : "2px",
                                boxShadow: externalToggles[idx] ? "0 0 6px rgba(196,162,101,0.4)" : "none",
                              }}
                            />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>


          {/* ── External Agent Connection Panel ── */}
          {Object.keys(externalTokens).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(10,10,10,0.95), rgba(196,162,101,0.04))",
                border: "1px solid rgba(196,162,101,0.2)",
                boxShadow: "0 4px 24px rgba(196,162,101,0.06)",
              }}
            >
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(196,162,101,0.12)", background: "rgba(196,162,101,0.04)" }}>
                <span className="text-lg">🔌</span>
                <span className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color: "#C4A265" }}>External Agent Connection</span>
                <span className="ml-auto text-xs font-mono px-2 py-1 rounded-md" style={{ color: "#9A9590", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {Object.keys(externalTokens).length} slot{Object.keys(externalTokens).length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="p-6 space-y-5">
                {Object.entries(externalTokens).map(([teamIdx, token]) => {
                  const tIdx = parseInt(teamIdx);
                  const tColor = TEAMS[tIdx]?.color || "#C4A265";
                  const tName = TEAMS[tIdx]?.shortName || `T${tIdx + 1}`;
                  const isConnected = connectedAgents.has(tIdx);
                  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                  const stateUrl = `${baseUrl}/api/v1/auctions/${id}/external/state?token=${token}`;
                  const bidUrl = `${baseUrl}/api/v1/auctions/${id}/external/bid?token=${token}`;

                  return (
                    <div key={teamIdx} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${tColor}20` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-base">{TEAMS[tIdx]?.logo || "🏏"}</span>
                        <span className="text-base font-extrabold" style={{ color: tColor }}>{tName}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isConnected ? "text-[#10B981]" : "text-[#F97316]"}`} style={{ background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(249,115,22,0.1)", border: `1px solid ${isConnected ? "rgba(16,185,129,0.2)" : "rgba(249,115,22,0.2)"}` }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: isConnected ? "#10B981" : "#F97316", boxShadow: `0 0 6px ${isConnected ? "#10B981" : "#F97316"}` }} />
                          {isConnected ? "Connected" : "Awaiting connection"}
                        </span>
                      </div>

                      {/* Token */}
                      <div className="mb-3">
                        <div className="text-xs text-[#78736E] uppercase tracking-wider font-semibold mb-1.5">API Token</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono px-3 py-2 rounded-lg truncate" style={{ background: "rgba(0,0,0,0.4)", color: "#C4A265", border: "1px solid rgba(196,162,101,0.15)" }}>{token}</code>
                          <button onClick={() => copyToClipboard(token, `token-${teamIdx}`)} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all" style={{ background: copiedField === `token-${teamIdx}` ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", color: copiedField === `token-${teamIdx}` ? "#10B981" : "#9A9590", border: `1px solid ${copiedField === `token-${teamIdx}` ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            {copiedField === `token-${teamIdx}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* State Endpoint */}
                      <div className="mb-3">
                        <div className="text-xs text-[#78736E] uppercase tracking-wider font-semibold mb-1.5">Poll State <span className="text-[#625D58] normal-case">(GET)</span></div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono px-3 py-2 rounded-lg truncate" style={{ background: "rgba(0,0,0,0.4)", color: "#9A9590", border: "1px solid rgba(255,255,255,0.06)" }}>{stateUrl}</code>
                          <button onClick={() => copyToClipboard(stateUrl, `state-${teamIdx}`)} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all" style={{ background: copiedField === `state-${teamIdx}` ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", color: copiedField === `state-${teamIdx}` ? "#10B981" : "#9A9590", border: `1px solid ${copiedField === `state-${teamIdx}` ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            {copiedField === `state-${teamIdx}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Bid Endpoint */}
                      <div className="mb-4">
                        <div className="text-xs text-[#78736E] uppercase tracking-wider font-semibold mb-1.5">Submit Bid <span className="text-[#625D58] normal-case">(POST)</span></div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono px-3 py-2 rounded-lg truncate" style={{ background: "rgba(0,0,0,0.4)", color: "#9A9590", border: "1px solid rgba(255,255,255,0.06)" }}>{bidUrl}</code>
                          <button onClick={() => copyToClipboard(bidUrl, `bid-${teamIdx}`)} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all" style={{ background: copiedField === `bid-${teamIdx}` ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", color: copiedField === `bid-${teamIdx}` ? "#10B981" : "#9A9590", border: `1px solid ${copiedField === `bid-${teamIdx}` ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                            {copiedField === `bid-${teamIdx}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Quick Start */}
                      <div className="rounded-lg px-4 py-3" style={{ background: "rgba(196,162,101,0.04)", border: "1px solid rgba(196,162,101,0.1)" }}>
                        <div className="text-xs text-[#C4A265] font-bold uppercase tracking-wider mb-2">Quick Start</div>
                        <div className="text-sm text-[#9A9590] leading-relaxed">
                          1. Read <code className="text-xs px-1.5 py-0.5 rounded bg-black/40 text-[#C4A265]">{baseUrl}/skill.md</code> for full API docs<br/>
                          2. Poll the state endpoint until <code className="text-xs px-1.5 py-0.5 rounded bg-black/40 text-[#C4A265]">your_turn: true</code><br/>
                          3. POST your bid/pass decision to the bid endpoint
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="bento-card p-7 mb-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: "#C4A265" }} />
              <span className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color: "#C4A265" }}>Auction Settings</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {/* Purse per team */}
              <div>
                <label className="block text-xs text-[#9A9590] uppercase tracking-wider mb-2 font-semibold">Purse (Cr)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={10}
                    value={customPurse}
                    onChange={(e) => setCustomPurse(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #C4A265 ${((customPurse - 50) / 150) * 100}%, rgba(255,255,255,0.08) ${((customPurse - 50) / 150) * 100}%)`, accentColor: "#C4A265" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#E8E4DE] min-w-[48px] text-right">{customPurse}</span>
                </div>
                <p className="text-xs text-[#78736E] mt-1">50-200 Cr budget per team</p>
              </div>
              {/* Max squad */}
              <div>
                <label className="block text-xs text-[#9A9590] uppercase tracking-wider mb-2 font-semibold">Max Squad</label>
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
                    style={{ background: `linear-gradient(90deg, #C4A265 ${((customMaxSquad - 10) / 15) * 100}%, rgba(255,255,255,0.08) ${((customMaxSquad - 10) / 15) * 100}%)`, accentColor: "#C4A265" }}
                  />
                  <span className="text-lg font-extrabold font-mono text-[#E8E4DE] min-w-[32px] text-right">{customMaxSquad}</span>
                </div>
                <p className="text-xs text-[#78736E] mt-1">Max players per squad</p>
              </div>
              {/* Min squad */}
              <div>
                <label className="block text-xs text-[#9A9590] uppercase tracking-wider mb-2 font-semibold">Min Squad</label>
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
                  <span className="text-lg font-extrabold font-mono text-[#E8E4DE] min-w-[32px] text-right">{customMinSquad}</span>
                </div>
                <p className="text-xs text-[#78736E] mt-1">Min players required</p>
              </div>
              {/* Max overseas */}
              <div>
                <label className="block text-xs text-[#9A9590] uppercase tracking-wider mb-2 font-semibold">Max Overseas</label>
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
                  <span className="text-lg font-extrabold font-mono text-[#E8E4DE] min-w-[32px] text-right">{customMaxOverseas}</span>
                </div>
                <p className="text-xs text-[#78736E] mt-1">Max overseas players</p>
              </div>
            </div>
          </motion.div>

          {(() => {
            const externalToggleIndices = Object.entries(externalToggles).filter(([, v]) => v).map(([k]) => parseInt(k));
            const hasUnconnectedExternal = externalToggleIndices.some(idx => !connectedAgents.has(idx));
            const isDisabled = starting || addingBots || !modelSelections.slice(0, teamCount).every(Boolean) || hasUnconnectedExternal;
            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="flex flex-col items-center gap-3">
                {/* API Key Input */}
                <div className="mb-6 w-full max-w-md mx-auto">
                  <label className="block text-xs font-semibold tracking-[0.15em] uppercase text-[#9A9590] mb-2">
                    OpenRouter API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-[#E8E4DE] placeholder:text-[#625D58] font-mono transition-all outline-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: openrouterKey ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(196,162,101,0.4)";
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(196,162,101,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = openrouterKey ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    {openrouterKey && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs font-mono">
                        &#x2713;
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-[#8A857F]">
                    Get your key at{" "}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[#C4A265] hover:underline">
                      openrouter.ai/keys
                    </a>
                    {" "}&mdash; required to power AI agent decisions
                  </p>
                </div>

                                <motion.button onClick={handleStartAuction} disabled={isDisabled} whileHover={!isDisabled ? { scale: 1.03, y: -2 } : undefined} whileTap={!isDisabled ? { scale: 0.98 } : undefined} className={`py-4 px-16 rounded-2xl border-none text-lg font-black tracking-wider transition-colors duration-200 relative overflow-hidden ${isDisabled ? "bg-[#222] text-[#9A9590] cursor-not-allowed" : "text-white cursor-pointer"}`} style={isDisabled ? undefined : { background: "linear-gradient(135deg, #C4A265, #3B82F6)", boxShadow: "0 6px 32px rgba(196,162,101,0.3), 0 0 60px rgba(59,130,246,0.1)" }}>
                  {!isDisabled && <span className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)", backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite" }} />}
                  <span className="relative z-10">{addingBots ? "Preparing Agents..." : starting ? "Starting..." : "START AUCTION"}</span>
                </motion.button>
                {hasUnconnectedExternal && (
                  <div className="flex items-center gap-2 text-sm text-[#F97316]">
                    <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: "#F97316", boxShadow: "0 0 8px #F97316" }} />
                    Waiting for external agent{externalToggleIndices.length > 1 ? "s" : ""} to connect...
                  </div>
                )}
              </motion.div>
            );
          })()}
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
                    <div className="text-[12px] text-[#9A9590] truncate max-w-[160px]">{team.agent_name}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-lg font-extrabold font-mono" style={{ color: team.purse_remaining > 50 ? "#22C55E" : team.purse_remaining >= 20 ? "#F59E0B" : "#EF4444" }}>{team.purse_remaining.toFixed(1)}</div>
                    <div className="text-xs text-[#78736E] uppercase tracking-wide">Purse (Cr)</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold font-mono text-[#E8E4DE]">{team.squad_size}</div>
                    <div className="text-xs text-[#78736E] uppercase tracking-wide">Players</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold font-mono" style={{ color: "#C4A265" }}>{team.overseas_count}</div>
                    <div className="text-sm text-[#78736E] uppercase tracking-wide">O/S</div>
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
                <div className="rounded-xl p-6 neon-border" style={{ background: "linear-gradient(135deg, #0a0a0a, rgba(196,162,101,0.06))", border: "1px solid rgba(196,162,101,0.25)", boxShadow: "0 0 30px rgba(196,162,101,0.07)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#9A9590]">LOT #{lot.lot_number}</span>
                      <span className="status-badge status-live animate-pulse text-sm">LIVE</span>
                      {connectionStatus === "reconnecting" && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-semibold text-accent-gold bg-accent-gold/10 border border-accent-gold/20">
                          <span className="w-2 h-2 border border-accent-gold border-t-transparent rounded-full animate-spin" />
                          RECONNECTING
                        </span>
                      )}
                    </div>
                    <Badge text={lot.player_role} color="#C4A265" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#E8E4DE] mb-2">{lot.player_name}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-base text-[#9A9590]">{lot.player_sub_type} | {lot.nationality}</span>
                    {statsLine && <span className="text-base font-mono font-semibold px-3 py-1 rounded-lg bg-[#111] text-[#C4A265] border border-[#C4A265]/20">{statsLine}</span>}
                  </div>
                  <div className="flex gap-8 items-end">
                    <div>
                      <div className="text-sm text-[#9A9590] uppercase tracking-wide mb-1">Base Price</div>
                      <div className="text-xl font-bold font-mono text-[#9A9590]">{"\u20B9"}{lot.base_price} Cr</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#9A9590] uppercase tracking-wide mb-1">Current Bid</div>
                      <div className="text-2xl font-black font-mono text-gradient-gold leading-none">{lot.current_bid ? `\u20B9${Number(lot.current_bid).toFixed(1)} Cr` : "\u2014"}</div>
                    </div>
                    {lot.current_bidder && (
                      <div>
                        <div className="text-sm text-[#9A9590] uppercase tracking-wide mb-1">Leading</div>
                        <div className="text-xl font-extrabold" style={{ color: TEAMS[lot.current_bidder.team_index]?.color || "#6B7280" }}>{TEAMS[lot.current_bidder.team_index]?.shortName || `T${lot.current_bidder.team_index + 1}`}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}


            {/* External Agent Waiting Indicator */}
            {liveData.waiting_for_external && phase === "running" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl px-5 py-4 flex items-center gap-4"
                style={{
                  background: "linear-gradient(135deg, rgba(249,115,22,0.06), rgba(196,162,101,0.04))",
                  border: "1px solid rgba(249,115,22,0.2)",
                  boxShadow: "0 0 20px rgba(249,115,22,0.06)",
                }}
              >
                <div className="relative flex-shrink-0">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#F97316", boxShadow: "0 0 12px #F97316" }} />
                  <span className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: "#F97316", opacity: 0.4 }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F97316]">Waiting for external agent</div>
                  <div className="text-xs text-[#9A9590] mt-0.5">
                    <span className="font-semibold" style={{ color: TEAMS[liveData.waiting_for_external.team_index]?.color || "#C4A265" }}>
                      {liveData.waiting_for_external.team_name}
                    </span>
                    {" "}is polling for their turn — 120s timeout
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="text-lg">🔌</span>
                </div>
              </motion.div>
            )}

            {liveData.last_result && !liveData.current_lot && (
              <div className="rounded-xl p-6" style={{ background: "#0a0a0a", border: `1px solid ${liveData.last_result.status === "SOLD" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                <div className="text-sm text-[#9A9590] mb-2">LAST LOT</div>
                <div className="text-xl font-extrabold text-[#E8E4DE] mb-3">{liveData.last_result.player_name}</div>
                <Badge text={liveData.last_result.status === "SOLD" ? `SOLD to ${TEAMS[liveData.last_result.winner_team?.team_index ?? 0]?.shortName || "??"} for \u20B9${Number(liveData.last_result.final_price).toFixed(1)} Cr` : "UNSOLD"} color={liveData.last_result.status === "SOLD" ? "#10B981" : "#EF4444"} />
              </div>
            )}

            {/* Progress */}
            <div className="rounded-xl py-4 px-5" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#9A9590] uppercase font-bold tracking-wide">Progress</span>
                <span className="text-base font-mono text-[#E8E4DE] font-bold">{liveData.progress.completed} / {liveData.progress.total_lots}</span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 h-full rounded-l-full transition-all duration-500" style={{ width: `${(liveData.progress.sold / liveData.progress.total_lots) * 100}%`, background: "linear-gradient(90deg, #10B981, #22C55E)", boxShadow: "0 0 8px rgba(16,185,129,0.3)" }} />
                <div className="absolute top-0 h-full transition-all duration-500" style={{ left: `${(liveData.progress.sold / liveData.progress.total_lots) * 100}%`, width: `${(liveData.progress.unsold / liveData.progress.total_lots) * 100}%`, background: "linear-gradient(90deg, #EF4444, #F87171)", borderRadius: liveData.progress.sold === 0 ? "9999px 0 0 9999px" : "0" }} />
              </div>
              <div className="flex gap-5 mt-2">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#22C55E" }} /><span className="text-sm text-neon-green font-semibold">Sold: {liveData.progress.sold}</span></div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#EF4444" }} /><span className="text-sm text-neon-red font-semibold">Unsold: {liveData.progress.unsold}</span></div>
                <span className="text-sm text-[#9A9590] ml-auto font-mono">{liveData.progress.total_lots - liveData.progress.completed} remaining</span>
              </div>
            </div>

            {/* Bid Feed */}
            <div className="rounded-xl flex-1 flex flex-col overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="py-3 px-5 border-b flex items-center gap-2.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(196,162,101,0.04)" }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: phase === "running" ? "#EF4444" : "#10B981", boxShadow: `0 0 8px ${phase === "running" ? "#EF4444" : "#10B981"}` }} />
                <span className="text-base font-bold uppercase tracking-widest font-mono" style={{ color: "#C4A265" }}>Agent Decisions</span>
                <span className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-2 rounded-full text-sm font-bold font-mono" style={{ background: "rgba(196,162,101,0.15)", color: "#C4A265", border: "1px solid rgba(196,162,101,0.3)" }}>{liveData.recent_bids.length}</span>

                {/* Show/Hide All Reasoning toggle */}
                <button
                  onClick={() => setShowAllReasoning(v => !v)}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150"
                  style={{
                    background: showAllReasoning ? "rgba(196,162,101,0.12)" : "rgba(255,255,255,0.04)",
                    color: showAllReasoning ? "#C4A265" : "#666",
                    border: `1px solid ${showAllReasoning ? "rgba(196,162,101,0.3)" : "rgba(255,255,255,0.08)"}`,
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
                  <div className="p-12 text-center text-[#9A9590] text-base">{phase === "running" ? "Waiting for first decision..." : "No bids recorded"}</div>
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
                            <span className="text-lg">{bidLogo}</span>
                            <span className="text-base font-extrabold" style={{ color: bidColor }}>{bidShort}</span>
                            <Badge text={isBid ? "BID" : "PASS"} color={isBid ? "#10B981" : "#EF4444"} />
                            {isBid && bid.amount && <span className="text-lg font-extrabold font-mono text-gradient-gold ml-1">{"\u20B9"}{Number(bid.amount).toFixed(1)} Cr</span>}
                            <span className="text-sm text-[#78736E] ml-auto font-mono">Lot #{bid.lot_number}</span>
                          </div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <span className="text-base font-semibold text-[#E8E4DE]">{bid.player_name}</span>
                            <span className="text-sm px-2 py-0.5 rounded bg-[#111] text-[#9A9590]">{bid.player_role}</span>
                          </div>
                          {bid.reasoning && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleBidReasoning(bidKey)}
                                className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 transition-colors duration-150"
                                style={{ color: isReasoningOpen ? "#C4A265" : "#555" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isReasoningOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                Reasoning
                              </button>
                              {isReasoningOpen && (
                                <div className="text-sm text-[#9A9590] leading-relaxed py-2.5 px-3.5 rounded-lg bg-[#111] border border-[#222] mt-2">
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
                  <span className="text-sm text-[#9A9590] ml-auto font-mono">{team.squad_size} players</span>
                </div>
                {team.players.length === 0 ? (
                  <div className="text-sm text-[#78736E] py-2">No players yet</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-base py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <span className="text-[#E8E4DE]">{p.name}</span>
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
