"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";

/* ── Constants ── */
const TEAM_SHORT = ["MI", "CSK", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"];
const TEAM_COLORS = ["#004BA0", "#FDB913", "#EC1C24", "#3A225D", "#FF822A", "#EA1A85", "#004C93", "#DD1F2D", "#1C1C2B", "#A72056"];
const TEAM_ICONS = ["🏏", "🦁", "👑", "⚡", "🌅", "🏰", "🦅", "🗡️", "🛡️", "🦁"];
const TEAM_NAMES = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers",
  "Kolkata Knight Riders",
  "Sunrisers Hyderabad",
  "Rajasthan Royals",
  "Delhi Capitals",
  "Punjab Kings",
  "Gujarat Titans",
  "Lucknow Super Giants",
];

const ACCENT = {
  cyan: "#D4A853",
  purple: "#8B7A4A",
  gold: "#F5C842",
  green: "#22C55E",
  red: "#FF3040",
  orange: "#F97316",
};

const AUCTION_COLORS = [ACCENT.cyan, ACCENT.purple, ACCENT.gold, ACCENT.green];

/* ── Types ── */
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

interface GraderScore {
  graderName: string;
  score: number;
  details: string;
}

interface TeamEval {
  teamId: string;
  teamIndex: number;
  agentName: string;
  compositeScore: number;
  rank: number;
  codeGraderScores: GraderScore[];
  highlights: {
    bestDecision: { lotNumber: number; description: string };
    worstDecision: { lotNumber: number; description: string };
  };
}

interface EvalResults {
  teamEvaluations: TeamEval[];
  winner: {
    teamId: string;
    teamIndex: number;
    agentName: string;
    score: number;
  };
}

interface AuctionResults {
  auction_id: string;
  teams: {
    team_id: string;
    team_index: number;
    team_name: string;
    agent_name: string;
    purse_remaining: number;
    purse_spent: number;
    squad_size: number;
    overseas_count: number;
  }[];
  evaluation: {
    results: EvalResults;
    season_sim: any;
  } | null;
}

/* ════════════════════════════════════════════════════════════════
   SVG BAR CHART COMPONENT
   ════════════════════════════════════════════════════════════════ */

function BarChart({
  data,
  colors,
  labels,
  maxValue,
  height = 180,
  formatValue,
}: {
  data: number[];
  colors: string[];
  labels: string[];
  maxValue?: number;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = maxValue ?? Math.max(...data, 1);
  const barWidth = 36;
  const gap = 16;
  const totalWidth = data.length * (barWidth + gap) - gap;
  const padLeft = 40;
  const padBottom = 28;
  const padTop = 24;
  const chartH = height - padBottom - padTop;
  const svgW = padLeft + totalWidth + 16;

  // Grid lines
  const gridLines = 4;
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round((max / gridLines) * i * 10) / 10
  );

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${height}`}
      className="overflow-visible"
    >
      {/* Grid */}
      {gridVals.map((v, i) => {
        const y = padTop + chartH - (v / max) * chartH;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              y1={y}
              x2={svgW - 8}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3,3"
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fill="#64748B"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {formatValue ? formatValue(v) : v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((val, i) => {
        const barH = Math.max(2, (val / max) * chartH);
        const x = padLeft + i * (barWidth + gap);
        const y = padTop + chartH - barH;

        return (
          <g key={i}>
            <defs>
              <linearGradient
                id={`bar-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colors[i]} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors[i]} stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill={`url(#bar-grad-${i})`}
            />
            {/* Glow */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill="none"
              stroke={colors[i]}
              strokeOpacity="0.3"
              strokeWidth="1"
            />
            {/* Value label */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fill={colors[i]}
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              {formatValue ? formatValue(val) : val.toFixed(1)}
            </text>
            {/* Label */}
            <text
              x={x + barWidth / 2}
              y={padTop + chartH + 16}
              textAnchor="middle"
              fill="#A09888"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   SVG RADAR CHART COMPONENT
   ════════════════════════════════════════════════════════════════ */

function RadarChart({
  datasets,
  labels,
  colors,
  size = 280,
}: {
  datasets: { label: string; values: number[] }[];
  labels: string[];
  colors: string[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;
  const numAxes = labels.length;
  const angleStep = (2 * Math.PI) / numAxes;

  function pointOnAxis(axisIndex: number, value: number) {
    const angle = -Math.PI / 2 + axisIndex * angleStep;
    const r = (value / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Grid polygons */}
      {gridLevels.map((level) => {
        const points = Array.from({ length: numAxes }, (_, i) => {
          const p = pointOnAxis(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axes */}
      {labels.map((_, i) => {
        const p = pointOnAxis(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = pointOnAxis(i, 115);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#A09888"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {label}
          </text>
        );
      })}

      {/* Data polygons */}
      {datasets.map((ds, di) => {
        const points = Array.from({ length: numAxes }, (_, i) => {
          const p = pointOnAxis(i, Math.max(0, ds.values[i] || 0));
          return `${p.x},${p.y}`;
        }).join(" ");

        return (
          <g key={di}>
            <polygon
              points={points}
              fill={colors[di]}
              fillOpacity="0.1"
              stroke={colors[di]}
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            {/* Dots */}
            {Array.from({ length: numAxes }, (_, i) => {
              const p = pointOnAxis(i, Math.max(0, ds.values[i] || 0));
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  fill={colors[di]}
                  stroke="#0A0E17"
                  strokeWidth="1"
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */

export default function ComparePage() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resultsMap, setResultsMap] = useState<
    Record<string, AuctionResults>
  >({});
  const [loadingResults, setLoadingResults] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Fetch auctions list
  useEffect(() => {
    fetch("/api/v1/auctions")
      .then((r) => r.json())
      .then((d) =>
        setAuctions(
          (d.auctions || []).filter(
            (a: AuctionSummary) =>
              a.status === "COMPLETED" && a.has_evaluation
          )
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const toggleAuction = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < 4) {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  // Fetch results for selected auctions
  const startComparison = useCallback(async () => {
    if (selectedIds.size < 2) return;
    setLoadingResults(true);

    const ids = Array.from(selectedIds);
    const newResults: Record<string, AuctionResults> = {};

    await Promise.all(
      ids.map(async (id) => {
        if (resultsMap[id]) {
          newResults[id] = resultsMap[id];
          return;
        }
        try {
          const res = await fetch(`/api/v1/auctions/${id}/results`);
          const data = await res.json();
          if (!data.error) {
            newResults[id] = data;
          }
        } catch (e) {
          console.error(`Failed to fetch results for ${id}`, e);
        }
      })
    );

    setResultsMap((prev) => ({ ...prev, ...newResults }));
    setLoadingResults(false);
    setComparing(true);
  }, [selectedIds, resultsMap]);

  const selectedAuctions = useMemo(
    () => auctions.filter((a) => selectedIds.has(a.auction_id)),
    [auctions, selectedIds]
  );

  const comparisonData = useMemo(() => {
    if (!comparing) return null;
    const ids = Array.from(selectedIds);
    const results = ids
      .map((id) => resultsMap[id])
      .filter(Boolean) as AuctionResults[];
    if (results.length < 2) return null;
    return results;
  }, [comparing, selectedIds, resultsMap]);

  // Gather all grader names from the evaluation data
  const graderNames = useMemo(() => {
    if (!comparisonData) return [];
    const names = new Set<string>();
    comparisonData.forEach((res) => {
      res.evaluation?.results?.teamEvaluations?.forEach((te) => {
        te.codeGraderScores?.forEach((g) => names.add(g.graderName));
      });
    });
    return Array.from(names);
  }, [comparisonData]);

  const resetComparison = useCallback(() => {
    setComparing(false);
  }, []);

  /* ─── RENDER ─── */

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-purple">
          Analysis
        </span>
        <h1 className="mt-1 text-3xl font-bold text-gradient-brand">
          Compare Auctions
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Compare agent performance across multiple auction runs side by side
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 bg-bg-surface border border-border-subtle rounded-xl shimmer"
            />
          ))}
        </div>
      )}

      {/* No auctions */}
      {!loading && auctions.length === 0 && (
        <div className="glass rounded-2xl py-20 text-center animate-fade-up">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-text-secondary mb-2">
            No evaluated auctions available for comparison
          </p>
          <p className="text-sm text-text-muted mb-6">
            Run and evaluate at least 2 auctions to start comparing
          </p>
          <Link
            href="/"
            className="btn-primary text-sm py-2.5 px-6 inline-block"
          >
            Create Your First Auction
          </Link>
        </div>
      )}

      {/* Selection Phase */}
      {!loading && auctions.length > 0 && !comparing && (
        <div className="animate-fade-up">
          {/* Selection toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted font-mono">
                {selectedIds.size}/4 selected
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-text-disabled hover:text-text-muted transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={startComparison}
              disabled={selectedIds.size < 2 || loadingResults}
              className={`btn-primary text-sm py-2 px-5 ${
                selectedIds.size < 2
                  ? "opacity-30 cursor-not-allowed"
                  : ""
              }`}
            >
              {loadingResults ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                `Compare ${selectedIds.size} Auctions`
              )}
            </button>
          </div>

          {/* Selection hint */}
          {selectedIds.size < 2 && (
            <div className="mb-5 px-4 py-2.5 rounded-lg bg-accent-cyan/5 border border-accent-cyan/15 text-sm text-accent-cyan">
              Select 2 to 4 evaluated auctions to compare their agent
              performance
            </div>
          )}

          {/* Auction cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {auctions.map((a) => {
              const selected = selectedIds.has(a.auction_id);
              const disabled = !selected && selectedIds.size >= 4;
              const totalSpent = a.teams.reduce(
                (s, t) => s + (100 - (t.purse_remaining || 0)),
                0
              );
              const totalPlayers = a.teams.reduce(
                (s, t) => s + t.squad_size,
                0
              );
              const dateStr = a.completed_at
                ? new Date(a.completed_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "";

              return (
                <button
                  key={a.auction_id}
                  onClick={() => !disabled && toggleAuction(a.auction_id)}
                  disabled={disabled}
                  className={`glass glass-hover relative text-left p-4 rounded-2xl transition-all duration-200 cursor-pointer group ${
                    selected
                      ? "border-accent-cyan/40 !border-[1.5px]"
                      : disabled
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {/* Checkbox */}
                  <div className="absolute top-3.5 right-3.5">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selected
                          ? "bg-accent-cyan border-accent-cyan"
                          : "border-border-hover bg-transparent"
                      }`}
                    >
                      {selected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="#0A0E17"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* ID */}
                  <span className="font-mono text-xs text-text-muted group-hover:text-accent-cyan transition-colors">
                    {a.auction_id.slice(0, 14)}...
                  </span>

                  {/* Teams */}
                  <div className="flex gap-1.5 mt-2 mb-3">
                    {a.teams.map((t) => (
                      <div
                        key={t.team_index}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{
                          background: `${TEAM_COLORS[t.team_index]}12`,
                          border: `1px solid ${TEAM_COLORS[t.team_index]}30`,
                        }}
                      >
                        <span className="text-xs">
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

                  {/* Models */}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-3">
                    {a.teams.map((t) => (
                      <span
                        key={t.team_index}
                        className="text-xs text-text-muted"
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

                  {/* Stats */}
                  <div className="flex items-center gap-3 pt-2.5 border-t border-border-subtle text-sm text-text-muted">
                    <span>
                      <span className="font-mono font-semibold text-text-secondary">
                        {totalPlayers}
                      </span>{" "}
                      players
                    </span>
                    <span>
                      <span className="font-mono font-semibold text-text-secondary">
                        ₹{totalSpent.toFixed(0)}
                      </span>{" "}
                      Cr
                    </span>
                    {dateStr && (
                      <span className="ml-auto">{dateStr}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison View */}
      {comparing && comparisonData && (
        <ComparisonView
          data={comparisonData}
          graderNames={graderNames}
          onBack={resetComparison}
        />
      )}

      {/* Comparison failed — not enough evaluated data */}
      {comparing && !comparisonData && !loadingResults && (
        <div className="glass rounded-2xl py-16 text-center animate-fade-up">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <svg className="w-6 h-6 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-text-primary mb-2">Comparison failed</p>
          <p className="text-sm text-text-muted mb-6">
            Could not load evaluation data for the selected auctions. Make sure they have been evaluated.
          </p>
          <button onClick={resetComparison} className="btn-primary text-sm py-2.5 px-6">
            Back to Selection
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPARISON VIEW
   ════════════════════════════════════════════════════════════════ */

function ComparisonView({
  data,
  graderNames,
  onBack,
}: {
  data: AuctionResults[];
  graderNames: string[];
  onBack: () => void;
}) {
  const auctionCount = data.length;

  // Build comparison structures per team across auctions
  const teamComparisons = useMemo(() => {
    // For each team index (0-3), gather data across all auctions
    const teams: {
      teamIndex: number;
      auctions: {
        auctionId: string;
        auctionLabel: string;
        agentName: string;
        compositeScore: number;
        rank: number;
        purseSpent: number;
        squadSize: number;
        overseasCount: number;
        graderScores: Record<string, number>;
      }[];
    }[] = [];

    // Discover all team indices across all auctions
    const allTeamIndices = new Set<number>();
    data.forEach((res) => res.teams.forEach((t) => allTeamIndices.add(t.team_index)));
    for (const ti of Array.from(allTeamIndices).sort((a, b) => a - b)) {
      const auctionData = data
        .map((res, ai) => {
          const teamData = res.teams.find((t) => t.team_index === ti);
          const evalTeam = res.evaluation?.results?.teamEvaluations?.find(
            (te) => te.teamIndex === ti
          );
          if (!teamData || !evalTeam) return null;

          const graderScores: Record<string, number> = {};
          evalTeam.codeGraderScores?.forEach((g) => {
            graderScores[g.graderName] = g.score;
          });

          return {
            auctionId: res.auction_id,
            auctionLabel: `Run ${ai + 1}`,
            agentName: teamData.agent_name,
            compositeScore: evalTeam.compositeScore,
            rank: evalTeam.rank,
            purseSpent: teamData.purse_spent,
            squadSize: teamData.squad_size,
            overseasCount: teamData.overseas_count,
            graderScores,
          };
        })
        .filter(Boolean) as any[];

      if (auctionData.length > 0) {
        teams.push({ teamIndex: ti, auctions: auctionData });
      }
    }
    return teams;
  }, [data]);

  // Overall per-auction winners
  const auctionWinners = useMemo(
    () =>
      data.map((res) => ({
        auctionId: res.auction_id,
        winner: res.evaluation?.results?.winner,
      })),
    [data]
  );

  // Get short grader label
  function graderLabel(name: string): string {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace("Efficiency", "Eff.")
      .replace("Accuracy", "Acc.")
      .replace("Optimization", "Opt.")
      .replace("Compliance", "Compl.")
      .replace("Management", "Mgmt.")
      .replace("Resistance", "Resist.")
      .replace("Discovery", "Disc.")
      .replace("Discipline", "Disc.");
  }

  return (
    <div className="animate-fade-up">
      {/* Back button + header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Select Different Auctions
        </button>
        <span className="text-sm font-mono text-text-muted">
          Comparing {auctionCount} auctions
        </span>
      </div>

      {/* Auction legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {data.map((res, i) => (
          <div
            key={res.auction_id}
            className="glass rounded-xl px-4 py-2.5 flex items-center gap-3"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: AUCTION_COLORS[i] }}
            />
            <div>
              <div className="text-sm font-bold font-mono" style={{ color: AUCTION_COLORS[i] }}>
                Run {i + 1}
              </div>
              <div className="text-xs font-mono text-text-muted">
                {res.auction_id.slice(0, 12)}...
              </div>
            </div>
            {auctionWinners[i]?.winner && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border-subtle">
                <span className="text-xs">
                  {TEAM_ICONS[auctionWinners[i].winner!.teamIndex]}
                </span>
                <span
                  className="text-xs font-bold font-mono"
                  style={{
                    color:
                      TEAM_COLORS[auctionWinners[i].winner!.teamIndex],
                  }}
                >
                  {TEAM_SHORT[auctionWinners[i].winner!.teamIndex]}
                </span>
                <span className="text-xs font-mono text-accent-gold">
                  {(auctionWinners[i].winner!.score * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Section 1: Composite Score Comparison ── */}
      <SectionHeader
        label="Composite Scores"
        color={ACCENT.cyan}
        description="Overall performance scores per team across runs"
      />
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamComparisons.map((tc) => (
            <div key={tc.teamIndex}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{TEAM_ICONS[tc.teamIndex]}</span>
                <span
                  className="text-[15px] font-bold"
                  style={{ color: TEAM_COLORS[tc.teamIndex] }}
                >
                  {TEAM_NAMES[tc.teamIndex]}
                </span>
              </div>
              <BarChart
                data={tc.auctions.map(
                  (a) => a.compositeScore * 100
                )}
                colors={tc.auctions.map((_, i) => AUCTION_COLORS[i])}
                labels={tc.auctions.map((a) => a.auctionLabel)}
                maxValue={100}
                height={160}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Side-by-side summary table ── */}
      <SectionHeader
        label="Auction Summary"
        color={ACCENT.purple}
        description="Key metrics side by side"
      />
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-bg-elevated/50">
                <th className="py-3 px-4 text-left text-xs uppercase tracking-wider text-text-muted font-semibold border-b border-border-default">
                  Team
                </th>
                <th className="py-3 px-4 text-left text-xs uppercase tracking-wider text-text-muted font-semibold border-b border-border-default">
                  Metric
                </th>
                {data.map((_, i) => (
                  <th
                    key={i}
                    className="py-3 px-4 text-center text-xs uppercase tracking-wider font-semibold font-mono border-b border-border-default"
                    style={{ color: AUCTION_COLORS[i] }}
                  >
                    Run {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamComparisons.map((tc) => {
                const rows = [
                  {
                    label: "Agent",
                    values: tc.auctions.map((a) => a.agentName),
                    isMono: false,
                  },
                  {
                    label: "Score",
                    values: tc.auctions.map(
                      (a) => `${(a.compositeScore * 100).toFixed(1)}%`
                    ),
                    isMono: true,
                  },
                  {
                    label: "Rank",
                    values: tc.auctions.map((a) => `#${a.rank}`),
                    isMono: true,
                  },
                  {
                    label: "Spend",
                    values: tc.auctions.map(
                      (a) => `₹${a.purseSpent.toFixed(1)} Cr`
                    ),
                    isMono: true,
                  },
                  {
                    label: "Squad",
                    values: tc.auctions.map(
                      (a) => `${a.squadSize} players`
                    ),
                    isMono: true,
                  },
                  {
                    label: "Overseas",
                    values: tc.auctions.map((a) => `${a.overseasCount}`),
                    isMono: true,
                  },
                ];

                return rows.map((row, ri) => (
                  <tr
                    key={`${tc.teamIndex}-${ri}`}
                    className="border-b border-border-subtle hover:bg-bg-elevated/20 transition-colors"
                  >
                    {ri === 0 && (
                      <td
                        rowSpan={rows.length}
                        className="py-2 px-4 border-b border-border-default align-middle border-r border-border-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {TEAM_ICONS[tc.teamIndex]}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color: TEAM_COLORS[tc.teamIndex],
                            }}
                          >
                            {TEAM_SHORT[tc.teamIndex]}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="py-2 px-4 text-text-muted text-sm">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td
                        key={vi}
                        className={`py-2 px-4 text-center text-text-primary ${
                          row.isMono ? "font-mono" : ""
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Radar Chart per team ── */}
      {graderNames.length > 0 && (
        <>
          <SectionHeader
            label="Grader Breakdown"
            color={ACCENT.gold}
            description="Radar comparison of individual grader scores per team"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {teamComparisons.map((tc) => {
              const datasets = tc.auctions.map((a, ai) => ({
                label: a.auctionLabel,
                values: graderNames.map(
                  (g) => (a.graderScores[g] || 0) * 100
                ),
              }));

              return (
                <div key={tc.teamIndex} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">
                      {TEAM_ICONS[tc.teamIndex]}
                    </span>
                    <span
                      className="text-[15px] font-bold"
                      style={{ color: TEAM_COLORS[tc.teamIndex] }}
                    >
                      {TEAM_NAMES[tc.teamIndex]}
                    </span>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-3">
                    {tc.auctions.map((a, ai) => (
                      <div
                        key={ai}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: AUCTION_COLORS[ai],
                          }}
                        />
                        <span className="text-xs font-mono text-text-muted">
                          {a.auctionLabel} ({a.agentName})
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <RadarChart
                      datasets={datasets}
                      labels={graderNames.map((g) => graderLabel(g))}
                      colors={tc.auctions.map(
                        (_, i) => AUCTION_COLORS[i]
                      )}
                      size={280}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Section 4: Grader Score Bars ── */}
      {graderNames.length > 0 && (
        <>
          <SectionHeader
            label="Grader Detail Comparison"
            color={ACCENT.green}
            description="Individual grader scores shown as horizontal bars"
          />
          <div className="space-y-4 mb-6">
            {graderNames.map((gName) => (
              <div key={gName} className="glass rounded-2xl p-5">
                <div className="text-xs font-bold font-mono uppercase tracking-wider text-text-secondary mb-4">
                  {gName.replace(/_/g, " ")}
                </div>

                {teamComparisons.map((tc) => (
                  <div key={tc.teamIndex} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">
                        {TEAM_ICONS[tc.teamIndex]}
                      </span>
                      <span
                        className="text-sm font-bold font-mono"
                        style={{ color: TEAM_COLORS[tc.teamIndex] }}
                      >
                        {TEAM_SHORT[tc.teamIndex]}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {tc.auctions.map((a, ai) => {
                        const score =
                          (a.graderScores[gName] || 0) * 100;
                        const barColor =
                          score >= 70
                            ? ACCENT.green
                            : score >= 40
                            ? ACCENT.gold
                            : ACCENT.red;

                        return (
                          <div
                            key={ai}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="text-xs font-mono w-10 shrink-0"
                              style={{ color: AUCTION_COLORS[ai] }}
                            >
                              Run {ai + 1}
                            </span>
                            <div className="flex-1 h-[6px] rounded-sm bg-bg-primary overflow-hidden">
                              <div
                                className="h-full rounded-sm transition-[width] duration-700"
                                style={{
                                  width: `${Math.max(0, score)}%`,
                                  background: barColor,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono w-9 text-right text-text-primary">
                              {score.toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Section 5: Spend Comparison Bar Chart ── */}
      <SectionHeader
        label="Budget Utilization"
        color={ACCENT.orange}
        description="Total spend per team across runs"
      />
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamComparisons.map((tc) => (
            <div key={tc.teamIndex}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{TEAM_ICONS[tc.teamIndex]}</span>
                <span
                  className="text-[15px] font-bold"
                  style={{ color: TEAM_COLORS[tc.teamIndex] }}
                >
                  {TEAM_NAMES[tc.teamIndex]}
                </span>
              </div>
              <BarChart
                data={tc.auctions.map((a) => a.purseSpent)}
                colors={tc.auctions.map((_, i) => AUCTION_COLORS[i])}
                labels={tc.auctions.map((a) => a.auctionLabel)}
                maxValue={100}
                height={150}
                formatValue={(v) => `₹${v.toFixed(1)}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 6: Squad Size Comparison ── */}
      <SectionHeader
        label="Squad Composition"
        color={ACCENT.cyan}
        description="Squad sizes and overseas count per team"
      />
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {teamComparisons.map((tc) => (
            <div key={tc.teamIndex}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{TEAM_ICONS[tc.teamIndex]}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: TEAM_COLORS[tc.teamIndex] }}
                >
                  {TEAM_SHORT[tc.teamIndex]}
                </span>
              </div>

              {tc.auctions.map((a, ai) => (
                <div
                  key={ai}
                  className="flex items-center gap-2 mb-2 py-2 px-3 rounded-lg bg-bg-surface/60"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: AUCTION_COLORS[ai] }}
                  />
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: AUCTION_COLORS[ai] }}
                  >
                    Run {ai + 1}
                  </span>
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right">
                      <div className="text-[15px] font-mono font-bold text-text-primary">
                        {a.squadSize}
                      </div>
                      <div className="text-xs text-text-muted uppercase tracking-wide">
                        Squad
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-mono font-bold text-accent-purple">
                        {a.overseasCount}
                      </div>
                      <div className="text-xs text-text-muted uppercase tracking-wide">
                        Overseas
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 7: Win Matrix ── */}
      <SectionHeader
        label="Win Summary"
        color={ACCENT.gold}
        description="Which team won across each auction run"
      />
      <div className="glass rounded-2xl p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.map((res, ai) => {
            const winner = res.evaluation?.results?.winner;
            if (!winner) return null;

            return (
              <div
                key={res.auction_id}
                className="relative overflow-hidden rounded-xl bg-bg-surface/60 border border-border-subtle p-4"
              >
                {/* Subtle glow */}
                <div
                  className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
                  style={{ background: AUCTION_COLORS[ai] }}
                />
                <div className="text-xs font-mono text-text-muted mb-3 mt-1">
                  <span style={{ color: AUCTION_COLORS[ai] }}>
                    Run {ai + 1}
                  </span>{" "}
                  &mdash; {res.auction_id.slice(0, 10)}...
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {TEAM_ICONS[winner.teamIndex]}
                  </span>
                  <div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: TEAM_COLORS[winner.teamIndex],
                      }}
                    >
                      {TEAM_NAMES[winner.teamIndex]}
                    </div>
                    <div className="text-xs font-mono text-text-muted">
                      {winner.agentName}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[22px] font-extrabold font-mono text-gradient-gold">
                    {(winner.score * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs font-bold font-mono tracking-wider text-accent-gold bg-accent-gold/10 border border-accent-gold/20 px-2 py-0.5 rounded">
                    WINNER
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Win count summary */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="text-xs font-bold font-mono uppercase tracking-wider text-text-muted mb-3">
            Win Count
          </div>
          <div className="flex flex-wrap gap-4">
            {teamComparisons.map((tc) => tc.teamIndex).map((ti) => {
              const wins = auctionWinners.filter(
                (aw) => aw.winner?.teamIndex === ti
              ).length;
              if (wins === 0) return null;

              return (
                <div key={ti} className="flex items-center gap-2">
                  <span>{TEAM_ICONS[ti]}</span>
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: TEAM_COLORS[ti] }}
                  >
                    {TEAM_SHORT[ti]}
                  </span>
                  <span className="text-[15px] font-extrabold font-mono text-text-primary">
                    {wins}
                  </span>
                  <span className="text-xs text-text-muted">
                    win{wins > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION HEADER COMPONENT
   ════════════════════════════════════════════════════════════════ */

function SectionHeader({
  label,
  color,
  description,
}: {
  label: string;
  color: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <div className="inline-flex items-center gap-2">
        <span
          className="w-[7px] h-[7px] rounded-full inline-block"
          style={{ background: color }}
        />
        <span
          className="text-xs font-bold uppercase tracking-wider font-mono"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      {description && (
        <p className="text-sm text-text-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}
