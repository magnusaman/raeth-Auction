"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const TEAM_SHORT = ["MI", "CSK", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"];
const TEAM_COLORS = ["#004BA0", "#FDB913", "#EC1C24", "#3A225D", "#FF822A", "#EA1A85", "#004C93", "#DD1F2D", "#1C1C2B", "#A72056"];

interface BidEntry {
  lot_number: number;
  player_name: string;
  player_role: string;
  team_index: number;
  agent_name: string;
  action: string;
  amount: number | null;
  reasoning: string;
  timestamp: string;
}

const SPEEDS = [0.5, 1, 2, 4];

export default function ReplayViewer({ auctionId }: { auctionId: string }) {
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/v1/auctions/${auctionId}/live`)
      .then((r) => r.json())
      .then((d) => {
        const sorted = (d.recent_bids || []).sort(
          (a: BidEntry, b: BidEntry) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setBids(sorted);
      })
      .catch(() => setError("Failed to load replay data"))
      .finally(() => setLoading(false));
  }, [auctionId]);

  const step = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= bids.length - 1) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [bids.length]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const delay = 800 / speed;
    timerRef.current = setTimeout(step, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, currentIndex, speed, step]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="h-6 w-32 mx-auto rounded shimmer" />
      </div>
    );
  }

  if (error || bids.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-muted">
        {error || "No bid data available for replay"}
      </div>
    );
  }

  const visibleBids = bids.slice(0, currentIndex + 1);
  const progress = ((currentIndex + 1) / bids.length) * 100;

  return (
    <div className="border-t border-border-subtle">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated/30">
        {/* Play/Pause */}
        <button
          onClick={() => {
            if (currentIndex >= bids.length - 1) {
              setCurrentIndex(0);
              setPlaying(true);
            } else {
              setPlaying(!playing);
            }
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg-surface border border-border-default hover:border-border-hover transition-colors"
        >
          {playing ? (
            <svg className="w-4 h-4 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step back / forward */}
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={step}
          disabled={currentIndex >= bids.length - 1}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Speed selector */}
        <div className="flex gap-1 bg-bg-surface border border-border-subtle rounded-md p-0.5 ml-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                speed === s
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Progress */}
        <span className="text-xs font-mono text-text-muted ml-auto">
          {currentIndex + 1}/{bids.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-bg-elevated">
        <div
          className="h-full transition-all duration-200"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #C4A265, #D4B06A)" }}
        />
      </div>

      {/* Bid feed */}
      <div ref={feedRef} className="max-h-60 overflow-y-auto p-3 space-y-1.5">
        {visibleBids.map((bid, i) => {
          const color = TEAM_COLORS[bid.team_index] || "#78736E";
          const isLatest = i === visibleBids.length - 1;
          return (
            <div
              key={i}
              className={`flex items-start gap-2 text-sm rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                isLatest ? "bg-bg-elevated border border-border-default" : "opacity-60"
              }`}
            >
              <span
                className="text-xs font-bold font-mono shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                style={{ color, background: `${color}15` }}
              >
                {TEAM_SHORT[bid.team_index] || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-text-secondary">
                  {bid.action === "bid" ? (
                    <>
                      bids <span className="font-mono font-semibold text-accent-gold">{"\u20B9"}{bid.amount} Cr</span> for{" "}
                      <span className="font-medium text-text-primary">{bid.player_name}</span>
                    </>
                  ) : (
                    <>
                      passes on <span className="font-medium text-text-primary">{bid.player_name}</span>
                    </>
                  )}
                </span>
                {bid.reasoning && isLatest && (
                  <p className="text-xs text-text-muted mt-0.5 truncate">{bid.reasoning}</p>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-disabled shrink-0 mt-0.5">
                #{bid.lot_number}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
