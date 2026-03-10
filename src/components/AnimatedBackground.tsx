"use client";

interface AnimatedBackgroundProps {
  variant?: "home" | "auction" | "results" | "tournament" | "compare" | "about";
}

export default function AnimatedBackground({ variant = "home" }: AnimatedBackgroundProps) {
  const isHome = variant === "home";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep base */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Large aurora gradient — the signature visual */}
      <div
        className="absolute inset-0"
        style={{
          background: isHome
            ? `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120,119,198,0.3) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 70% 0%, rgba(33,150,243,0.15) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 30% 10%, rgba(168,85,247,0.12) 0%, transparent 50%)
            `
            : variant === "auction"
            ? `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(253,185,19,0.2) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 80% 0%, rgba(255,48,64,0.1) 0%, transparent 50%)
            `
            : variant === "tournament"
            ? `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(59,130,246,0.2) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 30% 0%, rgba(168,85,247,0.12) 0%, transparent 50%)
            `
            : `
              radial-gradient(ellipse 70% 50% at 50% -20%, rgba(120,119,198,0.15) 0%, transparent 50%)
            `,
        }}
      />

      {/* Animated mesh gradient — gives the "alive" feeling */}
      {isHome && (
        <>
          <div
            className="absolute w-[800px] h-[800px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(120,119,198,0.4) 0%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)",
              top: "-100px",
              right: "-100px",
              filter: "blur(80px)",
              animation: "aurora-drift 20s ease-in-out 3s infinite alternate-reverse",
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)",
              top: "200px",
              left: "-100px",
              filter: "blur(80px)",
              animation: "aurora-drift 18s ease-in-out 5s infinite alternate",
            }}
          />
        </>
      )}

      {/* Subtle dot grid — Linear style */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
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
