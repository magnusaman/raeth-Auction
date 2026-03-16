"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CommandPalette from "./CommandPalette";
import NowPlayingBar from "./NowPlayingBar";

const NAV_LINKS = [
  { href: "/", label: "Home", shortcut: "H" },
  { href: "/arena", label: "Arena", shortcut: "A" },
  { href: "/leaderboard", label: "Leaderboard", shortcut: "L" },
  { href: "/tournaments", label: "Tournaments", shortcut: "T" },
];

interface Crumb {
  label: string;
  href?: string;
}

function buildBreadcrumbs(pathname: string): Crumb[] | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const root = segments[0];
  const rest = segments.slice(1);

  if (root === "auction") {
    return [{ label: "Home", href: "/" }, { label: `Auction ${(rest[0] ?? "").slice(0, 8)}` }];
  }
  if (root === "results") {
    return [{ label: "Arena", href: "/arena" }, { label: "Results" }];
  }
  if (root === "tournaments" && rest.length > 0) {
    return [{ label: "Tournaments", href: "/tournaments" }, { label: rest[0]?.slice(0, 8) ?? "" }];
  }

  return null;
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (mobileOpen) setMobileOpen(false);
    }
  }, [pathname, mobileOpen]);

  // Cmd+K to open palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname]
  );

  return (
    <>
      <a href="#main" className="skip-to-content">Skip to content</a>

      {/* ── Floating Command Bar ── */}
      <nav
        className="sticky top-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(4,4,4,0.92)" : "rgba(4,4,4,0.4)",
          backdropFilter: scrolled ? "blur(24px) saturate(160%)" : "blur(12px)",
          WebkitBackdropFilter: scrolled ? "blur(24px) saturate(160%)" : "blur(12px)",
        }}
      >
        {/* Bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(196,162,101,0.08), transparent)",
            opacity: scrolled ? 1 : 0.3,
          }}
        />

        <div className={`mx-auto flex items-center justify-between max-w-[1200px] px-5 md:px-6 transition-all duration-500 ${scrolled ? "h-[64px]" : "h-[80px]"}`}>
          {/* Brand — Syne display font */}
          <Link href="/" className="flex items-center gap-1 no-underline group">
            <span
              className="font-display text-xl font-extrabold tracking-[0.2em] uppercase transition-all duration-300"
              style={{ color: "#C4A265" }}
            >
              Raeth
            </span>
            <span className="text-[#625D58] mx-1.5 font-light text-base select-none">/</span>
            <span
              className="font-display text-[15px] font-bold tracking-[0.15em] uppercase text-[#78736E] group-hover:text-[#9A9590] transition-colors"
            >
              Arena
            </span>
          </Link>

          {/* Desktop nav — pill buttons */}
          <div className="hidden md:flex items-center gap-1 bg-white/[0.02] rounded-full px-2 py-1.5 border border-white/[0.04]">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative block px-5 py-2 text-sm font-medium no-underline rounded-full transition-colors duration-200"
                  style={{ color: active ? "#E8E4DE" : "#78736E" }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "rgba(196,162,101,0.1)",
                        border: "1px solid rgba(196,162,101,0.15)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Search trigger + CTA */}
          <div className="hidden md:flex items-center gap-2">
            {/* Cmd+K trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#78736E] hover:text-[#9A9590] hover:border-white/[0.1] transition-all cursor-pointer text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                ⌘K
              </span>
            </button>

          </div>

          {/* Mobile: search + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="p-2 text-[#78736E] rounded-lg hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Search"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 text-[#9A9590] rounded-lg hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb bar */}
        <AnimatePresence>
          {breadcrumbs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div
                className="mx-auto max-w-[1200px] px-5 md:px-6 py-2 flex items-center gap-2 text-[13px]"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-[#625D58] select-none">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-[#78736E] hover:text-[#C4A265] transition-colors no-underline font-medium">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[#9A9590] font-medium truncate max-w-[200px] font-mono text-xs">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Mobile Menu — Full-screen overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              } as React.CSSProperties}
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              key="mobile-menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed top-0 right-0 z-50 h-full w-72 md:hidden flex flex-col"
              style={{
                background: "#080808",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "-12px 0 60px rgba(0,0,0,0.6)",
              } as React.CSSProperties}
            >
              <div className="flex items-center justify-between h-16 px-5">
                <span className="font-display text-sm font-bold tracking-[0.15em] uppercase text-[#C4A265]">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-[#9A9590] rounded-lg hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-1 px-4 py-2 flex-1">
                {[...NAV_LINKS,
                  { href: "/trends", label: "Trends", shortcut: "R" },
                  { href: "/about", label: "About", shortcut: "B" },
                ].map((link, i) => {
                  const active = isActive(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.3 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          block px-4 py-3.5 text-[15px] font-medium no-underline rounded-xl transition-all
                          ${active
                            ? "text-[#E8E4DE] bg-[rgba(196,162,101,0.06)] border border-[rgba(196,162,101,0.1)]"
                            : "text-[#9A9590] hover:text-[#E8E4DE] hover:bg-white/[0.04] border border-transparent"
                          }
                        `}
                      >
                        <span className="font-display">{link.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <div className="px-4 pb-8">
                <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Command Palette ── */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* ── Now Playing Bar ── */}
      <NowPlayingBar />
    </>
  );
}
