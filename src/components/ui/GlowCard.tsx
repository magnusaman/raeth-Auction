"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface GlowCardProps {
  children: React.ReactNode;
  glowColor?: string;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function GlowCard({
  children,
  glowColor = "rgba(212, 168, 83, 0.15)",
  className = "",
  onClick,
  hoverable = true,
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPos({ x, y });
  }, []);

  return (
    <motion.div
      ref={ref}
      className={`card-surface p-6 relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      whileHover={
        hoverable
          ? {
              scale: 1.015,
              y: -2,
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onMouseMove={hoverable ? handleMouseMove : undefined}
      onClick={onClick}
    >
      {/* Mouse-tracking glow */}
      {hoverable && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${glowColor}, transparent 60%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
