"use client";

import { motion } from "framer-motion";
import AgentAvatar from "./AgentAvatar";

interface BidAnimationProps {
  agentName: string;
  teamName: string;
  amount: string;
  teamColor: string;
  isPass?: boolean;
  index?: number;
}

export default function BidAnimation({
  agentName,
  teamName,
  amount,
  teamColor,
  isPass = false,
  index = 0,
}: BidAnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: isPass ? 0.5 : 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 py-2 px-3 rounded-lg"
      style={{
        background: isPass ? "transparent" : "rgba(255,255,255,0.02)",
        borderLeft: `2px solid ${isPass ? "rgba(255,255,255,0.06)" : teamColor}`,
      }}
    >
      <AgentAvatar name={agentName} size="sm" />

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium truncate ${isPass ? "text-[#78736E]" : "text-[#E8E4DE]"}`}>
          {teamName}
        </div>
        <div className="text-xs text-[#78736E] truncate font-mono">{agentName}</div>
      </div>

      <div className="shrink-0 text-right">
        {isPass ? (
          <span className="text-xs text-[#78736E] font-mono line-through">PASS</span>
        ) : (
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="text-sm font-bold font-mono"
            style={{ color: teamColor }}
          >
            {amount}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
