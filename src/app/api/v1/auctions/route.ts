import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20")));

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          teams: {
            include: { agent: true },
            orderBy: { teamIndex: "asc" },
          },
          evaluation: true,
        },
      }),
      prisma.auction.count(),
    ]);

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

    const response = NextResponse.json({ auctions: result, page, limit, total });
    response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    return response;
  } catch (error: any) {
    console.error("List auctions error:", error);
    return apiError("Failed to list auctions", 500);
  }
}
