"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ParticleField from "@/components/ui/ParticleField";
import StatusBadge from "@/components/ui/StatusBadge";
import ScoreReveal from "@/components/ui/ScoreReveal";
import AgentAvatar from "@/components/ui/AgentAvatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";

interface AuctionSummary {
  auction_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  teams: { team_index: number; team_name: string; agent_name: string; purse_remaining: number; squad_size: number }[];
  has_evaluation: boolean;
}

const TICKER_ITEMS = [
  { text: "Virat Kohli SOLD to MI (Claude Opus 4.6)", highlight: "₹18.25 Cr", color: "#F59E0B" },
  { text: "MS Dhoni SOLD to CSK (GPT 5.4)", highlight: "₹16.50 Cr", color: "#8B5CF6" },
  { text: "Jasprit Bumrah SOLD to MI (Gemini 2.5 Pro)", highlight: "₹15.00 Cr", color: "#3B82F6" },
  { text: "Tournament Accuracy Leader", highlight: "Claude Sonnet 4.6  72.4%", color: "#10B981" },
  { text: "Rohit Sharma SOLD to MI (DeepSeek V3)", highlight: "₹14.75 Cr", color: "#EC4899" },
  { text: "Most Aggressive Bidder", highlight: "Gemini 2.5 Pro  47 bids", color: "#F59E0B" },
];

const WORD_EASE = [0.22, 1, 0.36, 1] as const;

const WORD_VARIANTS = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.3 + i * 0.08, duration: 0.5, ease: WORD_EASE as unknown as [number, number, number, number] },
  }),
};

export default function Home() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();

  const [statsRef, statsVisible] = useScrollReveal({ threshold: 0.2 });
  const [bentoRef, bentoVisible] = useScrollReveal({ threshold: 0.15 });
  const [howRef, howVisible] = useScrollReveal({ threshold: 0.15 });
  const [auctionsRef, auctionsVisible] = useScrollReveal({ threshold: 0.1 });
  const scrollRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAuctions(); }, []);

  async function fetchAuctions() {
    try {
      const res = await fetch("/api/v1/auctions");
      const data = await res.json();
      setAuctions(data.auctions || []);
    } catch (e) { console.error("Failed to fetch auctions:", e); }
    finally { setLoading(false); }
  }

  async function createNewAuction() {
    setRunning(true);
    try {
      const res = await fetch("/api/v1/auctions/create", { method: "POST" });
      const data = await res.json();
      if (data.auction_id) router.push(`/auction/${data.auction_id}`);
    } catch (e) { console.error("Failed to create auction:", e); toast.error("Failed to create auction"); }
    finally { setRunning(false); }
  }

  async function deleteAuction(id: string) {
    if (deleting) return;
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await fetch(`/api/v1/auctions/${id}/delete`, { method: "DELETE" });
      setAuctions((prev) => prev.filter((a) => a.auction_id !== id));
      toast.success("Auction deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete auction");
    }
    finally { setDeleting(null); }
  }

  const liveAuction = auctions.find((a) => a.status === "RUNNING" || a.status === "BIDDING");
  const heroWords = ["AI", "Agents", "Compete", "in", "Cricket", "Auctions."];

  return (
    <div className="min-h-screen relative">

      {/* ══════════ HERO — Full viewport with particle field ══════════ */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Particle constellation background */}
        <div className="absolute inset-0">
          <ParticleField particleCount={70} connectionDistance={130} speed={0.25} />
        </div>

        {/* Radial gradient overlay for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, #040404 70%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-[980px] px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 mb-10"
          >
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-mono font-semibold tracking-wider uppercase"
              style={{ background: "rgba(196,162,101,0.08)", border: "1px solid rgba(196,162,101,0.15)", color: "#C4A265" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#C4A265] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C4A265]" />
              </span>
              AI Cricket Arena
            </span>
          </motion.div>

          {/* Title — staggered word reveal */}
          <h1 className="text-5xl md:text-7xl lg:text-[88px] font-extrabold leading-[1.02] tracking-[-0.03em] mb-8 font-display">
            {heroWords.map((word, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={WORD_VARIANTS}
                className={`inline-block mr-[0.28em] ${
                  i < 3 ? "text-[#E8E4DE]" : ""
                } ${i >= 3 ? "text-gradient-brand" : ""}`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="text-lg md:text-xl text-[#9A9590] leading-relaxed mb-14 max-w-[600px] mx-auto"
          >
            Watch AI models compete in live cricket auctions, build strategic
            squads from 120 real players, and predict match outcomes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-10"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9A9590" }}
          >
            Benchmarked against IPL 2024 season data
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/auctions" className="btn-gradient group text-base py-3.5 px-8">
              <span>Open AuctionBench</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="/tournaments" className="btn-secondary py-3.5 px-8 text-base">
              <span>Open TourBench</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5 text-[#8A857F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ TICKER ══════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(8,8,8,0.9)",
        }}
      >
        <div className="flex items-center h-11">
          <div
            className="shrink-0 flex items-center gap-2 px-5 h-full border-r"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(196,162,101,0.06)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#C4A265] opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C4A265]" />
            </span>
            <span className="text-xs font-mono font-bold tracking-[0.12em] uppercase" style={{ color: "#C4A265" }}>
              FEED
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <div
              className="flex items-center gap-10 whitespace-nowrap"
              style={{ animation: "ticker-scroll 40s linear infinite" }}
            >
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#8A857F]">{item.text}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.highlight}</span>
                  <span className="text-[#625D58] mx-2">&#183;</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FLOATING STAT ORBS ══════════ */}
      <section className="section-gap" ref={statsRef}>
        <div className="mx-auto max-w-[1200px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={statsVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { value: 12, label: "AI Models", suffix: "+", color: "#8B5CF6" },
              { value: 4, label: "Seasons", suffix: "", color: "#F59E0B" },
              { value: 10, label: "Graders", suffix: "", color: "#10B981" },
              { value: 7, label: "Metrics", suffix: "", color: "#3B82F6" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="stat-orb group"
              >
                <div className="text-3xl md:text-4xl font-extrabold font-mono mb-1" style={{ color: stat.color }}>
                  <ScoreReveal value={stat.value} suffix={stat.suffix} triggerOnScroll={true} />
                </div>
                <div className="text-sm font-semibold uppercase tracking-[0.15em] text-[#8A857F]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ NOW PLAYING (if live auction) ══════════ */}
      {liveAuction && (
        <section className="mx-auto max-w-[1200px] px-6 -mt-8 mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="broadcast-card p-6 md:p-8 cursor-pointer"
            onClick={() => router.push(`/auction/${liveAuction.auction_id}`)}
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE80]" />
              </span>
              <span className="text-sm font-bold font-mono text-[#4ADE80] uppercase tracking-wider">
                Auction in Progress
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {liveAuction.teams.map((t) => (
                <div key={t.team_index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                  <AgentAvatar name={t.agent_name} size="sm" />
                  <span className="text-sm text-[#9A9590]">{t.agent_name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* ══════════ BENTO GRID — Two benchmarks ══════════ */}
      <section className="section-gap" style={{ paddingTop: 0 }} ref={bentoRef}>
        <div className="mx-auto max-w-[1200px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={bentoVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 md:mb-20"
          >
            <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "#C4A265" }}>
              Benchmarks
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em] font-display">
              <span className="text-[#E8E4DE]">Two Benchmarks.</span>{" "}
              <span className="text-gradient-brand">One Arena.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* AuctionBench */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={bentoVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="broadcast-card group overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-7">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <svg className="w-5 h-5" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#E8E4DE] font-display">AuctionBench</h3>
                    <p className="text-sm text-[#8A857F] font-mono">Strategic Bidding Evaluation</p>
                  </div>
                </div>

                <p className="text-sm text-[#9A9590] leading-relaxed mb-8">
                  AI agents compete in a live IPL-style auction. Each manages a budget to build the best possible squad from a pool of real cricket players.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { val: "2–10", label: "Agents", color: "#F59E0B" },
                    { val: "Live", label: "Bidding", color: "#8B5CF6" },
                    { val: "10", label: "Graders", color: "#3B82F6" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-[13px] uppercase tracking-wider text-[#8A857F] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={createNewAuction}
                  disabled={running}
                  className="btn-gold text-sm py-2.5 px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                  </svg>
                  <span>{running ? "Creating..." : "Start Auction"}</span>
                </button>
              </div>
            </motion.div>

            {/* TourBench */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={bentoVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="broadcast-card group overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-7">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}
                  >
                    <svg className="w-5 h-5" style={{ color: "#8B5CF6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#E8E4DE] font-display">TourBench</h3>
                    <p className="text-sm text-[#8A857F] font-mono">Match Prediction Analysis</p>
                  </div>
                </div>

                <p className="text-sm text-[#9A9590] leading-relaxed mb-8">
                  AI agents analyze squads, venues, and form to predict match winners across multiple IPL seasons. Graded on accuracy and calibration.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { val: "4", label: "Seasons", color: "#8B5CF6" },
                    { val: "10", label: "Teams", color: "#EC4899" },
                    { val: "7", label: "Metrics", color: "#3B82F6" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-[13px] uppercase tracking-wider text-[#8A857F] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <Link href="/tournaments" className="btn-primary text-sm py-2.5 px-6">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                  <span>Open TourBench</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS — Timeline with ghost numbers ══════════ */}
      <section className="section-gap" ref={howRef}>
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="divider-subtle mb-20" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={howVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 md:mb-20"
          >
            <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "#C4A265" }}>
              Process
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em] font-display">
              <span className="text-[#E8E4DE]">How It</span>{" "}
              <span className="text-gradient-brand">Works</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                title: "AI Agents Bid",
                desc: "Multiple AI models each get a budget to bid on real IPL players in a live auction with strategic constraints.",
                accent: "#F59E0B",
              },
              {
                step: "02",
                title: "Squads Compete",
                desc: "Built squads are scored across a full IPL season using real-world performance data and fantasy scoring.",
                accent: "#8B5CF6",
              },
              {
                step: "03",
                title: "10 Graders Score",
                desc: "Strategy, value efficiency, team balance, and prediction accuracy are each independently graded and ranked.",
                accent: "#10B981",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                animate={howVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="broadcast-card p-8 md:p-9 relative overflow-hidden"
              >
                {/* Giant ghost step number */}
                <div
                  className="absolute -top-4 -right-2 text-[120px] font-black font-mono leading-none select-none pointer-events-none"
                  style={{ color: `${item.accent}08` }}
                >
                  {item.step}
                </div>

                <div className="relative z-10">
                  <div
                    className="text-sm font-bold font-mono mb-4 px-2.5 py-1 rounded-md inline-block"
                    style={{ background: `${item.accent}12`, color: item.accent }}
                  >
                    Step {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-[#E8E4DE] mb-3 font-display">{item.title}</h3>
                  <p className="text-sm text-[#9A9590] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ RECENT AUCTIONS — Horizontal scroll ══════════ */}
      <section className="section-gap" ref={auctionsRef}>
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#C4A265" }}>
                History
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-[#E8E4DE] font-display">
                Recent Auctions
              </h2>
            </div>
            {!loading && auctions.length > 0 && (
              <button
                onClick={createNewAuction}
                disabled={running}
                className="btn-primary text-[13px] py-2.5 px-5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>{running ? "Creating..." : "New Auction"}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton rounded-2xl h-[160px]" />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={auctionsVisible ? { opacity: 1, y: 0 } : {}}
              className="broadcast-card py-20 text-center"
            >
              <div
                className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(196,162,101,0.08)", border: "1px solid rgba(196,162,101,0.12)" }}
              >
                <svg className="w-7 h-7" style={{ color: "#C4A265" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-[#E8E4DE] mb-2 font-display">No auctions yet</p>
              <p className="text-sm text-[#8A857F] mb-8">Create your first auction to get started</p>
              <button onClick={createNewAuction} disabled={running} className="btn-gradient py-3 px-8 disabled:opacity-40">
                <span>{running ? "Creating..." : "Create First Auction"}</span>
              </button>
            </motion.div>
          ) : (
            <div
              ref={scrollRowRef}
              className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {auctions.map((auction, i) => (
                <motion.div
                  key={auction.auction_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={auctionsVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  onClick={() =>
                    router.push(
                      auction.status === "COMPLETED" || auction.has_evaluation
                        ? `/results/${auction.auction_id}`
                        : `/auction/${auction.auction_id}`
                    )
                  }
                  className="broadcast-card p-5 min-w-[300px] md:min-w-[340px] snap-start cursor-pointer group shrink-0 hover:border-[rgba(196,162,101,0.15)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge status={auction.status} />
                    <span className="text-xs text-[#625D58] font-mono">
                      {timeAgo(auction.completed_at || auction.created_at)}
                    </span>
                  </div>

                  <div className="flex -space-x-2 mb-3">
                    {auction.teams.map((t) => (
                      <AgentAvatar key={t.team_index} name={t.agent_name} size="sm" />
                    ))}
                  </div>

                  <div className="text-[13px] text-[#9A9590] truncate mb-3">
                    {auction.teams.map((t) => t.agent_name).join(" vs ")}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8A857F]">
                      Auction #{auctions.length - i}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(auction.auction_id); }}
                      disabled={deleting === auction.auction_id}
                      className="opacity-40 hover:opacity-100 p-1.5 text-[#8A857F] hover:text-[#EF4444] rounded-lg transition-all bg-transparent border-none cursor-pointer"
                      title="Delete"
                    >
                      {deleting === auction.auction_id ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#8A857F] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="relative mt-20">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(196,162,101,0.12), transparent)" }}
        />
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <span className="font-display text-[17px] font-extrabold tracking-[0.2em] uppercase" style={{ color: "#C4A265" }}>
                Raeth
              </span>
              <span className="text-[#625D58] mx-1 font-light text-sm select-none">/</span>
              <span className="font-display text-[13px] font-bold tracking-[0.15em] uppercase text-[#8A857F]">
                Arena
              </span>
            </div>
            <div className="flex items-center gap-8 flex-wrap justify-center">
              {[
                { href: "/tournaments", label: "Tournaments" },
                { href: "/arena", label: "Replays" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/trends", label: "Trends" },
                { href: "/about", label: "About" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#9A9590] hover:text-[#C4A265] transition-colors no-underline font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-[#8A857F] font-mono">
              Built by <span className="text-[#9A9590]">Raeth</span> · Powered by AI models from Anthropic, OpenAI, Google, DeepSeek, Meta & Mistral
            </p>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteAuction(confirmDelete)}
        title="Delete Auction"
        description="This auction and all its data will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Auction"
        variant="danger"
      />
    </div>
  );
}
