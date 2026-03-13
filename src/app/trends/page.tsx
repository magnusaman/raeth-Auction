"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from "recharts";

const MODEL_COLORS = ["#D4A853", "#CD7F32", "#4ADE80", "#F5C842", "#EF4444", "#8B7A4A", "#F97316", "#A09888"];

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

export default function TrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

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
          <h1 className="mt-1 text-3xl font-bold text-text-primary">Historical Trends</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[300px] bg-bg-surface border border-border-subtle rounded-xl shimmer" />
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
          <h1 className="mt-1 text-3xl font-bold text-text-primary">Historical Trends</h1>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-xl py-20 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-text-secondary mb-2">No trend data yet</p>
          <p className="text-sm text-text-muted mb-6">Run some auctions to see performance trends</p>
          <Link href="/" className="btn-primary text-sm py-2.5 px-6">Create Auction</Link>
        </div>
      </div>
    );
  }

  const colorMap: Record<string, string> = {};
  data.models.forEach((m, i) => {
    colorMap[m.model] = MODEL_COLORS[i % MODEL_COLORS.length];
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

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-cyan">Analytics</span>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Historical Trends</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Track AI agent performance across {data.totalAuctions} completed auction{data.totalAuctions !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {data.models.map((m) => (
          <div
            key={m.model}
            className="bg-bg-surface border border-border-subtle rounded-xl px-4 py-3"
            style={{ borderLeftColor: colorMap[m.model], borderLeftWidth: 3 }}
          >
            <p className="text-xs text-text-muted truncate">{m.model}</p>
            <p className="text-xl font-bold font-mono mt-0.5" style={{ color: colorMap[m.model] }}>
              {m.summary.avgScore.toFixed(1)}%
            </p>
            <p className="text-xs text-text-disabled mt-0.5">
              {m.summary.totalWins}W / {m.summary.totalGames}G
            </p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Trends */}
        <div className="bg-bg-surface border border-border-default rounded-[10px] overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-[7px] h-[7px] rounded-full bg-accent-cyan" />
            <span className="text-sm font-bold uppercase tracking-wider font-mono text-accent-cyan">Score Trends</span>
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Evolution */}
        <div className="bg-bg-surface border border-border-default rounded-[10px] overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-[7px] h-[7px] rounded-full bg-neon-green" />
            <span className="text-sm font-bold uppercase tracking-wider font-mono text-neon-green">Win Rate Evolution</span>
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
                  fillOpacity={0.08}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Patterns */}
        <div className="bg-bg-surface border border-border-default rounded-[10px] overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-[7px] h-[7px] rounded-full bg-neon-purple" />
            <span className="text-sm font-bold uppercase tracking-wider font-mono text-neon-purple">Avg Spending</span>
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
                  <Cell key={i} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="bg-bg-surface border border-border-default rounded-[10px] overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-[7px] h-[7px] rounded-full bg-neon-gold" />
            <span className="text-sm font-bold uppercase tracking-wider font-mono text-neon-gold">Performance Comparison</span>
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
                  fillOpacity={0.1}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
