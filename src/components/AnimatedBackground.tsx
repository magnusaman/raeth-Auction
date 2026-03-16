"use client";

interface AnimatedBackgroundProps {
  variant?: "home" | "auction" | "results" | "tournament" | "compare" | "about";
}

export default function AnimatedBackground({ variant = "home" }: AnimatedBackgroundProps) {
  const isHome = variant === "home";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep obsidian base */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Large aurora gradient — warm gold tones */}
      <div
        className="absolute inset-0"
        style={{
          background: isHome
            ? `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(196,162,101,0.18) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 70% 0%, rgba(205,127,50,0.1) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 30% 10%, rgba(139,122,74,0.08) 0%, transparent 50%)
            `
            : variant === "auction"
            ? `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(196,162,101,0.2) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 80% 0%, rgba(245,200,66,0.1) 0%, transparent 50%)
            `
            : variant === "tournament"
            ? `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(196,162,101,0.15) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 30% 0%, rgba(139,122,74,0.1) 0%, transparent 50%)
            `
            : `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(196,162,101,0.1) 0%, transparent 50%)
            `,
        }}
      />

      {/* Animated mesh gradient — warm gold drifting blurs */}
      {isHome && (
        <>
          <div
            className="absolute w-[800px] h-[800px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(196,162,101,0.3) 0%, transparent 70%)",
              top: "-200px",
              left: "50%",
              transform: "translateX(-50%)",
              filter: "blur(100px)",
              animation: "aurora-drift 15s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, rgba(245,200,66,0.3) 0%, transparent 70%)",
              top: "-100px",
              right: "-100px",
              filter: "blur(80px)",
              animation: "aurora-drift 20s ease-in-out 3s infinite alternate-reverse",
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, rgba(139,122,74,0.4) 0%, transparent 70%)",
              top: "200px",
              left: "-100px",
              filter: "blur(80px)",
              animation: "aurora-drift 18s ease-in-out 5s infinite alternate",
            }}
          />
        </>
      )}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(196,162,101,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[400px]"
        style={{
          background: "linear-gradient(to top, #050505, transparent)",
        }}
      />
    </div>
  );
}
