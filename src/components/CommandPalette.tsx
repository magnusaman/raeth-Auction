"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuctionItem {
  auction_id: string;
  status: string;
  created_at: string;
  teams: { team_name: string; agent_name: string }[];
}

const PAGES = [
  { name: "Home", href: "/", shortcut: "H", icon: "⌂" },
  { name: "Arena — Replays", href: "/arena", shortcut: "A", icon: "⚔" },
  { name: "Leaderboard", href: "/leaderboard", shortcut: "L", icon: "🏆" },
  { name: "Tournaments", href: "/tournaments", shortcut: "T", icon: "🏟" },
  { name: "Trends & Analytics", href: "/trends", shortcut: "R", icon: "📈" },
  { name: "Compare Auctions", href: "/compare", shortcut: "C", icon: "⚖" },
  { name: "About Raeth", href: "/about", shortcut: "B", icon: "ℹ" },
];

const ACTIONS = [
  { name: "New Auction", href: "/", icon: "＋" },
  { name: "View Leaderboard", href: "/leaderboard", icon: "📊" },
  { name: "Browse Tournaments", href: "/tournaments", icon: "🏟" },
];

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);

  // Fetch recent auctions when palette opens
  useEffect(() => {
    if (!open) return;
    setSearch("");

    let cancelled = false;
    fetch("/api/v1/auctions?limit=8")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.auctions) {
          setAuctions(data.auctions);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  // Keyboard shortcuts for pages
  useEffect(() => {
    if (open) return;

    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.shiftKey || e.altKey) return;

      const page = PAGES.find((p) => p.shortcut.toLowerCase() === e.key.toLowerCase());
      if (page) {
        e.preventDefault();
        router.push(page.href);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, router]);

  const statusLabel = (status: string) => {
    if (status === "RUNNING" || status === "BIDDING") return "LIVE";
    if (status === "COMPLETED") return "DONE";
    return status;
  };

  const statusColor = (status: string) => {
    if (status === "RUNNING" || status === "BIDDING") return "#4ADE80";
    if (status === "COMPLETED") return "#D4A853";
    return "#6B6560";
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => onOpenChange(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[12vh] z-[101] mx-auto w-[min(560px,calc(100vw-32px))]"
          >
            <Command
              className="cmdk-root"
              loop
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange(false);
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
                <svg className="w-4 h-4 text-[#6B6560] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, auctions, actions…"
                  className="flex-1 bg-transparent border-none outline-none text-[#F5F0E8] text-sm py-3.5 placeholder:text-[#4a4540] font-body"
                />
                <kbd className="text-[10px] font-mono text-[#4a4540] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto overscroll-contain p-2">
                <Command.Empty className="text-center text-[#6B6560] text-sm py-8">
                  No results found.
                </Command.Empty>

                {/* Pages group */}
                <Command.Group heading="Pages" className="cmdk-group">
                  {PAGES.map((page) => (
                    <Command.Item
                      key={page.href}
                      value={`page ${page.name}`}
                      onSelect={() => navigate(page.href)}
                      className="cmdk-item"
                    >
                      <span className="text-base w-6 text-center shrink-0 opacity-60">{page.icon}</span>
                      <span className="flex-1 text-sm">{page.name}</span>
                      <kbd className="text-[10px] font-mono text-[#4a4540] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                        ⌘{page.shortcut}
                      </kbd>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Recent Auctions */}
                {auctions.length > 0 && (
                  <Command.Group heading="Recent Auctions" className="cmdk-group">
                    {auctions.map((a) => (
                      <Command.Item
                        key={a.auction_id}
                        value={`auction ${a.auction_id} ${a.teams.map((t) => t.agent_name).join(" ")}`}
                        onSelect={() => navigate(`/auction/${a.auction_id}`)}
                        className="cmdk-item"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: statusColor(a.status) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {a.teams.slice(0, 3).map((t) => t.agent_name).join(" vs ")}
                            {a.teams.length > 3 && ` +${a.teams.length - 3}`}
                          </div>
                          <div className="text-[11px] text-[#6B6560] truncate font-mono">
                            {a.auction_id.slice(0, 8)}
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: statusColor(a.status),
                            background: `${statusColor(a.status)}15`,
                          }}
                        >
                          {statusLabel(a.status)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Actions */}
                <Command.Group heading="Actions" className="cmdk-group">
                  {ACTIONS.map((action) => (
                    <Command.Item
                      key={`action-${action.name}`}
                      value={`action ${action.name}`}
                      onSelect={() => navigate(action.href)}
                      className="cmdk-item"
                    >
                      <span className="text-base w-6 text-center shrink-0 opacity-60">{action.icon}</span>
                      <span className="flex-1 text-sm">{action.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Keyboard shortcuts help */}
                <Command.Group heading="Keyboard Shortcuts" className="cmdk-group">
                  <Command.Item value="shortcut help" className="cmdk-item cursor-default" onSelect={() => {}}>
                    <span className="text-[#6B6560] text-xs flex-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">⌘K</kbd>
                        Search
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">⌘H</kbd>
                        Home
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">⌘A</kbd>
                        Arena
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">⌘L</kbd>
                        Leaderboard
                      </span>
                    </span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-4 py-2.5 text-[11px] text-[#4a4540]"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span>Navigate with ↑↓ · Select with ↵</span>
                <span className="font-display tracking-wider uppercase text-[10px]" style={{ color: "rgba(212,168,83,0.3)" }}>
                  Raeth
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
