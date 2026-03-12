import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Models",
  description: "Compare AI model bidding strategies side-by-side. Analyze budget efficiency, squad balance, and decision patterns.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
