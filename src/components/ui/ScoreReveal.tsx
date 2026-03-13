"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface ScoreRevealProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  triggerOnScroll?: boolean;
}

export default function ScoreReveal({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1200,
  className = "",
  triggerOnScroll = true,
}: ScoreRevealProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [scrollRef, isVisible] = useScrollReveal({ threshold: 0.3 });
  const hasAnimated = useRef(false);
  const frameRef = useRef<number>(0);

  const shouldAnimate = triggerOnScroll ? isVisible : true;

  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const startVal = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (value - startVal) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [shouldAnimate, value, duration]);

  const formatted = `${prefix}${displayValue.toFixed(decimals)}${suffix}`;

  return (
    <span ref={scrollRef as React.RefObject<HTMLSpanElement>} className={`font-mono tabular-nums ${className}`}>
      {formatted}
    </span>
  );
}
