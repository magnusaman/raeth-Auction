"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from "recharts";
import AgentAvatar from "@/components/ui/AgentAvatar";
import { CHART_COLORS } from "@/lib/constants";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
};

interface DataPoint {
  auctionId: string;
  date: string;
  score: number;
  rank: number;
  spend: number;
  squadSize: number;
  winRate: number;
}

interface ModelEntry {
  model: string;
  dataPoints: DataPoint[];
  summary: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    avgSpend: number;
    totalGames: number;
    totalWins: number;
  };
}

interface TrendsData {
  models: ModelEntry[];
  totalAuctions: number;
}

/* ── Scroll-reveal wrapper ── */
function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.12 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotlightAgent, setSpotlightAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/trends")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ models: [], totalAuctions: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 py-10">
        <div className="mb-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">Analytics</span>
          <h1 className="mt-1 text-3xl font-bold font-display text-text-primary">Historical Trends</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="broadcast-card h-[300px] shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.models.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 py-10">
        <div className="mb-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">Analytics</span>
          <h1 className="mt-1 text-3xl font-bold font-display text-text-primary">Historical Trends</h1>
        </div>
        <div className="broadcast-card py-20 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-[#A09888] mb-2">No trend data yet</p>
          <p className="text-sm text-[#6B6560] mb-6">Run some auctions to see performance trends</p>
          <Link href="/" className="btn-primary text-sm py-2.5 px-6">Create Auction</Link>
        </div>
      </div>
    );
  }

  const colorMap: Record<string, string> = {};
  data.models.forEach((m, i) => {
    colorMap[m.model] = CHART_COLORS[i % CHART_COLORS.length];
  });

  // Build unified time-series for line chart (one row per auction date, columns per model)
  const allDates = new Set<string>();
  data.models.forEach((m) => m.dataPoints.forEach((d) => allDates.add(d.date)));
  const sortedDates = [...allDates].sort();

  const scoreTrend = sortedDates.map((date, idx) => {
    const row: any = { name: `#${idx + 1}`, date };
    data.models.forEach((m) => {
      const dp = m.dataPoints.find((d) => d.date === date);
      if (dp) row[m.model] = dp.score;
    });
    return row;
  });

  const winRateTrend = sortedDates.map((date, idx) => {
    const row: any = { name: `#${idx + 1}`, date };
    data.models.forEach((m) => {
      const dp = m.dataPoints.find((d) => d.date === date);
      if (dp) row[m.model] = dp.winRate;
    });
    return row;
  });

  // Bar chart: avg spend per model
  const spendData = data.models.map((m) => ({
    name: m.model.split(" ").pop() || m.model,
    fullName: m.model,
    spend: m.summary.avgSpend,
    color: colorMap[m.model],
  }));

  // Radar chart: multi-axis comparison
  const radarData = [
    { metric: "Avg Score", ...Object.fromEntries(data.models.map((m) => [m.model, m.summary.avgScore])) },
    { metric: "Best Score", ...Object.fromEntries(data.models.map((m) => [m.model, m.summary.maxScore])) },
    { metric: "Win Rate", ...Object.fromEntries(data.models.map((m) => [m.model, m.summary.totalGames > 0 ? Math.round((m.summary.totalWins / m.summary.totalGames) * 100) : 0])) },
    { metric: "Consistency", ...Object.fromEntries(data.models.map((m) => {
      const scores = m.dataPoints.map((d) => d.score);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const variance = scores.length > 1 ? Math.sqrt(scores.reduce((s, sc) => s + Math.pow(sc - avg, 2), 0) / scores.length) : 0;
      return [m.model, Math.round(Math.max(0, 100 - variance))];
    })) },
    { metric: "Efficiency", ...Object.fromEntries(data.models.map((m) => [m.model, m.summary.avgSpend > 0 ? Math.round((m.summary.avgScore / m.summary.avgSpend) * 100) : 0])) },
  ];

  /** Returns opacity for a given model based on spotlight state */
  const spotlightOpacity = (model: string): number => {
    if (!spotlightAgent) return 1;
    return model === spotlightAgent ? 1 : 0.2;
  };

  /** Toggle spotlight on/off for an agent */
  const toggleSpotlight = (model: string) => {
    setSpotlightAgent((prev) => (prev === model ? null : model));
  };

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      {/* Header */}
      <RevealSection className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">Analytics</span>
            <h1 className="mt-1 text-3xl font-bold font-display text-[#F5F0E8]">Historical Trends</h1>
            <p className="mt-1 text-sm text-[#A09888]">
              Track AI agent performance across {data.totalAuctions} completed auction{data.totalAuctions !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {spotlightAgent && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setSpotlightAgent(null)}
            className="btn-ghost text-xs mt-3 flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4A853] animate-pulse" />
            Spotlight: {spotlightAgent}
            <span className="text-[#6B6560] ml-1">— click to clear</span>
          </motion.button>
        )}
      </RevealSection>

      {/* Summary cards */}
      <RevealSection className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.models.map((m, i) => (
            <motion.div
              key={m.model}
              onClick={() => toggleSpotlight(m.model)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              animate={{ opacity: spotlightOpacity(m.model) }}
              transition={{ duration: 0.3 }}
              className={`broadcast-card px-4 py-3 cursor-pointer ${
                spotlightAgent === m.model ? "ring-1 ring-[#D4A853]/40" : ""
              }`}
              style={{ borderLeftColor: colorMap[m.model], borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AgentAvatar name={m.model} size="sm" />
                <p className="text-xs text-[#6B6560] truncate flex-1">{m.model}</p>
              </div>
              <p className="text-xl font-bold font-mono mt-0.5" style={{ color: colorMap[m.model] }}>
                {m.summary.avgScore.toFixed(1)}%
              </p>
              <p className="text-xs text-[#6B6560] mt-0.5">
                {m.summary.totalWins}W / {m.summary.totalGames}G
              </p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Trends */}
        <RevealSection delay={0}>
          <div className="broadcast-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[7px] h-[7px] rounded-full bg-accent-cyan" />
              <span className="text-sm font-bold uppercase tracking-wider font-display text-accent-cyan">Score Trends</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#707070" fontSize={11} />
                <YAxis stroke="#707070" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.models.map((m) => (
                  <Line
                    key={m.model}
                    type="monotone"
                    dataKey={m.model}
                    stroke={colorMap[m.model]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: colorMap[m.model] }}
                    connectNulls
                    strokeOpacity={spotlightOpacity(m.model)}
                    style={{ transition: "stroke-opacity 0.3s ease" }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </RevealSection>

        {/* Win Rate Evolution */}
        <RevealSection delay={0.08}>
          <div className="broadcast-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[7px] h-[7px] rounded-full bg-neon-green" />
              <span className="text-sm font-bold uppercase tracking-wider font-display text-neon-green">Win Rate Evolution</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={winRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#707070" fontSize={11} />
                <YAxis stroke="#707070" fontSize={10} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.models.map((m) => (
                  <Area
                    key={m.model}
                    type="monotone"
                    dataKey={m.model}
                    stroke={colorMap[m.model]}
                    fill={colorMap[m.model]}
                    fillOpacity={0.08 * spotlightOpacity(m.model)}
                    strokeWidth={2}
                    connectNulls
                    strokeOpacity={spotlightOpacity(m.model)}
                    style={{ transition: "stroke-opacity 0.3s ease, fill-opacity 0.3s ease" }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </RevealSection>

        {/* Spending Patterns */}
        <RevealSection delay={0.04}>
          <div className="broadcast-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[7px] h-[7px] rounded-full bg-neon-purple" />
              <span className="text-sm font-bold uppercase tracking-wider font-display text-neon-purple">Avg Spending</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={spendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#707070" fontSize={10} />
                <YAxis stroke="#707070" fontSize={10} unit=" Cr" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: any) => [`₹${value} Cr`, "Avg Spend"]}
                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                  {spendData.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.color}
                      fillOpacity={spotlightOpacity(e.fullName)}
                      style={{ transition: "fill-opacity 0.3s ease" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </RevealSection>

        {/* Performance Radar */}
        <RevealSection delay={0.12}>
          <div className="broadcast-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[7px] h-[7px] rounded-full bg-neon-gold" />
              <span className="text-sm font-bold uppercase tracking-wider font-display text-neon-gold">Performance Comparison</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#707070", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#525252", fontSize: 9 }} />
                {data.models.map((m) => (
                  <Radar
                    key={m.model}
                    name={m.model}
                    dataKey={m.model}
                    stroke={colorMap[m.model]}
                    fill={colorMap[m.model]}
                    fillOpacity={0.1 * spotlightOpacity(m.model)}
                    strokeOpacity={spotlightOpacity(m.model)}
                    style={{ transition: "stroke-opacity 0.3s ease, fill-opacity 0.3s ease" }}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
