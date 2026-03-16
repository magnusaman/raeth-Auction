import { NextRequest, NextResponse } from "next/server";
import { createTournament, createRealDataTournament } from "@/lib/tour/tournament-engine";
import { runPredictionsAndEvaluate } from "@/lib/tour/tour-orchestrator";
import type { SeasonId } from "@/data/ipl-seasons";
const VALID_SEASONS = ["S1", "S2", "S3", "S4"];

// POST /api/v1/tournaments/run — Create tournament and start predictions in background
export async function POST(req: NextRequest) {

  try {
    const body = await req.json().catch(() => ({}));
    const auctionId = body.auctionId || undefined;
    const seasonId: string | undefined = body.seasonId;
    const agents: { name: string; model: string }[] | undefined = body.agents;

    let tournamentId: string;

    if (seasonId && VALID_SEASONS.includes(seasonId)) {
      // Real data mode — load actual IPL season results
      tournamentId = await createRealDataTournament(seasonId as SeasonId);
    } else {
      // Synthetic mode — simulated matches
      tournamentId = await createTournament(auctionId);
    }

    // Fire predictions in background (don't await)
    runPredictionsAndEvaluate(tournamentId, agents).catch((err) =>
      console.error("[TourBench] Fatal error:", err)
    );

    return NextResponse.json({
      tournament_id: tournamentId,
      status: "PREDICTING",
      message: "Tournament created — predictions running in background",
    });
  } catch (error: any) {
    console.error("Run tournament error:", error?.message, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Failed to run tournament", stack: error?.stack?.split("\n").slice(0, 5) },
      { status: 500 }
    );
  }
}
