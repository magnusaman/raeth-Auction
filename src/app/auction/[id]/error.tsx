"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AuctionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auction error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <svg
            className="w-7 h-7 text-[#EF4444]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Auction Error
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {error.message ||
            "Failed to load this auction. It may have been deleted."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary py-2.5 px-6 text-sm">
            Retry
          </button>
          <Link href="/" className="btn-secondary py-2.5 px-6 text-sm">
            Back to Auctions
          </Link>
        </div>
      </div>
    </div>
  );
}
