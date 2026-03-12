import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about AuctionBench and TourBench — two AI benchmarks for evaluating LLM reasoning on cricket data.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
