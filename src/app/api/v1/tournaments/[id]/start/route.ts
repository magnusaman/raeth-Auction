import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPredictionsAndEvaluate } from "@/lib/tour/tour-orchestrator";

// POST /api/v1/tournaments/[id]/start — Start predictions on a pre-created tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await req.json().catch(() => ({}));
    const agents: { name: string; model: string }[] | undefined = body.agents;
    const userApiKey: string | undefined = body.openrouterApiKey;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "PENDING") {
      return NextResponse.json({ error: "Tournament already started" }, { status: 400 });
    }

    // Fire predictions in background
    runPredictionsAndEvaluate(tournamentId, agents, userApiKey).catch((err) =>
      console.error("[TourBench] Fatal error:", err)
    );

    return NextResponse.json({
      tournament_id: tournamentId,
      status: "PREDICTING",
      message: "Predictions started",
    });
  } catch (error: any) {
    console.error("Start tournament error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to start tournament" },
      { status: 500 }
    );
  }
}
