"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";


const NAV_LINKS = [
  { href: "/", label: "Auctions" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/arena", label: "Replays" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/trends", label: "Trends" },
  { href: "/about", label: "About" },
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
    return [
      { label: "Auctions", href: "/" },
      { label: rest[0] ?? "" },
    ];
  }

  if (root === "results") {
    return [
      { label: "Auctions", href: "/" },
      { label: "Results" },
    ];
  }

  if (root === "tournaments") {
    return [
      { label: "Tournaments", href: "/tournaments" },
      { label: rest[0] ?? "" },
    ];
  }

  return null;
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
    <a href="#main" className="skip-to-content">
      Skip to content
    </a>
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        borderRadius: 0,
        background: scrolled
          ? "rgba(5,5,5,0.85)"
          : "rgba(5,5,5,0.5)",
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
      }}
    >
      {/* Bottom border — subtle gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: scrolled
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.03)",
        }}
      />

      {/* Main bar */}
      <div className="mx-auto flex h-[84px] max-w-[1200px] items-center justify-between px-5 md:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center no-underline group transition-transform hover:scale-[1.02]">
          <span className="text-[15px] font-bold tracking-[0.25em] uppercase mt-[2px]" style={{ color: "#D4A853" }}>
            Raeth
          </span>
          <div className="h-[22px] w-px mx-4" style={{ background: "rgba(212,168,83,0.25)" }} />
          <span className="text-[15px] font-bold tracking-[0.25em] uppercase mt-[2px]" style={{ color: "#D4A853" }}>
            Arena
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative block px-3 py-2 text-[14px] font-medium no-underline rounded-lg
                  transition-colors duration-200
                  ${active
                    ? "text-[#F5F0E8]"
                    : "text-[#6B6560] hover:text-[#F5F0E8]"
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full -z-[1]"
                    style={{
                      background: "#D4A853",
                      boxShadow: "0 1px 8px rgba(212,168,83,0.3)",
                    } as React.CSSProperties}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/"
            className="btn-gradient text-[16px] py-2.5 px-6 font-semibold"
          >
            <span>New Auction</span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 text-[#A09888] rounded-lg hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
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
              className="mx-auto max-w-[1200px] px-5 md:px-6 py-2 flex items-center gap-2 text-[14px]"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[#4a4540] select-none">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-[#6B6560] hover:text-[#F5F0E8] transition-colors no-underline font-medium">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#A09888] font-medium truncate max-w-[200px]">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
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
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
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
                background: "#0a0a0a",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
              } as React.CSSProperties}
            >
              <div className="flex items-center justify-end h-14 px-5">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-[#A09888] rounded-lg hover:bg-white/[0.06] transition-colors bg-transparent border-none cursor-pointer"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-1 px-4 py-2 flex-1">
                {NAV_LINKS.map((link, i) => {
                  const active = isActive(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 * i, duration: 0.3 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          block px-4 py-3 text-sm font-medium no-underline rounded-lg transition-colors
                          ${active ? "text-[#F5F0E8] bg-white/[0.06]" : "text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/[0.04]"}
                        `}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <div className="px-4 pb-8">
                <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="btn-gradient w-full text-center text-sm py-3 font-bold justify-center"
                >
                  New Auction
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
    </>
  );
}
