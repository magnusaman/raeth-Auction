"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface LiveAuction {
  auction_id: string;
  status: string;
  teams: {
    team_index: number;
    team_name: string;
    agent_name: string;
    purse_remaining: number;
  }[];
}

export default function NowPlayingBar() {
  const [liveAuction, setLiveAuction] = useState<LiveAuction | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/v1/auctions?limit=5");
        const data = await res.json();
        if (data.auctions) {
          const live = data.auctions.find(
            (a: LiveAuction) => a.status === "RUNNING" || a.status === "BIDDING"
          );
          setLiveAuction(live || null);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {liveAuction && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <Link
            href={`/auction/${liveAuction.auction_id}`}
            className="block no-underline group"
          >
            <div
              className="mx-auto max-w-[1200px] px-4 md:px-6"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl transition-colors"
                style={{
                  background: "rgba(8,8,8,0.95)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderTop: "1px solid rgba(196,162,101,0.12)",
                  borderLeft: "1px solid rgba(255,255,255,0.04)",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {/* Live pulse */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ADE80]" />
                  </span>
                  <span className="text-xs font-bold font-mono tracking-wider text-[#4ADE80] uppercase">
                    Live
                  </span>
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/[0.08]" />

                {/* Auction info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[13px] text-[#9A9590] truncate">
                    {liveAuction.teams.slice(0, 3).map((t) => t.agent_name).join(" vs ")}
                    {liveAuction.teams.length > 3 && (
                      <span className="text-[#78736E]"> +{liveAuction.teams.length - 3}</span>
                    )}
                  </span>
                </div>

                {/* ID badge */}
                <span className="text-[11px] font-mono text-[#78736E] shrink-0 hidden sm:inline">
                  {liveAuction.auction_id.slice(0, 8)}
                </span>

                {/* Arrow */}
                <svg
                  className="w-4 h-4 text-[#78736E] group-hover:text-[#C4A265] transition-colors shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
