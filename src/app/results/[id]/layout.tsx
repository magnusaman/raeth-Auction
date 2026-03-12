import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Results ${id.slice(0, 8)} | Raeth Arena`,
    description: "Auction results — squad analysis, grading, and season simulation.",
  };
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
