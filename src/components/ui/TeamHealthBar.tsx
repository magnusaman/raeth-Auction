"use client";

import { motion } from "framer-motion";

interface TeamHealthBarProps {
  current: number;
  max: number;
  label?: string;
  className?: string;
}

export default function TeamHealthBar({ current, max, label, className = "" }: TeamHealthBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const level = pct > 60 ? "high" : pct > 30 ? "mid" : "low";

  const colors = {
    high: { bar: "linear-gradient(90deg, #C4A265, #E8D5A3)", glow: "rgba(196,162,101,0.2)" },
    mid: { bar: "linear-gradient(90deg, #F59E0B, #C4A265)", glow: "rgba(245,158,11,0.2)" },
    low: { bar: "linear-gradient(90deg, #EF4444, #F59E0B)", glow: "rgba(239,68,68,0.2)" },
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="health-bar flex-1">
        <motion.div
          className="health-bar-fill"
          data-level={level}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{
            background: colors[level].bar,
            boxShadow: `0 0 8px ${colors[level].glow}`,
          }}
        />
      </div>
      {label && (
        <span className="text-xs font-mono text-[#9A9590] tabular-nums shrink-0">
          {label}
        </span>
      )}
    </div>
  );
}
