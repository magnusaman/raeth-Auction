"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Large ghost 404 in background */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{ opacity: 0.03 }}
      >
        <span className="text-[300px] md:text-[400px] font-black font-mono leading-none text-[#F5F0E8]">
          404
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-[80px] md:text-[100px] font-black font-display leading-none mb-4"
          style={{
            background: "linear-gradient(135deg, #D4A853, #CD7F32)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 80px rgba(212,168,83,0.2)",
          }}
        >
          404
        </motion.div>

        <h2 className="text-xl font-bold text-[#F5F0E8] mb-2 font-display">
          Page not found
        </h2>
        <p className="text-sm text-[#6B6560] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-gradient py-2.5 px-6 text-sm">
            Go Home
          </Link>
          <Link href="/leaderboard" className="btn-secondary py-2.5 px-6 text-sm">
            Leaderboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
