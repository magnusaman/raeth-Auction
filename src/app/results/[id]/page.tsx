"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

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
  cyan: "#06B6D4", green: "#10B981", red: "#EF4444",
  purple: "#A855F7", gold: "#F59E0B", orange: "#F97316",
  surface: "#111827", border: "#1E293B", textDim: "#94A3B8", textMuted: "#64748B",
};

const TEAM_COLORS = ["#004BA0", "#FDB913", "#EC1C24", "#3A225D", "#FF822A", "#EA1A85", "#004C93", "#DD1F2D", "#1C1C2B", "#A72056"];
const TEAM_NAMES = ["Mumbai Indians", "Chennai Super Kings", "Royal Challengers", "Kolkata Knight Riders", "Sunrisers Hyderabad", "Rajasthan Royals", "Delhi Capitals", "Punjab Kings", "Gujarat Titans", "Lucknow Super Giants"];
const TEAM_LOGOS = ["🏏", "🦁", "👑", "⚡", "🌅", "🏰", "🦅", "🗡️", "🛡️", "🦁"];

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

function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-bg-surface border border-border-default rounded-[10px] overflow-hidden ${className || ""}`} style={style}>{children}</div>;
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-text-muted">Loading evaluation...</div>;
  if (!data || data.error) return <div className="flex items-center justify-center min-h-[60vh]"><Card className="p-8 text-center"><p className="text-neon-red">{data?.error || "Failed"}</p></Card></div>;

  const evaluation = data.evaluation?.results;
  const seasonSim = data.evaluation?.season_sim;
  const tabs = [
    { id: "overview", label: "Overview", color: COLORS.cyan },
    { id: "squads", label: "Squads", color: COLORS.green },
    { id: "graders", label: "Graders", color: COLORS.purple },
    { id: "transcript", label: "Transcript", color: COLORS.orange },
    { id: "season", label: "Season Sim", color: COLORS.gold },
  ];

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-xs text-text-muted bg-transparent border-none cursor-pointer">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary m-0">Auction Results</h1>
            <span className="font-mono text-sm text-text-muted">{data.auction_id?.slice(0, 14)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {evaluation?.winner && (
            <>
              <span className="text-xs text-text-muted">Winner:</span>
              <span className="text-sm font-bold" style={{ color: TEAM_COLORS[evaluation.winner.teamIndex] }}>
                {TEAM_LOGOS[evaluation.winner.teamIndex]} {TEAM_NAMES[evaluation.winner.teamIndex]}
              </span>
              <Badge text={`${(evaluation.winner.score * 100).toFixed(1)}%`} color={COLORS.gold} />
            </>
          )}
          <button onClick={() => router.push(`/auction/${params.id}`)} className="py-1.5 px-3.5 text-xs rounded-md border border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan cursor-pointer">Watch Replay →</button>
          {/* Share & Export */}
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="py-1.5 px-3 text-xs rounded-md border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
              title="Share results"
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button
              onClick={() => exportCSV(data)}
              className="py-1.5 px-3 text-xs rounded-md border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
              title="Export CSV"
            >
              CSV
            </button>
            <button
              onClick={() => exportJSON(data)}
              className="py-1.5 px-3 text-xs rounded-md border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
              title="Export JSON"
            >
              JSON
            </button>
            {shareMsg && (
              <span className="absolute -bottom-7 right-0 text-xs text-neon-green whitespace-nowrap bg-bg-elevated px-2 py-1 rounded">
                {shareMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-0.5 p-[3px] rounded-lg bg-bg-surface border border-border-default mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-5 text-sm font-semibold rounded-md border-none cursor-pointer ${
              activeTab === tab.id ? "bg-bg-elevated" : "bg-transparent"
            }`}
            style={{
              color: activeTab === tab.id ? tab.color : COLORS.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab data={data} evaluation={evaluation} />}
      {activeTab === "squads" && <SquadsTab data={data} />}
      {activeTab === "graders" && <GradersTab evaluation={evaluation} />}
      {activeTab === "transcript" && <TranscriptTab data={data} />}
      {activeTab === "season" && <SeasonTab seasonSim={seasonSim} />}
    </div>
  );
}

function OverviewTab({ data, evaluation }: { data: any; evaluation: any }) {
  if (!evaluation) return <p className="text-text-muted">No evaluation data</p>;
  const teamEvals = evaluation.teamEvaluations || [];

  return (
    <div>
      {/* Rankings */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {teamEvals.sort((a: any, b: any) => a.rank - b.rank).map((team: any) => {
          const tc = TEAM_COLORS[team.teamIndex];
          return (
            <Card
              key={team.teamId}
              className="p-6 text-center"
              style={team.rank === 1 ? { borderColor: tc, borderWidth: 2 } : undefined}
            >
              <div className="text-[28px] mb-1">{TEAM_LOGOS[team.teamIndex]}</div>
              <div className="text-sm font-bold mb-0.5" style={{ color: tc }}>{TEAM_NAMES[team.teamIndex]}</div>
              <div className="text-xs font-mono text-text-muted mb-3">{team.agentName}</div>
              <div className={`text-4xl font-extrabold font-mono mb-2 ${team.rank === 1 ? "text-brand" : "text-text-primary"}`}>
                {(team.compositeScore * 100).toFixed(1)}%
              </div>
              <Badge text={`#${team.rank}`} color={team.rank === 1 ? COLORS.gold : COLORS.textMuted} />
            </Card>
          );
        })}
      </div>

      {/* Best/Worst */}
      <div className="grid grid-cols-2 gap-3.5 mb-6">
        {teamEvals.map((team: any) => (
          <Card key={team.teamId} className="p-[18px]">
            <div className="flex items-center gap-2 mb-3.5">
              <span className="text-lg">{TEAM_LOGOS[team.teamIndex]}</span>
              <span className="text-sm font-bold" style={{ color: TEAM_COLORS[team.teamIndex] }}>{TEAM_NAMES[team.teamIndex]}</span>
            </div>
            <div className="border-l-[3px] border-neon-green py-2 px-3.5 bg-neon-green/[0.03] rounded-r-md mb-2">
              <SectionLabel color={COLORS.green} label="Best" />
              <p className="text-xs text-text-secondary mt-1">{team.highlights.bestDecision.description}</p>
            </div>
            <div className="border-l-[3px] border-neon-red py-2 px-3.5 bg-neon-red/[0.03] rounded-r-md">
              <SectionLabel color={COLORS.red} label="Worst" />
              <p className="text-xs text-text-secondary mt-1">{team.highlights.worstDecision.description}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Value Heatmap */}
      <Card className="p-[18px]">
        <div className="mb-4"><SectionLabel color={COLORS.gold} label="Value Heatmap — Price vs True Value" /></div>
        {data.teams?.map((team: any) => (
          <div key={team.team_id} className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: TEAM_COLORS[team.team_index] }}>{TEAM_LOGOS[team.team_index]} {team.team_name}</p>
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
      </Card>
    </div>
  );
}

function SquadsTab({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {data.teams?.map((team: any) => {
        const tc = TEAM_COLORS[team.team_index];
        return (
          <Card key={team.team_id}>
            <div className="py-3.5 px-[18px] border-b border-border-default flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{TEAM_LOGOS[team.team_index]}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: tc }}>{team.team_name}</div>
                  <div className="text-xs font-mono text-text-muted">{team.agent_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-mono font-bold text-neon-cyan">₹{team.purse_spent?.toFixed(1)} Cr</div>
                <div className="text-xs text-text-muted">spent</div>
              </div>
            </div>
            {team.squad?.map((p: any) => {
              const rc = p.role === "BATSMAN" ? COLORS.cyan : p.role === "BOWLER" ? COLORS.red : p.role === "ALL_ROUNDER" ? COLORS.purple : COLORS.gold;
              return (
                <div key={p.player_id} className="py-2.5 px-[18px] border-b border-border-default flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Badge text={p.role.replace("_", " ").slice(0, 3)} color={rc} />
                    <div>
                      <div className="text-xs font-medium text-text-primary">{p.name}{p.nationality !== "India" && " 🌍"}</div>
                      <div className="text-xs text-text-muted">{p.sub_type?.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-text-primary">₹{p.price_paid} Cr</div>
                    <div className="text-xs font-mono" style={{ color: p.hidden_true_value >= p.price_paid ? COLORS.green : COLORS.red }}>
                      True: ₹{p.hidden_true_value.toFixed(1)}{p.is_trap && " 🪤"}{p.is_sleeper && " 💎"}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="py-2.5 px-[18px] text-xs text-text-muted flex gap-4">
              <span>Squad: {team.squad_size}</span>
              <span>Overseas: {team.overseas_count}</span>
              <span>Remaining: ₹{team.purse_remaining?.toFixed(1)} Cr</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function GradersTab({ evaluation }: { evaluation: any }) {
  if (!evaluation) return <p className="text-text-muted">No evaluation data</p>;
  const teamEvals = evaluation.teamEvaluations || [];
  const graderNames = teamEvals[0]?.codeGraderScores?.map((g: any) => g.graderName) || [];

  const radarData = graderNames.map((name: string) => {
    const entry: any = { grader: name.replace(/_/g, " ") };
    teamEvals.forEach((t: any) => { const g = t.codeGraderScores.find((x: any) => x.graderName === name); entry[TEAM_NAMES[t.teamIndex]] = g ? Math.max(0, g.score * 100) : 0; });
    return entry;
  });

  const barData = teamEvals.map((t: any) => ({ name: TEAM_NAMES[t.teamIndex].split(" ")[1], score: t.compositeScore * 100, fill: TEAM_COLORS[t.teamIndex] }));

  return (
    <div>
      <Card className="p-5 mb-4">
        <div className="mb-4"><SectionLabel color={COLORS.purple} label="Composite Scores" /></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <XAxis dataKey="name" stroke={COLORS.textMuted} fontSize={11} />
            <YAxis stroke={COLORS.textMuted} domain={[0, 100]} fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>{barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5 mb-4">
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
      </Card>

      {teamEvals.map((team: any) => (
        <Card key={team.teamId} className="p-[18px] mb-3.5">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-lg">{TEAM_LOGOS[team.teamIndex]}</span>
            <span className="text-sm font-bold" style={{ color: TEAM_COLORS[team.teamIndex] }}>{TEAM_NAMES[team.teamIndex]}</span>
          </div>
          {team.codeGraderScores.map((g: any) => (
            <div key={g.graderName} className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs w-[110px] text-right font-mono text-text-secondary">{g.graderName.replace(/_/g, " ")}</span>
              <div className="flex-1 h-1.5 rounded-sm bg-bg-primary overflow-hidden">
                <div
                  className="h-full rounded-sm transition-[width] duration-[600ms]"
                  style={{
                    width: `${Math.max(0, g.score * 100)}%`,
                    background: g.score >= 0.7 ? COLORS.green : g.score >= 0.4 ? COLORS.gold : COLORS.red,
                  }}
                />
              </div>
              <span className="text-xs w-9 text-right font-mono text-text-primary">{(g.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

function TranscriptTab({ data }: { data: any }) {
  const [filter, setFilter] = useState<"all" | "SOLD" | "UNSOLD">("all");
  const lots = data.transcript || [];
  const filtered = filter === "all" ? lots : lots.filter((l: any) => l.status === filter);

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {(["all", "SOLD", "UNSOLD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 px-4 text-sm font-semibold rounded-[5px] border-none cursor-pointer font-mono ${
              filter === f ? "" : "bg-transparent text-text-muted"
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
      {filtered.map((lot: any) => (
        <Card key={lot.lot_number} className="mb-2">
          <div className="py-2.5 px-4 border-b border-border-default flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-text-muted">#{lot.lot_number}</span>
              <span className="text-sm font-semibold text-text-primary">{lot.player_name}</span>
              <Badge text={lot.player_role.replace(/_/g, " ")} color={COLORS.cyan} />
            </div>
            <div className="flex items-center gap-2">
              {lot.final_price && <span className="font-mono text-xs text-brand">₹{lot.final_price} Cr</span>}
              <Badge text={lot.status} color={lot.status === "SOLD" ? COLORS.green : COLORS.red} />
            </div>
          </div>
          {lot.bids.map((bid: any, i: number) => {
            const ti = data.teams?.findIndex((t: any) => t.team_id === bid.team_id);
            return (
              <div key={i} className="py-1.5 px-4 flex items-start gap-3 text-xs border-b border-border-default">
                <span className="w-[60px] shrink-0 font-semibold" style={{ color: ti >= 0 ? TEAM_COLORS[ti] : COLORS.textMuted }}>{ti >= 0 ? TEAM_NAMES[ti].split(" ")[1] : "?"}</span>
                <span className="w-[60px] shrink-0 font-mono" style={{ color: bid.action === "bid" ? COLORS.green : COLORS.red }}>{bid.action === "bid" ? `₹${bid.amount}` : "PASS"}</span>
                {bid.reasoning && <span className="text-text-muted overflow-hidden text-ellipsis whitespace-nowrap">{bid.reasoning}</span>}
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

function SeasonTab({ seasonSim }: { seasonSim: any }) {
  if (!seasonSim) return <p className="text-text-muted">No season data</p>;
  return (
    <div>
      <Card className="mb-4">
        <div className="py-3.5 px-[18px] border-b border-border-default">
          <SectionLabel color={COLORS.gold} label="BPL Season Standings (Simulated)" />
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>{["Pos", "Team", "P", "W", "L", "NRR", "Pts"].map((h) => (
              <th
                key={h}
                className={`py-2.5 px-4 text-sm uppercase tracking-wide text-text-muted border-b border-border-default bg-[#0d0d14] font-semibold ${
                  ["P", "W", "L", "NRR", "Pts"].includes(h) ? "text-center" : "text-left"
                }`}
              >{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {seasonSim.standings?.map((t: any, idx: number) => (
              <tr key={t.teamIndex} className="border-b border-border-default">
                <td className={`py-3 px-4 font-mono ${idx < 2 ? "text-neon-green" : "text-text-primary"}`}>{idx + 1}</td>
                <td className="py-3 px-4" style={{ color: TEAM_COLORS[t.teamIndex] }}>{TEAM_LOGOS[t.teamIndex]} {TEAM_NAMES[t.teamIndex]}</td>
                <td className="py-3 px-4 text-center text-text-secondary">{t.played}</td>
                <td className="py-3 px-4 text-center text-neon-green">{t.won}</td>
                <td className="py-3 px-4 text-center text-neon-red">{t.lost}</td>
                <td className="py-3 px-4 text-center font-mono" style={{ color: t.nrr >= 0 ? COLORS.green : COLORS.red }}>{t.nrr >= 0 ? "+" : ""}{t.nrr}</td>
                <td className="py-3 px-4 text-center font-bold text-brand">{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-[18px]">
        <div className="mb-3.5"><SectionLabel color={COLORS.orange} label="Match Results" /></div>
        <div className="grid grid-cols-2 gap-2">
          {seasonSim.matchResults?.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-md bg-bg-primary text-xs">
              <span style={{ color: TEAM_COLORS[m.team1Index], opacity: m.winnerIndex === m.team1Index ? 1 : 0.35 }}>{TEAM_NAMES[m.team1Index].split(" ")[1]}</span>
              <span className="text-text-muted text-xs">vs</span>
              <span style={{ color: TEAM_COLORS[m.team2Index], opacity: m.winnerIndex === m.team2Index ? 1 : 0.35 }}>{TEAM_NAMES[m.team2Index].split(" ")[1]}</span>
              <span className="font-mono text-xs text-text-muted">{m.margin}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
