import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          include: {
            agent: true,
            wonPlayers: {
              orderBy: { soldPrice: "desc" },
            },
          },
          orderBy: { teamIndex: "asc" },
        },
        players: {
          orderBy: { auctionOrder: "asc" },
        },
        lots: {
          include: {
            bids: { orderBy: { timestamp: "asc" } },
            player: true,
          },
          orderBy: { lotNumber: "asc" },
        },
        evaluation: true,
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Auction not yet completed" },
        { status: 400 }
      );
    }

    // Build results
    const auctionConfig = JSON.parse(auction.config || "{}");
    const pursePerTeam = auctionConfig.pursePerTeam || 100;
    const teams = auction.teams.map((t) => ({
      team_id: t.id,
      team_index: t.teamIndex,
      team_name: TEAMS[t.teamIndex].name,
      agent_name: t.agent.name,
      purse_remaining: t.purseRemaining,
      purse_spent: pursePerTeam - t.purseRemaining,
      squad_size: t.squadSize,
      overseas_count: t.overseasCount,
      squad: t.wonPlayers.map((p) => ({
        player_id: p.id,
        name: p.name,
        role: p.role,
        sub_type: p.subType,
        nationality: p.nationality,
        price_paid: p.soldPrice,
        hidden_true_value: p.hiddenTrueValue,
        is_trap: p.isTrap,
        is_sleeper: p.isSleeper,
        career_stats: JSON.parse(p.careerStats),
        hidden_season_perf: JSON.parse(p.hiddenSeasonPerf),
      })),
    }));

    // All players with revealed hidden values
    const allPlayers = auction.players.map((p) => ({
      player_id: p.id,
      name: p.name,
      role: p.role,
      nationality: p.nationality,
      base_price: p.basePrice,
      sold_price: p.soldPrice,
      won_by_team: p.wonByTeamId,
      is_unsold: p.isUnsold,
      hidden_true_value: p.hiddenTrueValue,
      is_trap: p.isTrap,
      is_sleeper: p.isSleeper,
      hidden_season_perf: JSON.parse(p.hiddenSeasonPerf),
    }));

    // Lot-by-lot transcript
    const transcript = auction.lots.map((l) => ({
      lot_number: l.lotNumber,
      player_name: l.player.name,
      player_role: l.player.role,
      status: l.status,
      final_price: l.finalPrice,
      winner_team_id: l.winnerId,
      bids: l.bids.map((b) => ({
        team_id: b.teamId,
        action: b.action,
        amount: b.amount,
        reasoning: b.reasoning,
        round: b.roundNumber,
      })),
    }));

    const evaluation = auction.evaluation
      ? {
          results: JSON.parse(auction.evaluation.results),
          season_sim: JSON.parse(auction.evaluation.seasonSim),
        }
      : null;

    // Extract cost tracking data from auction config
    const costTracking = auctionConfig.costTracking || null;

    const response = NextResponse.json({
      auction_id: auction.id,
      status: auction.status,
      started_at: auction.startedAt,
      completed_at: auction.completedAt,
      teams,
      all_players: allPlayers,
      transcript,
      evaluation,
      cost_tracking: costTracking,
    });
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to get results" },
      { status: 500 }
    );
  }
}
