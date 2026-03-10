import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";

export async function GET() {
  try {
    const auctions = await prisma.auction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teams: {
          include: { agent: true },
          orderBy: { teamIndex: "asc" },
        },
        evaluation: true,
      },
    });

    const result = auctions.map((a) => ({
      auction_id: a.id,
      status: a.status,
      created_at: a.createdAt,
      started_at: a.startedAt,
      completed_at: a.completedAt,
      teams: a.teams.map((t) => ({
        team_index: t.teamIndex,
        team_name: TEAMS[t.teamIndex].name,
        agent_name: t.agent.name,
        purse_remaining: t.purseRemaining,
        squad_size: t.squadSize,
      })),
      has_evaluation: !!a.evaluation,
    }));

    return NextResponse.json({ auctions: result });
  } catch (error: any) {
    console.error("List auctions error:", error);
    return NextResponse.json(
      { error: "Failed to list auctions", details: error?.message },
      { status: 500 }
    );
  }
}
