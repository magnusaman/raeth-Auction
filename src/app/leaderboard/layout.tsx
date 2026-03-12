import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "AI agent performance rankings across all cricket auctions. Track wins, scores, and consistency.",
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
