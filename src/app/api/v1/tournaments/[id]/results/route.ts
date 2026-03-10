import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";
import { TEAMS_FULL } from "@/data/team-config-full";

// Build a map from fictional prompt codes/names → real team names
const ALIAS_REPLACEMENTS: [RegExp, string][] = TEAMS.flatMap((t) => [
  [new RegExp(`\\b${t.promptShort}\\b`, "gi"), t.shortName],
  [new RegExp(t.promptAlias, "gi"), t.name],
]);

function dealiasReasoning(text: string | null): string | null {
  if (!text) return text;
  let result = text;
  for (const [pattern, replacement] of ALIAS_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// GET /api/v1/tournaments/[id]/results — Full tournament results + evaluation
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        matches: {
          orderBy: { matchNumber: "asc" },
          include: { predictions: true },
        },
        evaluation: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const isReal = tournament.dataSource === "real";
    const teamsConfig = isReal ? TEAMS_FULL : TEAMS;

    const config = JSON.parse(tournament.config || "{}");
    const evalResults = tournament.evaluation
      ? JSON.parse(tournament.evaluation.results || "{}")
      : null;

    const teamAt = (idx: number) => teamsConfig[idx] || { name: `Team ${idx}`, shortName: `T${idx}`, logo: "", color: "#888" };

    // Build match details
    const matches = tournament.matches.map((m) => ({
      match_number: m.matchNumber,
      match_type: m.matchType,
      team1: {
        index: m.team1Index,
        name: teamAt(m.team1Index).name,
        shortName: teamAt(m.team1Index).shortName,
        logo: teamAt(m.team1Index).logo,
        color: teamAt(m.team1Index).color,
        strength: m.team1Strength,
      },
      team2: {
        index: m.team2Index,
        name: teamAt(m.team2Index).name,
        shortName: teamAt(m.team2Index).shortName,
        logo: teamAt(m.team2Index).logo,
        color: teamAt(m.team2Index).color,
        strength: m.team2Strength,
      },
      venue: m.venue,
      venue_traits: JSON.parse(m.venueTraits || "{}"),
      home_team: m.homeTeamIndex != null ? teamAt(m.homeTeamIndex).shortName : null,
      winner: m.actualWinner != null ? {
        index: m.actualWinner,
        name: teamAt(m.actualWinner).name,
        shortName: teamAt(m.actualWinner).shortName,
        logo: teamAt(m.actualWinner).logo,
      } : null,
      margin: m.actualMargin,
      predictions: m.predictions.map((p) => ({
        agent_id: p.agentId,
        agent_name: p.agentName,
        predicted_winner: p.predictedWinner,
        predicted_team: teamAt(p.predictedWinner).shortName,
        confidence: p.confidence,
        predicted_margin: p.predictedMargin,
        key_factors: (JSON.parse(p.keyFactors || "[]") as string[]).map((f) => dealiasReasoning(f) || f),
        reasoning: dealiasReasoning(p.reasoning),
        correct: m.actualWinner != null ? p.predictedWinner === m.actualWinner : null,
      })),
    }));

    // League standings — dynamically from teams in matches
    const teamIndices = new Set<number>();
    for (const m of tournament.matches) {
      teamIndices.add(m.team1Index);
      teamIndices.add(m.team2Index);
    }

    const standings = Array.from(teamIndices).map((idx) => {
      const leagueMatches = tournament.matches.filter(
        (m) => m.matchType === "LEAGUE" && (m.team1Index === idx || m.team2Index === idx)
      );
      const wins = leagueMatches.filter((m) => m.actualWinner === idx).length;
      const team = teamAt(idx);
      return {
        team_index: idx,
        team_name: team.name,
        short_name: team.shortName,
        logo: team.logo,
        color: team.color,
        played: leagueMatches.length,
        wins,
        losses: leagueMatches.length - wins,
        points: wins * 2,
      };
    });
    standings.sort((a, b) => b.points - a.points);

    return NextResponse.json({
      tournament_id: tournament.id,
      status: tournament.status,
      created_at: tournament.createdAt,
      completed_at: tournament.completedAt,
      auction_id: tournament.auctionId,
      data_source: tournament.dataSource,
      eval_season: tournament.evalSeason,
      config,
      standings,
      matches,
      evaluation: evalResults,
    });
  } catch (error: any) {
    console.error("Tournament results error:", error);
    return NextResponse.json(
      { error: "Failed to get tournament results", details: error?.message },
      { status: 500 }
    );
  }
}
