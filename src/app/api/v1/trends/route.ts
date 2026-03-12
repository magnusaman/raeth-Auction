import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auctions = await prisma.auction.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      include: {
        teams: {
          include: { agent: true },
          orderBy: { teamIndex: "asc" },
        },
        evaluation: true,
      },
    });

    // Build time-series data per model
    const modelData = new Map<string, {
      model: string;
      dataPoints: {
        auctionId: string;
        date: string;
        score: number;
        rank: number;
        spend: number;
        squadSize: number;
        winRate: number; // cumulative up to this point
      }[];
    }>();

    // Track cumulative wins per model
    const cumulativeWins = new Map<string, number>();
    const cumulativeGames = new Map<string, number>();

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

      const sorted = [...rankings].sort(
        (a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)
      );

      for (let rank = 0; rank < sorted.length; rank++) {
        const entry = sorted[rank];
        const modelName = entry.agentName || "Unknown";

        if (!modelData.has(modelName)) {
          modelData.set(modelName, { model: modelName, dataPoints: [] });
        }
        if (!cumulativeWins.has(modelName)) {
          cumulativeWins.set(modelName, 0);
          cumulativeGames.set(modelName, 0);
        }

        const games = (cumulativeGames.get(modelName) || 0) + 1;
        const wins = (cumulativeWins.get(modelName) || 0) + (rank === 0 ? 1 : 0);
        cumulativeGames.set(modelName, games);
        cumulativeWins.set(modelName, wins);

        const team = auction.teams.find((t) => t.agent.name === modelName);
        const spend = team ? 100 - team.purseRemaining : 0;
        const squadSize = team ? team.squadSize : 0;

        modelData.get(modelName)!.dataPoints.push({
          auctionId: auction.id,
          date: (auction.completedAt || auction.createdAt).toISOString(),
          score: Math.round((entry.compositeScore || 0) * 10000) / 100, // as percentage
          rank: rank + 1,
          spend: Math.round(spend * 10) / 10,
          squadSize,
          winRate: Math.round((wins / games) * 100),
        });
      }
    }

    // Summary stats
    const models = [...modelData.values()].map((m) => {
      const scores = m.dataPoints.map((d) => d.score);
      const spends = m.dataPoints.map((d) => d.spend);
      return {
        ...m,
        summary: {
          avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0,
          maxScore: scores.length > 0 ? Math.max(...scores) : 0,
          minScore: scores.length > 0 ? Math.min(...scores) : 0,
          avgSpend: spends.length > 0 ? Math.round(spends.reduce((a, b) => a + b, 0) / spends.length * 10) / 10 : 0,
          totalGames: m.dataPoints.length,
          totalWins: m.dataPoints.filter((d) => d.rank === 1).length,
        },
      };
    });

    const response = NextResponse.json({
      models,
      totalAuctions: auctions.filter((a) => a.evaluation).length,
    });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return response;
  } catch (error: any) {
    console.error("Trends error:", error);
    return NextResponse.json(
      { error: "Failed to build trends", details: error?.message },
      { status: 500 }
    );
  }
}
