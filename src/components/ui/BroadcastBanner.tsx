"use client";

import { motion, AnimatePresence } from "framer-motion";

interface BroadcastBannerProps {
  visible: boolean;
  playerName: string;
  role: string;
  basePrice: string;
  teamColor?: string;
}

export default function BroadcastBanner({
  visible,
  playerName,
  role,
  basePrice,
  teamColor = "#D4A853",
}: BroadcastBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="broadcast-lower-third flex items-stretch overflow-hidden rounded-lg"
          style={{
            background: "rgba(8,8,8,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Team color accent bar */}
          <div className="w-1 shrink-0" style={{ background: teamColor }} />

          <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#F5F0E8] truncate font-display">
                {playerName}
              </div>
              <div className="text-[11px] text-[#6B6560] uppercase tracking-wider font-mono">
                {role}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-[#6B6560] uppercase tracking-wider">Base</div>
              <div className="text-sm font-bold font-mono" style={{ color: teamColor }}>
                {basePrice}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
