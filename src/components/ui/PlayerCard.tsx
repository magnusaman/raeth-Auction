"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface PlayerCardProps {
  name: string;
  role: string;
  basePrice: string;
  nationality?: string;
  stats?: Record<string, string | number>;
  autoFlip?: boolean;
  className?: string;
}

const ROLE_ICONS: Record<string, string> = {
  Batsman: "🏏",
  Bowler: "🎳",
  "All-Rounder": "⚡",
  "Wicket-Keeper": "🧤",
};

export default function PlayerCard({
  name,
  role,
  basePrice,
  nationality,
  stats,
  autoFlip = false,
  className = "",
}: PlayerCardProps) {
  const [flipped, setFlipped] = useState(autoFlip);
  const roleIcon = ROLE_ICONS[role] ?? "🏏";

  return (
    <div
      className={`relative cursor-pointer select-none ${className}`}
      style={{ perspective: "800px" }}
      onClick={() => setFlipped((v) => !v)}
    >
      <motion.div
        className="relative w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div
          className="rounded-xl p-5 flex flex-col items-center gap-3"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(145deg, rgba(14,14,14,0.95), rgba(8,8,8,0.95))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="text-4xl mb-1">{roleIcon}</div>
          <div className="text-center">
            <div className="text-base font-bold text-[#E8E4DE] font-display">{name}</div>
            {nationality && (
              <div className="text-xs text-[#78736E] mt-0.5">{nationality}</div>
            )}
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              background: "rgba(196,162,101,0.1)",
              color: "#C4A265",
              border: "1px solid rgba(196,162,101,0.15)",
            }}
          >
            {role}
          </div>
          <div className="text-lg font-bold font-mono text-[#C4A265] mt-1">{basePrice}</div>
          <div className="text-xs text-[#625D58] mt-1">tap to reveal stats</div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl p-5 flex flex-col gap-2"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(145deg, rgba(14,14,14,0.95), rgba(8,8,8,0.95))",
            border: "1px solid rgba(196,162,101,0.12)",
          }}
        >
          <div className="text-sm font-bold text-[#E8E4DE] font-display mb-1">{name}</div>
          <div
            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full self-start"
            style={{
              background: "rgba(196,162,101,0.1)",
              color: "#C4A265",
            }}
          >
            {role}
          </div>

          {stats ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs text-[#78736E] truncate">{key}</span>
                  <span className="text-sm font-mono font-bold text-[#9A9590]">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#625D58] text-xs">
              Stats unavailable
            </div>
          )}

          <div className="mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#78736E] uppercase tracking-wider">Base Price</span>
              <span className="text-sm font-bold font-mono text-[#C4A265]">{basePrice}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
