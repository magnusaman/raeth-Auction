import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "AI agents predict IPL match outcomes. Evaluated on accuracy, calibration, and upset detection.",
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
