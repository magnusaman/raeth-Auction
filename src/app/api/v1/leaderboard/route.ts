import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const window = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("window") || "50")));

    // Fetch recent completed auctions with evaluations and teams
    const auctions = await prisma.auction.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: window,
      include: {
        teams: {
          include: { agent: true },
          orderBy: { teamIndex: "asc" },
        },
        evaluation: true,
      },
    });

    // Build agent performance map
    const agentStats = new Map<
      string,
      {
        model: string;
        wins: number;
        auctions: number;
        totalScore: number;
        bestScore: number;
        worstScore: number;
        totalSpend: number;
        totalPlayers: number;
        scores: number[];
        recentResults: { auctionId: string; score: number; rank: number; date: string }[];
      }
    >();

    for (const auction of auctions) {
      if (!auction.evaluation) continue;

      let evalData: any;
      try {
        evalData = JSON.parse(auction.evaluation.results);
      } catch {
        continue;
      }

      const rankings: any[] = evalData.teamEvaluations || evalData.rankings || evalData.teamEvals || [];
      if (rankings.length === 0) continue;

      // Sort by composite score to determine ranks
      const sorted = [...rankings].sort(
        (a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)
      );

      for (let rank = 0; rank < sorted.length; rank++) {
        const entry = sorted[rank];
        const modelName = entry.agentName || "Unknown";

        if (!agentStats.has(modelName)) {
          agentStats.set(modelName, {
            model: modelName,
            wins: 0,
            auctions: 0,
            totalScore: 0,
            bestScore: 0,
            worstScore: 100,
            totalSpend: 0,
            totalPlayers: 0,
            scores: [],
            recentResults: [],
          });
        }

        const stats = agentStats.get(modelName)!;
        const score = entry.compositeScore || 0;

        stats.auctions++;
        stats.totalScore += score;
        stats.scores.push(score);
        if (rank === 0) stats.wins++;
        if (score > stats.bestScore) stats.bestScore = score;
        if (score < stats.worstScore) stats.worstScore = score;

        // Find matching team for spend/squad data
        const team = auction.teams.find(
          (t) => t.agent.name === modelName
        );
        if (team) {
          stats.totalSpend += 100 - team.purseRemaining;
          stats.totalPlayers += team.squadSize;
        }

        stats.recentResults.push({
          auctionId: auction.id,
          score: Math.round(score * 100) / 100,
          rank: rank + 1,
          date: (auction.completedAt || auction.createdAt).toISOString(),
        });
      }
    }

    // Convert to array and compute averages
    const leaderboard = [...agentStats.values()]
      .map((s) => ({
        model: s.model,
        auctions: s.auctions,
        wins: s.wins,
        winRate: s.auctions > 0 ? Math.round((s.wins / s.auctions) * 100) : 0,
        avgScore: s.auctions > 0 ? Math.round((s.totalScore / s.auctions) * 100) / 100 : 0,
        bestScore: Math.round(s.bestScore * 100) / 100,
        worstScore: s.worstScore === 100 ? 0 : Math.round(s.worstScore * 100) / 100,
        avgSpend:
          s.auctions > 0
            ? Math.round((s.totalSpend / s.auctions) * 10) / 10
            : 0,
        avgSquadSize:
          s.auctions > 0
            ? Math.round((s.totalPlayers / s.auctions) * 10) / 10
            : 0,
        consistency:
          s.scores.length > 1
            ? Math.round(
                (1 -
                  Math.sqrt(
                    s.scores.reduce(
                      (sum, sc) =>
                        sum +
                        Math.pow(sc - s.totalScore / s.auctions, 2),
                      0
                    ) / s.scores.length
                  ) /
                    Math.max(1, s.totalScore / s.auctions)) *
                  100
              )
            : 100,
        recentResults: s.recentResults.slice(0, 10),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const response = NextResponse.json({
      leaderboard,
      totalAuctions: auctions.filter((a) => a.evaluation).length,
    });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return response;
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return apiError("Failed to build leaderboard", 500);
  }
}
