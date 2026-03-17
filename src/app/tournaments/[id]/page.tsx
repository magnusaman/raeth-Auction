"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { TEAMS } from "@/lib/constants";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TEAM_COLORS: Record<number, string> = Object.fromEntries(TEAMS.map((t, i) => [i, t.color]));

interface TeamInfo { index: number; name: string; shortName: string; logo: string; color: string; strength: number; }
interface Prediction {
  agent_id: string; agent_name: string; predicted_winner: number; predicted_team: string;
  confidence: number; predicted_margin: string; key_factors: string[]; reasoning: string; correct: boolean | null;
}
interface Match {
  match_number: number; match_type: string; team1: TeamInfo; team2: TeamInfo;
  venue: string; venue_traits: any; home_team: string | null;
  winner: { index: number; name: string; shortName: string; logo: string } | null;
  margin: string | null; predictions: Prediction[];
}
interface Standing {
  team_index: number; team_name: string; short_name: string; logo: string; color: string;
  played: number; wins: number; losses: number; points: number;
}
interface AgentEval {
  agentId: string; agentName: string; accuracy: number; brierScore: number;
  upsetDetection: number; marginAccuracy: number; confidenceCalibration: number;
  consistency: number; compositeScore: number; rank: number;
}
interface TournamentData {
  tournament_id: string; status: string; standings: Standing[]; matches: Match[];
  config?: { expectedAgentCount?: number; [key: string]: any };
  evaluation: { agentScores: AgentEval[] } | null;
}

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

function Metric({ label, value, color, pct }: { label: string; value: string; color: string; pct: number }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="text-sm text-[#9A9590] mb-1.5 uppercase tracking-wider">{label}</div>
      <div className="text-[30px] font-extrabold font-mono mb-2" style={{ color }}>{value}</div>
      <div className="h-[6px] rounded-sm bg-[#111] overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches" | "agents" | "predictions">("matches");
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAllReasoning, setShowAllReasoning] = useState(false);
  const [expandedPredictions, setExpandedPredictions] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function togglePredReasoning(key: string) {
    setExpandedPredictions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/tournaments/${id}/results`);
      const d = await r.json();
      setData(d);
      if ((d.status === "COMPLETED" || d.status === "CANCELLED") && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  const stopPredictions = async () => {
    setActionLoading("stop");
    try {
      await fetch(`/api/v1/tournaments/${id}/stop`, { method: "POST" });
      await fetchData();
    } catch (e) { console.error(e); toast.error("Failed to stop predictions"); }
    finally { setActionLoading(null); }
  };

  const clearPredictions = async () => {
    setConfirmClear(false);
    setActionLoading("clear");
    try {
      await fetch(`/api/v1/tournaments/${id}/clear-predictions`, { method: "POST" });
      await fetchData();
      toast.success("Predictions cleared");
    } catch (e) { console.error(e); toast.error("Failed to clear predictions"); }
    finally { setActionLoading(null); }
  };

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  if (loading) return (
    <div className="py-24 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: "rgba(196,162,101,0.08)", border: "1px solid rgba(196,162,101,0.12)" }}>
        <svg className="w-6 h-6" style={{ color: "#C4A265" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" /></svg>
      </div>
      <div className="text-[#9A9590] text-base">Loading tournament...</div>
    </div>
  );
  if (!data || data.status === "PENDING") return (
    <div className="py-24 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: "rgba(196,162,101,0.08)", border: "1px solid rgba(196,162,101,0.12)" }}>
        <div className="w-5 h-5 border-2 border-[#C4A265] border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-[#C4A265] text-lg font-semibold mb-2">Setting up tournament...</div>
      <div className="text-[#9A9590] text-base">Creating matches and generating squads</div>
    </div>
  );

  const isPredicting = data.status === "PREDICTING";
  const expectedAgentCount = data.config?.expectedAgentCount;
  const inferredAgentCount = data.matches.length > 0 ? Math.max(1, new Set(data.matches.flatMap((m: any) => m.predictions.map((p: any) => p.agentName))).size) : 4;
  const agentCount = expectedAgentCount || inferredAgentCount;
  const totalExpectedPredictions = data.matches.length * agentCount;
  const currentPredictions = data.matches.reduce((sum, m) => sum + m.predictions.length, 0);

  const tabs = [
    { key: "matches" as const, label: "Matches" },
    { key: "agents" as const, label: "Agent Leaderboard" },
    { key: "predictions" as const, label: "Prediction Detail" },
  ];

  const finalMatch = data.matches.find((m) => m.match_type === "FINAL");
  const champion = finalMatch?.winner;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/tournaments")}
            className="bg-transparent border-none text-[#9A9590] cursor-pointer text-base p-0 hover:text-[#E8E4DE] transition-colors"
          >
            TourBench
          </button>
          <span className="text-[#78736E]">/</span>
          <span className="text-base font-mono text-[#E8E4DE]">{id?.slice(0, 12)}</span>
          <Badge
            text={data.status}
            color={data.status === "COMPLETED" ? "#10B981" : data.status === "CANCELLED" ? "#EF4444" : "#C4A265"}
          />
        </div>
        <div className="flex items-center gap-3">
          {isPredicting && (
            <button
              onClick={stopPredictions}
              disabled={actionLoading === "stop"}
              className="px-5 py-2.5 text-base font-semibold rounded-xl cursor-pointer border transition-all duration-150 disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", borderColor: "rgba(239,68,68,0.25)" }}
            >
              {actionLoading === "stop" ? "Stopping..." : "Stop Predictions"}
            </button>
          )}
          {currentPredictions > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={!!actionLoading || isPredicting}
              className="px-5 py-2.5 text-base font-semibold rounded-xl cursor-pointer border transition-all duration-150 disabled:opacity-50"
              style={{ background: "rgba(249,115,22,0.08)", color: "#F97316", borderColor: "rgba(249,115,22,0.25)" }}
            >
              {actionLoading === "clear" ? "Clearing..." : "Clear Predictions"}
            </button>
          )}
        </div>
      </div>

      {/* Predicting Progress */}
      {isPredicting && (
        <div
          className="rounded-2xl p-8 mb-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(196,162,101,0.06), rgba(139,122,74,0.06))",
            border: "1px solid rgba(196,162,101,0.2)",
            boxShadow: "0 0 30px rgba(196,162,101,0.06)",
          }}
        >
          <div className="text-2xl font-bold mb-3" style={{ color: "#C4A265" }}>
            Predictions in Progress...
          </div>
          <div className="text-base text-[#9A9590] mb-5">
            AI agents are analyzing {data.matches.length} matches
          </div>
          <div className="max-w-[420px] mx-auto">
            <div className="flex justify-between mb-2">
              <span className="text-base text-[#9A9590]">Progress</span>
              <span className="text-base font-mono font-bold" style={{ color: "#C4A265" }}>
                {currentPredictions} / {totalExpectedPredictions}
              </span>
            </div>
            <div className="h-2.5 rounded-lg bg-[#111] overflow-hidden">
              <div
                className="h-full rounded-lg transition-[width] duration-500"
                style={{
                  width: `${(currentPredictions / totalExpectedPredictions) * 100}%`,
                  background: "linear-gradient(90deg, #C4A265, #D4B06A)",
                  boxShadow: "0 0 10px rgba(196,162,101,0.4)",
                }}
              />
            </div>
          </div>

          {currentPredictions > 0 && (
            <div className="mt-6 flex gap-2.5 justify-center flex-wrap">
              {data.matches.filter((m) => m.predictions.length > 0).slice(-6).map((m) => (
                <div
                  key={m.match_number}
                  className="rounded-lg px-4 py-2.5 text-base"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-[#9A9590]">M{m.match_number}</span>
                  <span className="text-[#E8E4DE] mx-2">
                    {m.team1.shortName} v {m.team2.shortName}
                  </span>
                  <span className="font-mono text-neon-green font-semibold">
                    {m.predictions.length} pred
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Champion Banner */}
      {champion && (
        <div
          className="rounded-2xl px-8 py-8 mb-8 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${TEAM_COLORS[champion.index]}20, #0a0a0a)`,
            border: `1px solid ${TEAM_COLORS[champion.index]}45`,
            boxShadow: `0 4px 30px ${TEAM_COLORS[champion.index]}15`,
          }}
        >
          <div>
            <div className="text-base uppercase tracking-[2px] font-extrabold mb-3" style={{ color: "#C4A265" }}>
              Champion
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[52px]">{champion.logo}</span>
              <div>
                <div className="text-3xl font-extrabold" style={{ color: TEAM_COLORS[champion.index] }}>{champion.name}</div>
                <div className="text-base text-[#999] mt-1">
                  Won the Final by {finalMatch?.margin}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[52px] font-mono font-extrabold" style={{ color: "#C4A265" }}>
              {data.matches.length}
            </div>
            <div className="text-base text-[#9A9590] uppercase tracking-wider">Matches</div>
          </div>
        </div>
      )}

      {/* Points Table */}
      {data.standings.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.3)]" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="px-5 py-4 border-b flex items-center gap-2.5"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(196,162,101,0.04)" }}
          >
            <span className="w-2 h-2 rounded-full inline-block shadow-[0_0_8px_#C4A265]" style={{ background: "#C4A265" }} />
            <span className="text-base font-bold uppercase tracking-wider font-mono" style={{ color: "#C4A265" }}>
              Points Table
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["#", "Team", "P", "W", "L", "Pts"].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3.5 font-semibold text-sm uppercase tracking-wider text-[#9A9590] border-b bg-[#0a0a0a] ${h === "Team" ? "text-left" : "text-center"}`}
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.standings.map((s, i) => (
                <tr
                  key={s.team_index}
                  className="border-b"
                  style={{ borderColor: "rgba(255,255,255,0.04)", background: i === 0 ? `${s.color}08` : "transparent" }}
                >
                  <td className={`px-5 py-4 text-center font-extrabold text-base ${i === 0 ? "" : "text-[#9A9590]"}`} style={i === 0 ? { color: "#C4A265" } : undefined}>{i + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.logo}</span>
                      <span className="font-bold text-base" style={{ color: s.color }}>{s.team_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center font-mono text-[#999] text-base">{s.played}</td>
                  <td className="px-5 py-4 text-center font-mono text-neon-green font-bold text-base">{s.wins}</td>
                  <td className="px-5 py-4 text-center font-mono text-neon-red text-base">{s.losses}</td>
                  <td className="px-5 py-4 text-center font-mono font-extrabold text-lg" style={{ color: "#C4A265" }}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-2.5 text-base font-semibold border-none cursor-pointer rounded-xl transition-all duration-150 ${
              tab === t.key
                ? "text-[#E8E4DE] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                : "bg-transparent text-[#9A9590] hover:text-[#E8E4DE]"
            }`}
            style={tab === t.key ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" } : {}}
          >{t.label}</button>
        ))}
      </div>

      {/* Matches Tab */}
      {tab === "matches" && (
        <div className="grid grid-cols-2 gap-4">
          {data.matches.map((m) => (
            <div
              key={m.match_number}
              onClick={() => { setSelectedMatch(m.match_number); setTab("predictions"); }}
              className="rounded-2xl px-6 py-5 cursor-pointer transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "#0a0a0a",
                border: `1px solid ${m.match_type !== "LEAGUE" ? "#F59E0B40" : "rgba(255,255,255,0.06)"}`,
                boxShadow: m.match_type !== "LEAGUE" ? "0 2px 16px rgba(245,158,11,0.08)" : "none",
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-base font-mono text-[#9A9590]">
                  Match {m.match_number}
                </span>
                <Badge text={m.match_type} color={m.match_type === "FINAL" ? "#F59E0B" : m.match_type === "QUALIFIER" ? "#8B5CF6" : "#64748B"} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[30px]">{m.team1.logo}</span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: m.winner?.index === m.team1.index ? m.team1.color : "#666" }}
                  >
                    {m.team1.shortName}
                  </span>
                </div>
                <div className="text-center min-w-[100px]">
                  {m.winner ? (
                    <>
                      <div className="text-sm text-[#9A9590] mb-1">{m.winner.shortName} won</div>
                      <div className="text-base text-[#E8E4DE] font-mono">{m.margin}</div>
                    </>
                  ) : (
                    <span className="text-base text-[#9A9590] font-semibold">vs</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span
                    className="font-bold text-lg"
                    style={{ color: m.winner?.index === m.team2.index ? m.team2.color : "#666" }}
                  >
                    {m.team2.shortName}
                  </span>
                  <span className="text-[30px]">{m.team2.logo}</span>
                </div>
              </div>

              <div className="text-base text-[#9A9590] mt-3">
                {m.venue}{m.home_team ? ` (${m.home_team} home)` : ""}
              </div>

              {m.predictions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {m.predictions.map((p) => (
                    <span
                      key={p.agent_id}
                      className="text-sm px-2.5 py-1 rounded-md font-mono font-semibold"
                      style={{
                        background: p.correct ? "#10B98115" : "#EF444415",
                        color: p.correct ? "#10B981" : "#EF4444",
                        border: `1px solid ${p.correct ? "#10B981" : "#EF4444"}25`,
                      }}
                    >
                      {p.agent_name.split("-")[0]}: {p.predicted_team}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Agent Leaderboard Tab */}
      {tab === "agents" && data.evaluation?.agentScores && (
        <div className="rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Rank", "Agent", "Accuracy", "Brier", "Upset Det.", "Margin", "Calibration", "Consistency", "Composite"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-4 font-semibold text-sm uppercase tracking-wider text-[#9A9590] border-b bg-[#0a0a0a] ${h === "Agent" ? "text-left" : "text-center"}`}
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.evaluation.agentScores.map((agent) => {
                const rankColor = agent.rank === 1 ? "#F59E0B" : agent.rank === 2 ? "#c0c0c0" : agent.rank === 3 ? "#cd7f32" : undefined;
                return (
                  <tr
                    key={agent.agentId}
                    className="border-b"
                    style={{ borderColor: "rgba(255,255,255,0.04)", background: agent.rank === 1 ? "rgba(245,158,11,0.03)" : "transparent" }}
                  >
                    <td className="p-4 text-center font-extrabold text-xl" style={{ color: rankColor ?? "#666" }}>
                      #{agent.rank}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#E8E4DE] text-base">{agent.agentName}</div>
                    </td>
                    <td className="p-4 text-center"><MetricCell value={agent.accuracy} /></td>
                    <td className="p-4 text-center"><MetricCell value={1 - agent.brierScore} label={agent.brierScore.toFixed(3)} /></td>
                    <td className="p-4 text-center"><MetricCell value={agent.upsetDetection} /></td>
                    <td className="p-4 text-center"><MetricCell value={agent.marginAccuracy} /></td>
                    <td className="p-4 text-center"><MetricCell value={agent.confidenceCalibration} /></td>
                    <td className="p-4 text-center"><MetricCell value={agent.consistency} /></td>
                    <td className="p-4 text-center">
                      <span
                        className="text-xl font-extrabold font-mono"
                        style={{
                          color: agent.rank === 1 ? "#F59E0B" : agent.rank <= 2 ? "#10B981" : "#E8E4DE",
                        }}
                      >
                        {(agent.compositeScore * 100).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.evaluation.agentScores[0] && (
            <div
              className="px-6 py-7 border-t"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(249,115,22,0.03)" }}
            >
              <div className="text-base font-bold uppercase tracking-wider text-neon-orange mb-5">
                Score Breakdown — {data.evaluation.agentScores[0].agentName}
              </div>
              <div className="flex gap-6">
                <Metric label="Accuracy" value={`${(data.evaluation.agentScores[0].accuracy * 100).toFixed(0)}%`} color="#C4A265" pct={data.evaluation.agentScores[0].accuracy * 100} />
                <Metric label="Brier (inv)" value={(1 - data.evaluation.agentScores[0].brierScore).toFixed(2)} color="#10B981" pct={(1 - data.evaluation.agentScores[0].brierScore) * 100} />
                <Metric label="Upset Det." value={`${(data.evaluation.agentScores[0].upsetDetection * 100).toFixed(0)}%`} color="#8B5CF6" pct={data.evaluation.agentScores[0].upsetDetection * 100} />
                <Metric label="Calibration" value={`${(data.evaluation.agentScores[0].confidenceCalibration * 100).toFixed(0)}%`} color="#F59E0B" pct={data.evaluation.agentScores[0].confidenceCalibration * 100} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "agents" && !data.evaluation?.agentScores && (
        <div className="py-20 text-center text-[#9A9590] text-base">
          {isPredicting ? "Evaluation will be available after all predictions complete..." : "No evaluation data available"}
        </div>
      )}

      {/* Predictions Detail Tab */}
      {tab === "predictions" && (
        <div>
          <div className="flex gap-2 mb-5 flex-wrap">
            {data.matches.map((m) => (
              <button
                key={m.match_number}
                onClick={() => setSelectedMatch(m.match_number)}
                className={`px-4 py-2 text-base font-mono border-none rounded-lg cursor-pointer transition-all duration-150 font-semibold ${
                  selectedMatch === m.match_number
                    ? "text-[#E8E4DE] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                    : "bg-transparent text-[#9A9590] hover:text-[#E8E4DE]"
                }`}
                style={selectedMatch === m.match_number ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" } : {}}
              >
                M{m.match_number}
              </button>
            ))}
          </div>

          {(() => {
            const match = data.matches.find((m) => m.match_number === (selectedMatch || 1));
            if (!match) return <div className="text-[#9A9590] p-12 text-center text-base">Select a match above</div>;

            return (
              <div>
                {/* Match header */}
                <div
                  className="rounded-2xl px-7 py-6 mb-5"
                  style={{ background: "linear-gradient(135deg, #0a0a0a, rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[36px]">{match.team1.logo}</span>
                      <span className="font-extrabold text-xl" style={{ color: match.team1.color }}>{match.team1.shortName}</span>
                      <span className="text-[#9A9590] text-lg font-light">vs</span>
                      <span className="font-extrabold text-xl" style={{ color: match.team2.color }}>{match.team2.shortName}</span>
                      <span className="text-[36px]">{match.team2.logo}</span>
                    </div>
                    <div className="text-right">
                      {match.winner && (
                        <div className="font-bold text-base" style={{ color: TEAM_COLORS[match.winner.index] }}>
                          {match.winner.shortName} won by {match.margin}
                        </div>
                      )}
                      <div className="text-sm text-[#9A9590] mt-1">{match.venue}</div>
                    </div>
                  </div>
                </div>

                {/* Show/Hide All Reasoning toggle */}
                {match.predictions.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowAllReasoning(v => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-base font-semibold cursor-pointer transition-all duration-150"
                      style={{
                        background: showAllReasoning ? "rgba(196,162,101,0.12)" : "rgba(255,255,255,0.04)",
                        color: showAllReasoning ? "#C4A265" : "#666",
                        border: `1px solid ${showAllReasoning ? "rgba(196,162,101,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {showAllReasoning ? "Hide All Reasoning" : "Show All Reasoning"}
                    </button>
                  </div>
                )}

                {match.predictions.length === 0 ? (
                  <div className="p-12 text-center text-[#9A9590] text-base">
                    No predictions yet for this match
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {match.predictions.map((p) => {
                      const borderColor = p.correct ? "#10B98135" : p.correct === false ? "#EF444435" : "rgba(255,255,255,0.06)";
                      const leftColor = p.correct ? "#10B981" : p.correct === false ? "#EF4444" : "#666";
                      const predKey = `${match.match_number}-${p.agent_id}`;
                      const isReasoningOpen = showAllReasoning || expandedPredictions.has(predKey);
                      return (
                        <div
                          key={p.agent_id}
                          className="rounded-2xl px-6 py-5"
                          style={{
                            background: "#0a0a0a",
                            borderTop: `1px solid ${borderColor}`,
                            borderRight: `1px solid ${borderColor}`,
                            borderBottom: `1px solid ${borderColor}`,
                            borderLeft: `4px solid ${leftColor}`,
                          }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-bold text-[#E8E4DE] text-base">{p.agent_name}</span>
                            {p.correct !== null && (
                              <Badge text={p.correct ? "CORRECT" : "WRONG"} color={p.correct ? "#10B981" : "#EF4444"} />
                            )}
                          </div>

                          <div className="flex gap-6 mb-4">
                            <div>
                              <div className="text-sm text-[#9A9590] uppercase mb-1">Pick</div>
                              <div className="text-lg font-extrabold" style={{ color: TEAM_COLORS[p.predicted_winner] || "#E8E4DE" }}>
                                {p.predicted_team}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-[#9A9590] uppercase mb-1">Confidence</div>
                              <div className={`text-lg font-extrabold font-mono ${p.confidence >= 0.75 ? "text-[#C4A265]" : "text-[#999]"}`}>
                                {(p.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-[#9A9590] uppercase mb-1">Margin</div>
                              <div className="text-base text-[#999] font-medium">{p.predicted_margin}</div>
                            </div>
                          </div>

                          {p.key_factors.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm text-[#9A9590] uppercase mb-1.5">Key Factors</div>
                              <div className="flex gap-1.5 flex-wrap">
                                {p.key_factors.slice(0, 3).map((f, i) => (
                                  <span
                                    key={i}
                                    className="text-sm px-3 py-1 rounded-lg text-[#E8E4DE]"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                                  >{f}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.reasoning && (
                            <div className="mt-3">
                              <button
                                onClick={() => togglePredReasoning(predKey)}
                                className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer bg-transparent border-none p-0 transition-colors duration-150"
                                style={{ color: isReasoningOpen ? "#C4A265" : "#555" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isReasoningOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                Reasoning
                              </button>
                              {isReasoningOpen && (
                                <p className="text-base text-[#999] leading-relaxed m-0 py-3 px-4 rounded-lg mt-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  {p.reasoning}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearPredictions}
        title="Clear All Predictions"
        description="All predictions and evaluation data for this tournament will be permanently deleted. This cannot be undone."
        confirmLabel="Clear All Data"
        variant="warning"
      />
    </div>
  );
}

function MetricCell({ value, label }: { value: number; label?: string }) {
  const pct = value * 100;
  const color = pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div>
      <span className="text-lg font-bold font-mono" style={{ color }}>
        {label || `${pct.toFixed(0)}%`}
      </span>
      <div className="h-1.5 rounded-sm bg-[#111] mt-1.5 w-[64px] mx-auto">
        <div
          className="h-full rounded-sm"
          style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}
