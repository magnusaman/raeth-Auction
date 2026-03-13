import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div
          className="text-[80px] font-black leading-none mb-4"
          style={{
            background: "linear-gradient(135deg, #D4A853, #CD7F32)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Page not found
        </h2>
        <p className="text-sm text-text-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary py-2.5 px-6 text-sm">
            Go Home
          </Link>
          <Link href="/leaderboard" className="btn-secondary py-2.5 px-6 text-sm">
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
