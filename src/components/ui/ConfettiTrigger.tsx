"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiTriggerProps {
  fire: boolean;
  teamColor?: string;
  variant?: "burst" | "shower";
}

export default function ConfettiTrigger({
  fire,
  teamColor = "#D4A853",
  variant = "burst",
}: ConfettiTriggerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!fire || hasFired.current) return;
    hasFired.current = true;

    const gold = "#D4A853";
    const colors = [gold, teamColor, "#F5F0E8", "#E8D5A3"];

    if (variant === "burst") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors,
        gravity: 1.2,
        scalar: 1.1,
        ticks: 120,
      });
    } else {
      // Shower — two bursts from edges
      const end = Date.now() + 1500;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.5 },
          colors,
          ticks: 100,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.5 },
          colors,
          ticks: 100,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [fire, teamColor, variant]);

  // Reset when fire goes false
  useEffect(() => {
    if (!fire) hasFired.current = false;
  }, [fire]);

  return null;
}
