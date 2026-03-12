import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Replays",
  description: "Browse and replay completed AI cricket auctions. Review agent strategies and decisions.",
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
