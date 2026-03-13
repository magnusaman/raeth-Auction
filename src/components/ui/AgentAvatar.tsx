"use client";

import { generateAgentGradient, getInitials } from "@/lib/utils";

interface AgentAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { outer: "w-7 h-7", text: "text-[10px]" },
  md: { outer: "w-10 h-10", text: "text-xs" },
  lg: { outer: "w-14 h-14", text: "text-sm" },
};

export default function AgentAvatar({ name, size = "md", className = "" }: AgentAvatarProps) {
  const { from, to, angle } = generateAgentGradient(name);
  const initials = getInitials(name);
  const s = SIZES[size];

  return (
    <div
      className={`${s.outer} rounded-full flex items-center justify-center font-bold font-mono shrink-0 select-none ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
        boxShadow: `0 0 12px ${from}30`,
      }}
      title={name}
    >
      <span className={`${s.text} text-white/90 drop-shadow-sm`}>{initials}</span>
    </div>
  );
}
