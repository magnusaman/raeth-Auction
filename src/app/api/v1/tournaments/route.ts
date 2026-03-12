import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";
import { TEAMS_FULL } from "@/data/team-config-full";

// GET /api/v1/tournaments — List all tournaments
export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20")));

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          matches: {
            orderBy: { matchNumber: "asc" },
            include: { predictions: true },
          },
          evaluation: true,
        },
      }),
      prisma.tournament.count(),
    ]);

    const result = tournaments.map((t) => {
      const config = JSON.parse(t.config || "{}");
      const isReal = t.dataSource === "real";
      const teamsConfig = isReal ? TEAMS_FULL : TEAMS;

      // For real data: find champion from last match winner; for synthetic: from FINAL
      const finalMatch = isReal
        ? t.matches[t.matches.length - 1]
        : t.matches.find((m) => m.matchType === "FINAL");
      const champion = finalMatch?.actualWinner != null && teamsConfig[finalMatch.actualWinner]
        ? teamsConfig[finalMatch.actualWinner]
        : null;

      // Dynamically build standings from teams that appear in matches
      const teamIndices = new Set<number>();
      for (const m of t.matches) {
        teamIndices.add(m.team1Index);
        teamIndices.add(m.team2Index);
      }

      const standings = Array.from(teamIndices).map((idx) => {
        const teamMatches = t.matches.filter(
          (m) => m.matchType === "LEAGUE" && (m.team1Index === idx || m.team2Index === idx)
        );
        const wins = teamMatches.filter((m) => m.actualWinner === idx).length;
        const team = teamsConfig[idx];
        return {
          team_index: idx,
          team_name: team?.shortName || `T${idx}`,
          logo: team?.logo || "",
          wins,
          losses: teamMatches.length - wins,
          points: wins * 2,
        };
      });
      standings.sort((a, b) => b.points - a.points);

      return {
        tournament_id: t.id,
        status: t.status,
        created_at: t.createdAt,
        completed_at: t.completedAt,
        auction_id: t.auctionId,
        data_source: t.dataSource,
        eval_season: t.evalSeason,
        total_matches: t.matches.length,
        champion: champion ? { name: champion.name, shortName: champion.shortName, logo: champion.logo } : null,
        standings,
        agent_count: new Set(t.matches.flatMap((m) => m.predictions.map((p) => p.agentId))).size,
        has_evaluation: !!t.evaluation,
      };
    });

    return NextResponse.json({ tournaments: result, page, limit, total });
  } catch (error: any) {
    console.error("List tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to list tournaments", details: error?.message },
      { status: 500 }
    );
  }
}
