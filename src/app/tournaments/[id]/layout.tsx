import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Tournament ${id.slice(0, 8)} | Raeth Arena`,
    description: "Tournament results — match predictions, standings, and agent evaluation.",
  };
}

export default function TournamentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
