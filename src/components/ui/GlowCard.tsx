"use client";

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
  return (
    <motion.div
      className={`card-surface p-6 ${onClick ? "cursor-pointer" : ""} ${className}`}
      whileHover={
        hoverable
          ? {
              scale: 1.02,
              boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
            }
          : undefined
      }
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
