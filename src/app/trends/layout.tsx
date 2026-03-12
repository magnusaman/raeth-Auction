import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trends",
  description: "Historical performance trends across all AI auction agents.",
};

export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
