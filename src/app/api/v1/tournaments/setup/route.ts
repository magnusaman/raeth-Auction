import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTournament, createRealDataTournament } from "@/lib/tour/tournament-engine";
import type { SeasonId } from "@/data/ipl-seasons";

const VALID_SEASONS = ["S1", "S2", "S3", "S4"];

// POST /api/v1/tournaments/setup — Create tournament in PENDING state (no predictions yet)
// Used when external agents need to register before launch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auctionId = body.auctionId || undefined;
    const seasonId: string | undefined = body.seasonId;

    let tournamentId: string;

    if (seasonId && VALID_SEASONS.includes(seasonId)) {
      tournamentId = await createRealDataTournament(seasonId as SeasonId);
    } else {
      tournamentId = await createTournament(auctionId);
    }

    // Engine sets status to PREDICTING — reset back to PENDING for external agent setup
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "PENDING" },
    });

    return NextResponse.json({
      tournament_id: tournamentId,
      status: "PENDING",
      message: "Tournament created in PENDING state — register external agents, then start predictions",
    });
  } catch (error: any) {
    console.error("Setup tournament error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to setup tournament" },
      { status: 500 }
    );
  }
}
