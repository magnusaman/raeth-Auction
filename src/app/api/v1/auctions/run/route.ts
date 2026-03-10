import { NextRequest, NextResponse } from "next/server";
import { runFullAuction } from "@/lib/orchestrator";

// POST /api/v1/auctions/run — Start a full automated auction with AI agents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const agents = body.agents || undefined; // Optional custom agents

    const { auctionId, results } = await runFullAuction(agents);

    return NextResponse.json({
      auction_id: auctionId,
      winner: results.winner,
      team_evaluations: results.teamEvaluations.map((t: any) => ({
        team_index: t.teamIndex,
        agent_name: t.agentName,
        composite_score: t.compositeScore,
        rank: t.rank,
      })),
      season_standings: results.seasonSimulation.standings,
      message: "Auction completed and evaluated",
    });
  } catch (error: any) {
    console.error("Run auction error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run auction" },
      { status: 500 }
    );
  }
}
