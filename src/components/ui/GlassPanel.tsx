"use client";

import { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  variant?: "default" | "dark" | "team" | "highlight";
  teamColor?: string;
  glow?: "none" | "cyan" | "pink" | "gold" | "purple" | "team";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

const GLOW_MAP: Record<string, string> = {
  cyan: "glow-cyan",
  pink: "glow-pink",
  gold: "glow-gold",
  purple: "glow-purple",
  team: "",
  none: "",
};

const PADDING_MAP: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function GlassPanel({
  children,
  variant = "default",
  teamColor,
  glow = "none",
  interactive = false,
  padding = "md",
  className = "",
}: GlassPanelProps) {
  const baseClass =
    variant === "dark"
      ? "glass-dark"
      : variant === "team"
        ? "glass-team"
        : "glass";

  const glowClass = glow !== "none" ? GLOW_MAP[glow] || "" : "";
  const hoverClass = interactive ? "glass-hover cursor-pointer" : "";
  const padClass = PADDING_MAP[padding] || "";

  const teamStyle =
    variant === "team" && teamColor
      ? ({ "--team-color": teamColor } as React.CSSProperties)
      : glow === "team" && teamColor
        ? ({
            "--team-color": teamColor,
            boxShadow: `0 0 18px color-mix(in srgb, ${teamColor} 22%, transparent), 0 0 52px color-mix(in srgb, ${teamColor} 12%, transparent)`,
          } as React.CSSProperties)
        : undefined;

  return (
    <div
      className={`${baseClass} ${glowClass} ${hoverClass} ${padClass} ${className}`.trim()}
      style={teamStyle}
    >
      {children}
    </div>
  );
}
