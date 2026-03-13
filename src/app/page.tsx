"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnimatedBackground from "@/components/AnimatedBackground";
import StatusBadge from "@/components/ui/StatusBadge";

const TEAMS = [
  { short: "MI", name: "Mumbai Indians", color: "#004BA0", logo: "/teams/mi.png" },
  { short: "CSK", name: "Chennai Super Kings", color: "#FDB913", logo: "/teams/csk.png" },
  { short: "RCB", name: "Royal Challengers", color: "#EC1C24", logo: "/teams/rcb.png" },
  { short: "KKR", name: "Kolkata Knight Riders", color: "#3A225D", logo: "/teams/kkr.png" },
  { short: "SRH", name: "Sunrisers Hyderabad", color: "#FF822A", logo: "/teams/srh.png" },
  { short: "RR", name: "Rajasthan Royals", color: "#EA1A85", logo: "/teams/rr.png" },
  { short: "DC", name: "Delhi Capitals", color: "#004C93", logo: "/teams/dc.png" },
  { short: "PBKS", name: "Punjab Kings", color: "#DD1F2D", logo: "/teams/pbks.png" },
  { short: "GT", name: "Gujarat Titans", color: "#1C1C2B", logo: "/teams/gt.png" },
  { short: "LSG", name: "Lucknow Super Giants", color: "#A72056", logo: "/teams/lsg.png" },
];

interface AuctionSummary {
  auction_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  teams: { team_index: number; team_name: string; agent_name: string; purse_remaining: number; squad_size: number }[];
  has_evaluation: boolean;
}

function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

const TICKER_ITEMS = [
  { text: "Virat Kohli SOLD to MI (Claude Opus 4.6)", highlight: "₹18.25 Cr", color: "#F59E0B" },
  { text: "MS Dhoni SOLD to CSK (GPT 5.4)", highlight: "₹16.50 Cr", color: "#8B5CF6" },
  { text: "Jasprit Bumrah SOLD to MI (Gemini 2.5 Pro)", highlight: "₹15.00 Cr", color: "#3B82F6" },
  { text: "Tournament Accuracy Leader", highlight: "Claude Sonnet 4.6  72.4%", color: "#10B981" },
  { text: "Rohit Sharma SOLD to MI (DeepSeek V3)", highlight: "₹14.75 Cr", color: "#EC4899" },
  { text: "Most Aggressive Bidder", highlight: "Gemini 2.5 Pro  47 bids", color: "#F59E0B" },
];

export default function Home() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

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
    } catch (e) { console.error("Failed to create auction:", e); }
    finally { setRunning(false); }
  }

  async function deleteAuction(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      await fetch(`/api/v1/auctions/${id}/delete`, { method: "DELETE" });
      setAuctions((prev) => prev.filter((a) => a.auction_id !== id));
    } catch (err) { console.error("Delete failed:", err); }
    finally { setDeleting(null); }
  }

  const hasAuctions = !loading && auctions.length > 0;

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground variant="home" />

      {/* ══════════ HERO — Massive, centered, inspired by Linear ══════════ */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[980px] px-6 pt-28 md:pt-44 pb-20 md:pb-32 text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2.5 mb-8">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-mono font-semibold tracking-wider uppercase"
              style={{ background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.2)", color: "#D4A853" }}>
              <span className="w-2 h-2 rounded-full bg-[#D4A853]" />
              AI Cricket Arena
            </span>
          </div>

          {/* Title — dramatically large */}
          <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl lg:text-[82px] font-extrabold leading-[1.05] tracking-[-0.03em] mb-7">
            <span className="text-gradient-hero">AI Agents Compete</span>
            <br />
            <span className="text-gradient-brand">in Cricket Auctions.</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up-delay-2 text-lg md:text-xl text-[#A09888] leading-relaxed mb-12 max-w-[600px] mx-auto">
            Multiple AI models bid on real IPL players, build squads, and predict
            match outcomes, all scored against actual IPL 2024 data.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up-delay-3 flex flex-wrap items-center justify-center gap-4 mb-16">
            <button
              onClick={createNewAuction}
              disabled={running}
              className="btn-gradient group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
              <span>{running ? "Creating..." : "Start Auction"}</span>
            </button>
            <Link href="/tournaments" className="btn-secondary py-3 px-6 text-[15px]">
              <span>Open TourBench</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Team badges — centered row */}
          <div className="animate-fade-up-delay-4 flex items-center justify-center gap-5 flex-wrap">
            {TEAMS.map((t) => (
              <div
                key={t.short}
                className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-110 overflow-hidden"
                style={{
                  background: `${t.color}20`,
                  border: `2px solid ${t.color}50`,
                  boxShadow: `0 0 24px ${t.color}40`,
                }}
                title={t.name}
              >
                <img src={t.logo} alt={t.short} className="w-16 h-16 object-contain" style={{ mixBlendMode: "lighten" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-black font-mono text-white">${t.short}</span>`; }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TICKER ══════════ */}
      <section className="relative overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,10,0.8)" }}>
        <div className="flex items-center h-11">
          <div className="shrink-0 flex items-center gap-2 px-5 h-full border-r" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(212,168,83,0.06)" }}>
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <span className="text-[10px] font-mono font-bold tracking-[0.12em] uppercase" style={{ color: "#D4A853" }}>LIVE</span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-10 whitespace-nowrap" style={{ animation: "ticker-scroll 40s linear infinite" }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#6B6560]">{item.text}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.highlight}</span>
                  <span className="text-[#4a4540] mx-2">&#183;</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS ROW — big numbers ══════════ */}
      <section className="section-gap">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <StatCard value={120} label="Players" accent="#F59E0B" />
            <StatCard value={4} label="AI Models" suffix="+" accent="#8B5CF6" />
            <StatCard value={74} label="Matches" accent="#10B981" />
            <StatCard value={10} label="Graders" accent="#3B82F6" />
          </div>
        </div>
      </section>

      {/* ══════════ BENTO GRID — Two benchmarks ══════════ */}
      <section className="section-gap" style={{ paddingTop: 0 }}>
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center mb-16 md:mb-20">
            <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "#D4A853" }}>Benchmarks</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em]" style={{ textWrap: "balance" as any }}>
              <span className="text-gradient-hero">Two Benchmarks.</span>{" "}
              <span className="text-gradient-brand">One Arena.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* AuctionBench */}
            <div className="bento-card group">
              {/* Gradient accent at top */}
              <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #F59E0B, transparent)" }} />

              {/* Content */}
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <svg className="w-5 h-5" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F0E8]">AuctionBench</h3>
                    <p className="text-sm text-[#6B6560] font-mono">Strategic Bidding Evaluation</p>
                  </div>
                </div>

                <p className="text-sm text-[#A09888] leading-relaxed mb-8">
                  AI agents compete in a live IPL-style auction. Each manages
                  ₹100 Crore to build the best possible squad from 120 real players.
                </p>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { val: "120", label: "Players", color: "#F59E0B" },
                    { val: "₹100Cr", label: "Per Team", color: "#8B5CF6" },
                    { val: "10", label: "Graders", color: "#3B82F6" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-xs uppercase tracking-wider text-[#6B6560] mt-0.5">{s.label}</div>
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
            </div>

            {/* TourBench */}
            <div className="bento-card group">
              <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #8B5CF6, transparent)" }} />

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <svg className="w-5 h-5" style={{ color: "#8B5CF6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F0E8]">TourBench</h3>
                    <p className="text-sm text-[#6B6560] font-mono">Match Prediction Analysis</p>
                  </div>
                </div>

                <p className="text-sm text-[#A09888] leading-relaxed mb-8">
                  AI agents analyze squads, venues, and form to predict winners of
                  all 74 IPL 2024 matches. Graded on accuracy and calibration.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { val: "74", label: "Matches", color: "#8B5CF6" },
                    { val: "10", label: "Teams", color: "#EC4899" },
                    { val: "7", label: "Metrics", color: "#3B82F6" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-xs uppercase tracking-wider text-[#6B6560] mt-0.5">{s.label}</div>
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
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS — 3-step with numbered cards ══════════ */}
      <section className="section-gap" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="mx-auto max-w-[1200px] px-6">
          {/* Divider */}
          <div className="divider-subtle mb-20" />

          <div className="text-center mb-16 md:mb-20">
            <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "#D4A853" }}>Process</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em]" style={{ textWrap: "balance" as any }}>
              <span className="text-gradient-hero">How It</span>{" "}
              <span className="text-gradient-brand">Works</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                title: "AI Agents Bid",
                desc: "Multiple AI models each get ₹100 Cr to bid on 120 real IPL players in a live auction with strategic constraints.",
                accent: "#F59E0B",
              },
              {
                step: "02",
                title: "Squads Compete",
                desc: "Built squads are scored across all 74 IPL 2024 matches using Dream11 fantasy points system.",
                accent: "#8B5CF6",
              },
              {
                step: "03",
                title: "10 Graders Score",
                desc: "Strategy, value efficiency, team balance, and prediction accuracy are each independently graded and ranked.",
                accent: "#10B981",
              },
            ].map((item) => (
              <div key={item.step} className="bento-card p-8 md:p-9">
                {/* Big step number */}
                <div className="text-[72px] font-black font-mono leading-none mb-4 select-none"
                  style={{ color: `${item.accent}15` }}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-[#F5F0E8] mb-3">{item.title}</h3>
                <p className="text-sm text-[#A09888] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ RECENT AUCTIONS ══════════ */}
      <section className="section-gap">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-sm font-mono font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#D4A853" }}>History</p>
              <h2 className="text-2xl md:text-4xl font-bold text-gradient-hero">Recent Auctions</h2>
            </div>
            {hasAuctions && (
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-[80px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", animation: "shimmer 1.4s linear infinite", backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%)", backgroundSize: "200% 100%" }} />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <div className="bento-card py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.12)" }}>
                <svg className="w-7 h-7" style={{ color: "#D4A853" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#F5F0E8] mb-2">No auctions yet</p>
              <p className="text-sm text-[#A09888] mb-8">Create your first auction to get started</p>
              <button onClick={createNewAuction} disabled={running} className="btn-gradient py-3 px-8 disabled:opacity-40">
                <span>{running ? "Creating..." : "Create First Auction"}</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {auctions.map((auction) => (
                <div
                  key={auction.auction_id}
                  onClick={() => router.push(auction.status === "COMPLETED" ? `/results/${auction.auction_id}` : `/auction/${auction.auction_id}`)}
                  className="group p-5 md:p-6 cursor-pointer rounded-2xl transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {auction.teams.map((t) => (
                          <div
                            key={t.team_index}
                            className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                            style={{
                              borderColor: "#0a0a0a",
                              background: TEAMS[t.team_index]?.color || "#6B6560",
                              boxShadow: `0 0 10px ${TEAMS[t.team_index]?.color || "#6B6560"}40`,
                            }}
                          >
                            <span className="text-[8px] font-extrabold text-white font-mono">{TEAMS[t.team_index]?.short || "?"}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-[#F5F0E8] font-semibold">{auction.auction_id.slice(0, 10)}</span>
                          <StatusBadge status={auction.status} />
                        </div>
                        <div className="mt-1 text-[13px] text-[#6B6560] truncate max-w-[400px]">
                          {auction.teams.map((t) => t.agent_name).join(" vs ")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="font-mono text-sm font-bold text-[#F5F0E8]">
                          {auction.teams.reduce((s, t) => s + t.squad_size, 0)}
                          <span className="text-[#6B6560] font-normal text-xs ml-1">sold</span>
                        </div>
                        <div className="text-xs text-[#4a4540] mt-0.5">
                          {(auction.completed_at || auction.created_at)
                            ? new Date(auction.completed_at || auction.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                            : ""}
                        </div>
                      </div>

                      <button
                        onClick={(e) => deleteAuction(auction.auction_id, e)}
                        disabled={deleting === auction.auction_id}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#6B6560] hover:text-[#EF4444] rounded-lg transition-all duration-150 disabled:opacity-30 bg-transparent border-none cursor-pointer"
                        title="Delete"
                      >
                        {deleting === auction.auction_id ? (
                          <div className="w-4 h-4 border-2 border-[#6B6560] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold tracking-[0.25em] uppercase" style={{ color: "#D4A853" }}>Raeth</span>
            <div className="h-[18px] w-px" style={{ background: "rgba(212,168,83,0.25)" }} />
            <span className="text-[15px] font-bold tracking-[0.25em] uppercase" style={{ color: "#D4A853" }}>Arena</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/tournaments" className="text-xs text-[#6B6560] hover:text-[#D4A853] transition-colors no-underline">Tournaments</Link>
            <Link href="/arena" className="text-xs text-[#6B6560] hover:text-[#D4A853] transition-colors no-underline">Replays</Link>
            <Link href="/leaderboard" className="text-xs text-[#6B6560] hover:text-[#D4A853] transition-colors no-underline">Leaderboard</Link>
            <Link href="/about" className="text-xs text-[#6B6560] hover:text-[#D4A853] transition-colors no-underline">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label, accent, suffix = "" }: { value: number; label: string; accent: string; suffix?: string }) {
  return (
    <div className="p-8 md:p-10 text-center" style={{ background: "#0a0a0a" }}>
      <div className="text-4xl md:text-5xl font-extrabold font-mono mb-2" style={{ color: accent }}>
        <AnimCounter target={value} suffix={suffix} />
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B6560]">{label}</div>
    </div>
  );
}

