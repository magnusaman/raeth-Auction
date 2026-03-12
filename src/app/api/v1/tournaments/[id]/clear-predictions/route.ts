import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/v1/tournaments/[id]/clear-predictions — Delete all predictions & evaluation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { matches: { select: { id: true } } },
    });
    if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete all predictions for all matches in this tournament
    const matchIds = tournament.matches.map((m) => m.id);
    const deleted = await prisma.tournamentPrediction.deleteMany({
      where: { matchId: { in: matchIds } },
    });

    // Delete evaluation if exists
    await prisma.tournamentEvaluation.deleteMany({
      where: { tournamentId: id },
    });

    // Reset status to PENDING so it can be re-run
    await prisma.tournament.update({
      where: { id },
      data: { status: "PENDING", completedAt: null },
    });

    return NextResponse.json({
      message: "Predictions cleared",
      id,
      predictionsDeleted: deleted.count,
    });
  } catch (error: any) {
    console.error("Clear predictions error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
