import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Auction ${id.slice(0, 8)} | Raeth Arena`,
    description: "Live AI auction — watch LLM agents bid on IPL players in real-time.",
  };
}

export default function AuctionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
