"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

import AgentAvatar from "@/components/ui/AgentAvatar";
import ConfettiTrigger from "@/components/ui/ConfettiTrigger";
import ScoreReveal from "@/components/ui/ScoreReveal";
import { TEAMS, TEAM_NAMES, TEAM_COLORS } from "@/lib/constants";

/* ── Derived lookups from centralized TEAMS config ── */
const TEAM_LOGOS = TEAMS.map((t) => t.logo);

/* ── Export helpers ── */
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(data: any) {
  downloadFile(JSON.stringify(data, null, 2), `auction-${data.auction_id?.slice(0, 8)}.json`, "application/json");
}

function exportCSV(data: any) {
  const rows: string[][] = [];
  // Header
  rows.push(["Team", "Agent", "Rank", "Score", "Purse Spent", "Squad Size", "Overseas"]);
  const evaluation = data.evaluation?.results;
  const teamEvals = evaluation?.teamEvaluations || [];
  const sorted = [...teamEvals].sort((a: any, b: any) => a.rank - b.rank);

  for (const te of sorted) {
    const team = data.teams?.find((t: any) => t.team_index === te.teamIndex);
    rows.push([
      team?.team_name || `Team ${te.teamIndex}`,
      te.agentName,
      String(te.rank),
      (te.compositeScore * 100).toFixed(1) + "%",
      team ? `${team.purse_spent?.toFixed(1)} Cr` : "",
      String(team?.squad_size || 0),
      String(team?.overseas_count || 0),
    ]);
  }

  rows.push([]);
  rows.push(["Player", "Role", "Team", "Price Paid", "True Value", "Trap", "Sleeper"]);
  for (const team of data.teams || []) {
    for (const p of team.squad || []) {
      rows.push([
        p.name,
        p.role,
        team.team_name,
        `${p.price_paid} Cr`,
        `${p.hidden_true_value?.toFixed(1)} Cr`,
        p.is_trap ? "Yes" : "No",
        p.is_sleeper ? "Yes" : "No",
      ]);
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  downloadFile(csv, `auction-${data.auction_id?.slice(0, 8)}.csv`, "text/csv");
}

/* ── Color constants for recharts only ── */
const COLORS = {
  cyan: "#D4A853", green: "#4ADE80", red: "#EF4444",
  purple: "#8B7A4A", gold: "#F5C842", orange: "#CD7F32",
  surface: "#111111", border: "#2a2520", textDim: "#A09888", textMuted: "#6B6560",
};

/* ── Motion presets ── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const cardReveal = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-sm font-semibold font-mono tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
    >
      {text}
    </span>
  );
}

function SectionLabel({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: color }} />
      <span className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const evaluation = data.evaluation?.results;
    const winner = evaluation?.winner;
    const winnerName = winner ? TEAM_NAMES[winner.teamIndex] : "Unknown";
    const score = winner ? (winner.score * 100).toFixed(1) : "?";
    const text = `Raeth Arena Auction Results\nWinner: ${winnerName} (${score}%)\n${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Raeth Arena - Auction Results", text, url: window.location.href });
        return;
      } catch { /* user cancelled or not supported */ }
    }
    await navigator.clipboard.writeText(text);
    setShareMsg("Copied to clipboard!");
    setTimeout(() => setShareMsg(null), 2000);
  }, [data]);

  useEffect(() => {
    fetch(`/api/v1/auctions/${params.id}/results`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#A09888] font-display text-lg"
        >
          Loading evaluation...
        </motion.div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="broadcast-card p-8 text-center">
          <p className="text-[#EF4444] font-display">{data?.error || "Failed"}</p>
        </div>
      </div>
    );
  }

  const evaluation = data.evaluation?.results;
  const seasonSim = data.evaluation?.season_sim;
  const hasWinner = !!evaluation?.winner;
  const winnerTeamIndex = evaluation?.winner?.teamIndex;

  const tabs = [
    { id: "overview", label: "Overview", color: COLORS.cyan },
    { id: "squads", label: "Squads", color: COLORS.green },
    { id: "graders", label: "Graders", color: COLORS.purple },
    { id: "transcript", label: "Transcript", color: COLORS.orange },
    { id: "season", label: "Season Sim", color: COLORS.gold },
  ];

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Gold confetti on page load for winner */}
      <ConfettiTrigger
        fire={hasWinner}
        teamColor={hasWinner ? TEAM_COLORS[winnerTeamIndex] : "#D4A853"}
        variant="shower"
      />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-[#6B6560] bg-transparent border-none cursor-pointer hover:text-[#A09888] transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#F5F0E8] m-0 font-display">Auction Results</h1>
            <span className="font-mono text-sm text-[#6B6560]">{data.auction_id?.slice(0, 14)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {evaluation?.winner && (
            <>
              <span className="text-xs text-[#A09888]">Winner:</span>
              <AgentAvatar name={evaluation.winner.agentName || TEAM_NAMES[winnerTeamIndex]} size="sm" />
              <span className="text-sm font-bold font-display" style={{ color: TEAM_COLORS[winnerTeamIndex] }}>
                {TEAM_LOGOS[winnerTeamIndex]} {TEAM_NAMES[winnerTeamIndex]}
              </span>
              <Badge text={`${(evaluation.winner.score * 100).toFixed(1)}%`} color={COLORS.gold} />
            </>
          )}
          <button
            onClick={() => router.push(`/auction/${params.id}`)}
            className="btn-primary py-1.5 px-3.5 text-xs"
          >
            Watch Replay →
          </button>
          {/* Share & Export */}
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="py-1.5 px-3 text-xs rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#A09888] hover:text-[#F5F0E8] hover:border-[rgba(212,168,83,0.15)] cursor-pointer transition-colors"
              title="Share results"
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button
              onClick={() => exportCSV(data)}
              className="py-1.5 px-3 text-xs rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#A09888] hover:text-[#F5F0E8] hover:border-[rgba(212,168,83,0.15)] cursor-pointer transition-colors"
              title="Export CSV"
            >
              CSV
            </button>
            <button
              onClick={() => exportJSON(data)}
              className="py-1.5 px-3 text-xs rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#A09888] hover:text-[#F5F0E8] hover:border-[rgba(212,168,83,0.15)] cursor-pointer transition-colors"
              title="Export JSON"
            >
              JSON
            </button>
            {shareMsg && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-7 right-0 text-xs text-[#4ADE80] whitespace-nowrap bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded border border-[rgba(74,222,128,0.15)]"
              >
                {shareMsg}
              </motion.span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="broadcast-card inline-flex gap-0.5 p-[3px] mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-5 text-sm font-semibold rounded-md border-none cursor-pointer transition-all duration-300 font-display ${
              activeTab === tab.id
                ? "bg-[rgba(255,255,255,0.04)]"
                : "bg-transparent hover:bg-[rgba(255,255,255,0.02)]"
            }`}
            style={{
              color: activeTab === tab.id ? tab.color : COLORS.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {activeTab === "overview" && <OverviewTab data={data} evaluation={evaluation} />}
      {activeTab === "squads" && <SquadsTab data={data} />}
      {activeTab === "graders" && <GradersTab evaluation={evaluation} />}
      {activeTab === "transcript" && <TranscriptTab data={data} />}
      {activeTab === "season" && <SeasonTab seasonSim={seasonSim} />}
    </div>
  );
}

function OverviewTab({ data, evaluation }: { data: any; evaluation: any }) {
  if (!evaluation) return <p className="text-[#6B6560]">No evaluation data</p>;
  const teamEvals = evaluation.teamEvaluations || [];

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* Rankings */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {teamEvals.sort((a: any, b: any) => a.rank - b.rank).map((team: any, idx: number) => {
          const tc = TEAM_COLORS[team.teamIndex];
          const isWinner = team.rank === 1;
          return (
            <motion.div
              key={team.teamId}
              variants={cardReveal}
              transition={{ ...cardReveal.transition, delay: idx * 0.1 }}
              className={`broadcast-card p-6 text-center ${isWinner ? "ring-1 ring-[#D4A853]/30" : ""}`}
              style={isWinner ? { borderColor: `${tc}60`, boxShadow: `0 0 40px ${tc}15` } : undefined}
            >
              <div className="flex justify-center mb-3">
                <AgentAvatar name={team.agentName || TEAM_NAMES[team.teamIndex]} size="lg" />
              </div>
              <div className="text-sm font-bold mb-0.5 font-display" style={{ color: tc }}>
                {TEAM_LOGOS[team.teamIndex]} {TEAM_NAMES[team.teamIndex]}
              </div>
              <div className="text-xs font-mono text-[#6B6560] mb-4">{team.agentName}</div>
              <div className={`text-4xl font-extrabold font-mono mb-2 ${isWinner ? "text-gradient-brand" : "text-[#F5F0E8]"}`}>
                <ScoreReveal
                  value={team.compositeScore * 100}
                  suffix="%"
                  decimals={1}
                  duration={1400}
                  className={isWinner ? "text-gradient-brand text-4xl font-extrabold" : "text-4xl font-extrabold"}
                />
              </div>
              <Badge text={`#${team.rank}`} color={isWinner ? COLORS.gold : COLORS.textMuted} />
            </motion.div>
          );
        })}
      </div>

      {/* Best/Worst */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {teamEvals.map((team: any, idx: number) => (
          <motion.div
            key={team.teamId}
            variants={cardReveal}
            transition={{ ...cardReveal.transition, delay: 0.3 + idx * 0.08 }}
            className="broadcast-card p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <AgentAvatar name={team.agentName || TEAM_NAMES[team.teamIndex]} size="sm" />
              <span className="text-sm font-bold font-display" style={{ color: TEAM_COLORS[team.teamIndex] }}>
                {TEAM_LOGOS[team.teamIndex]} {TEAM_NAMES[team.teamIndex]}
              </span>
            </div>
            <div className="border-l-[3px] border-[#4ADE80] py-2 px-3.5 bg-[rgba(74,222,128,0.03)] rounded-r-md mb-2">
              <SectionLabel color={COLORS.green} label="Best" />
              <p className="text-xs text-[#A09888] mt-1">{team.highlights.bestDecision.description}</p>
            </div>
            <div className="border-l-[3px] border-[#EF4444] py-2 px-3.5 bg-[rgba(239,68,68,0.03)] rounded-r-md">
              <SectionLabel color={COLORS.red} label="Worst" />
              <p className="text-xs text-[#A09888] mt-1">{team.highlights.worstDecision.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Value Heatmap */}
      <motion.div
        className="broadcast-card p-5"
        variants={cardReveal}
        transition={{ ...cardReveal.transition, delay: 0.5 }}
      >
        <div className="mb-4"><SectionLabel color={COLORS.gold} label="Value Heatmap — Price vs True Value" /></div>
        {data.teams?.map((team: any) => (
          <div key={team.team_id} className="mb-4">
            <p className="text-xs font-semibold mb-2 font-display" style={{ color: TEAM_COLORS[team.team_index] }}>
              {TEAM_LOGOS[team.team_index]} {team.team_name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {team.squad?.map((p: any) => {
                const diff = p.hidden_true_value - p.price_paid;
                const col = diff >= 0 ? COLORS.green : COLORS.red;
                return (
                  <span
                    key={p.player_id}
                    className="py-[3px] px-2 rounded text-xs font-mono"
                    style={{ color: col, background: `${col}10`, border: `1px solid ${col}25` }}
                  >
                    {p.name.split(" ").pop()} <span className="opacity-60">{diff >= 0 ? "+" : ""}{diff.toFixed(1)}</span>
                    {p.is_trap && " 🪤"}{p.is_sleeper && " 💎"}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function SquadsTab({ data }: { data: any }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {data.teams?.map((team: any, idx: number) => {
        const tc = TEAM_COLORS[team.team_index];
        return (
          <motion.div
            key={team.team_id}
            className="broadcast-card"
            variants={cardReveal}
            transition={{ ...cardReveal.transition, delay: idx * 0.1 }}
          >
            <div className="py-3.5 px-5 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AgentAvatar name={team.agent_name || team.team_name} size="md" />
                <div>
                  <div className="text-sm font-bold font-display" style={{ color: tc }}>
                    {TEAM_LOGOS[team.team_index]} {team.team_name}
                  </div>
                  <div className="text-xs font-mono text-[#6B6560]">{team.agent_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-mono font-bold text-[#D4A853]">
                  <ScoreReveal value={team.purse_spent || 0} prefix="₹" suffix=" Cr" decimals={1} duration={1000} />
                </div>
                <div className="text-xs text-[#6B6560]">spent</div>
              </div>
            </div>
            {team.squad?.map((p: any) => {
              const rc = p.role === "BATSMAN" ? COLORS.cyan : p.role === "BOWLER" ? COLORS.red : p.role === "ALL_ROUNDER" ? COLORS.purple : COLORS.gold;
              return (
                <div key={p.player_id} className="py-2.5 px-5 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Badge text={p.role.replace("_", " ").slice(0, 3)} color={rc} />
                    <div>
                      <div className="text-xs font-medium text-[#F5F0E8]">{p.name}{p.nationality !== "India" && " 🌍"}</div>
                      <div className="text-xs text-[#6B6560]">{p.sub_type?.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-[#F5F0E8]">₹{p.price_paid} Cr</div>
                    <div className="text-xs font-mono" style={{ color: p.hidden_true_value >= p.price_paid ? COLORS.green : COLORS.red }}>
                      True: ₹{p.hidden_true_value.toFixed(1)}{p.is_trap && " 🪤"}{p.is_sleeper && " 💎"}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="py-2.5 px-5 text-xs text-[#6B6560] flex gap-4">
              <span>Squad: {team.squad_size}</span>
              <span>Overseas: {team.overseas_count}</span>
              <span>Remaining: ₹{team.purse_remaining?.toFixed(1)} Cr</span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function GradersTab({ evaluation }: { evaluation: any }) {
  if (!evaluation) return <p className="text-[#6B6560]">No evaluation data</p>;
  const teamEvals = evaluation.teamEvaluations || [];
  const graderNames = teamEvals[0]?.codeGraderScores?.map((g: any) => g.graderName) || [];

  const radarData = graderNames.map((name: string) => {
    const entry: any = { grader: name.replace(/_/g, " ") };
    teamEvals.forEach((t: any) => { const g = t.codeGraderScores.find((x: any) => x.graderName === name); entry[TEAM_NAMES[t.teamIndex]] = g ? Math.max(0, g.score * 100) : 0; });
    return entry;
  });

  const barData = teamEvals.map((t: any) => ({ name: TEAM_NAMES[t.teamIndex].split(" ")[1], score: t.compositeScore * 100, fill: TEAM_COLORS[t.teamIndex] }));

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      <motion.div className="broadcast-card p-5 mb-4" variants={cardReveal}>
        <div className="mb-4"><SectionLabel color={COLORS.purple} label="Composite Scores" /></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <XAxis dataKey="name" stroke={COLORS.textMuted} fontSize={11} />
            <YAxis stroke={COLORS.textMuted} domain={[0, 100]} fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>{barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div className="broadcast-card p-5 mb-4" variants={cardReveal}>
        <div className="mb-4"><SectionLabel color={COLORS.cyan} label="Grader Radar" /></div>
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={COLORS.border} />
            <PolarAngleAxis dataKey="grader" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: COLORS.textMuted, fontSize: 9 }} />
            {teamEvals.map((t: any) => <Radar key={t.teamIndex} name={TEAM_NAMES[t.teamIndex]} dataKey={TEAM_NAMES[t.teamIndex]} stroke={TEAM_COLORS[t.teamIndex]} fill={TEAM_COLORS[t.teamIndex]} fillOpacity={0.12} />)}
            <Legend wrapperStyle={{ color: COLORS.textDim, fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      {teamEvals.map((team: any, idx: number) => (
        <motion.div
          key={team.teamId}
          className="broadcast-card p-5 mb-4"
          variants={cardReveal}
          transition={{ ...cardReveal.transition, delay: 0.2 + idx * 0.08 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <AgentAvatar name={team.agentName || TEAM_NAMES[team.teamIndex]} size="sm" />
            <span className="text-sm font-bold font-display" style={{ color: TEAM_COLORS[team.teamIndex] }}>
              {TEAM_LOGOS[team.teamIndex]} {TEAM_NAMES[team.teamIndex]}
            </span>
          </div>
          {team.codeGraderScores.map((g: any) => (
            <div key={g.graderName} className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs w-[110px] text-right font-mono text-[#A09888]">{g.graderName.replace(/_/g, " ")}</span>
              <div className="flex-1 h-1.5 rounded-sm bg-[rgba(255,255,255,0.03)] overflow-hidden">
                <motion.div
                  className="h-full rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, g.score * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + idx * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                  style={{
                    background: g.score >= 0.7 ? COLORS.green : g.score >= 0.4 ? COLORS.gold : COLORS.red,
                  }}
                />
              </div>
              <span className="text-xs w-9 text-right font-mono text-[#F5F0E8]">{(g.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
}

function TranscriptTab({ data }: { data: any }) {
  const [filter, setFilter] = useState<"all" | "SOLD" | "UNSOLD">("all");
  const lots = data.transcript || [];
  const filtered = filter === "all" ? lots : lots.filter((l: any) => l.status === filter);

  return (
    <motion.div {...fadeUp}>
      <div className="flex gap-1.5 mb-4">
        {(["all", "SOLD", "UNSOLD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 px-4 text-sm font-semibold rounded-[5px] border-none cursor-pointer font-mono transition-colors ${
              filter === f ? "" : "bg-transparent text-[#6B6560] hover:text-[#A09888]"
            }`}
            style={filter === f ? {
              background: f === "SOLD" ? `${COLORS.green}18` : f === "UNSOLD" ? `${COLORS.red}18` : `${COLORS.cyan}18`,
              color: f === "SOLD" ? COLORS.green : f === "UNSOLD" ? COLORS.red : COLORS.cyan,
            } : undefined}
          >
            {f === "all" ? "ALL" : f}
          </button>
        ))}
      </div>
      {filtered.map((lot: any, idx: number) => (
        <motion.div
          key={lot.lot_number}
          className="broadcast-card mb-2"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.6) }}
        >
          <div className="py-2.5 px-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-[#6B6560]">#{lot.lot_number}</span>
              <span className="text-sm font-semibold text-[#F5F0E8]">{lot.player_name}</span>
              <Badge text={lot.player_role.replace(/_/g, " ")} color={COLORS.cyan} />
            </div>
            <div className="flex items-center gap-2">
              {lot.final_price && <span className="font-mono text-xs text-[#D4A853]">₹{lot.final_price} Cr</span>}
              <Badge text={lot.status} color={lot.status === "SOLD" ? COLORS.green : COLORS.red} />
            </div>
          </div>
          {lot.bids.map((bid: any, i: number) => {
            const ti = data.teams?.findIndex((t: any) => t.team_id === bid.team_id);
            return (
              <div key={i} className="py-1.5 px-4 flex items-start gap-3 text-xs border-b border-[rgba(255,255,255,0.03)]">
                <span className="w-[60px] shrink-0 font-semibold" style={{ color: ti >= 0 ? TEAM_COLORS[ti] : COLORS.textMuted }}>{ti >= 0 ? TEAM_NAMES[ti].split(" ")[1] : "?"}</span>
                <span className="w-[60px] shrink-0 font-mono" style={{ color: bid.action === "bid" ? COLORS.green : COLORS.red }}>{bid.action === "bid" ? `₹${bid.amount}` : "PASS"}</span>
                {bid.reasoning && <span className="text-[#6B6560] overflow-hidden text-ellipsis whitespace-nowrap">{bid.reasoning}</span>}
              </div>
            );
          })}
        </motion.div>
      ))}
    </motion.div>
  );
}

function SeasonTab({ seasonSim }: { seasonSim: any }) {
  if (!seasonSim) return <p className="text-[#6B6560]">No season data</p>;
  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      <motion.div className="broadcast-card mb-4" variants={cardReveal}>
        <div className="py-3.5 px-5 border-b border-[rgba(255,255,255,0.05)]">
          <SectionLabel color={COLORS.gold} label="BPL Season Standings (Simulated)" />
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>{["Pos", "Team", "P", "W", "L", "NRR", "Pts"].map((h) => (
              <th
                key={h}
                className={`py-2.5 px-4 text-sm uppercase tracking-wide text-[#6B6560] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] font-semibold font-display ${
                  ["P", "W", "L", "NRR", "Pts"].includes(h) ? "text-center" : "text-left"
                }`}
              >{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {seasonSim.standings?.map((t: any, idx: number) => (
              <motion.tr
                key={t.teamIndex}
                className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.01)] transition-colors"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
              >
                <td className={`py-3 px-4 font-mono ${idx < 2 ? "text-[#4ADE80]" : "text-[#F5F0E8]"}`}>{idx + 1}</td>
                <td className="py-3 px-4 font-display" style={{ color: TEAM_COLORS[t.teamIndex] }}>{TEAM_LOGOS[t.teamIndex]} {TEAM_NAMES[t.teamIndex]}</td>
                <td className="py-3 px-4 text-center text-[#A09888]">{t.played}</td>
                <td className="py-3 px-4 text-center text-[#4ADE80]">{t.won}</td>
                <td className="py-3 px-4 text-center text-[#EF4444]">{t.lost}</td>
                <td className="py-3 px-4 text-center font-mono" style={{ color: t.nrr >= 0 ? COLORS.green : COLORS.red }}>{t.nrr >= 0 ? "+" : ""}{t.nrr}</td>
                <td className="py-3 px-4 text-center font-bold text-[#D4A853]">{t.points}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div className="broadcast-card p-5" variants={cardReveal}>
        <div className="mb-3.5"><SectionLabel color={COLORS.orange} label="Match Results" /></div>
        <div className="grid grid-cols-2 gap-2">
          {seasonSim.matchResults?.map((m: any, i: number) => (
            <motion.div
              key={i}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-[rgba(255,255,255,0.02)] text-xs border border-[rgba(255,255,255,0.03)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.8) }}
            >
              <span className="font-display" style={{ color: TEAM_COLORS[m.team1Index], opacity: m.winnerIndex === m.team1Index ? 1 : 0.35 }}>{TEAM_NAMES[m.team1Index].split(" ")[1]}</span>
              <span className="text-[#6B6560] text-xs">vs</span>
              <span className="font-display" style={{ color: TEAM_COLORS[m.team2Index], opacity: m.winnerIndex === m.team2Index ? 1 : 0.35 }}>{TEAM_NAMES[m.team2Index].split(" ")[1]}</span>
              <span className="font-mono text-xs text-[#6B6560]">{m.margin}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
