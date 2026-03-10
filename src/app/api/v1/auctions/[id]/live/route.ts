import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";

// GET /api/v1/auctions/[id]/live — Poll for live auction state (lightweight)
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
          include: { agent: true, wonPlayers: { select: { id: true, name: true, role: true, soldPrice: true } } },
          orderBy: { teamIndex: "asc" },
        },
        lots: {
          include: {
            player: true,
            bids: { orderBy: { timestamp: "desc" }, take: 50 },
          },
          orderBy: { lotNumber: "asc" },
        },
      },
    });

    if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Current active lot
    const currentLot = auction.lots.find((l) => l.status === "BIDDING");
    const completedLots = auction.lots.filter((l) => l.status === "SOLD" || l.status === "UNSOLD");
    const lastCompletedLot = completedLots.sort((a, b) => b.lotNumber - a.lotNumber)[0];

    // Recent bids across all lots (last 30)
    const allRecentBids = auction.lots
      .flatMap((l) =>
        l.bids.map((b) => ({
          lot_number: l.lotNumber,
          player_name: l.player.name,
          player_role: l.player.role,
          team_index: auction.teams.find((t) => t.id === b.teamId)?.teamIndex ?? -1,
          agent_name: auction.teams.find((t) => t.id === b.teamId)?.agent.name ?? "?",
          action: b.action,
          amount: b.amount ? Math.round(b.amount * 10) / 10 : null,
          reasoning: b.reasoning,
          timestamp: b.timestamp,
        }))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    // Check if waiting for external agent
    const auctionConfig = JSON.parse(auction.config || "{}");
    const pendingExternalBid = auctionConfig.pendingExternalBid || null;
    const externalSlots = auctionConfig.externalSlots || {};

    return NextResponse.json({
      status: auction.status,
      waiting_for_external: pendingExternalBid ? {
        team_index: auction.teams.find((t) => t.id === pendingExternalBid.teamId)?.teamIndex ?? -1,
        team_name: (() => {
          const team = auction.teams.find((t) => t.id === pendingExternalBid.teamId);
          return team ? TEAMS[team.teamIndex].shortName : "?";
        })(),
      } : null,
      has_external_agents: Object.keys(externalSlots).length > 0,
      external_agents: Object.entries(externalSlots).map(([idx, slot]: [string, any]) => ({
        team_index: parseInt(idx),
        connected: !!slot.connected,
        connected_at: slot.connectedAt || null,
      })),
      teams: auction.teams.map((t) => ({
        team_index: t.teamIndex,
        team_name: TEAMS[t.teamIndex].name,
        short_name: TEAMS[t.teamIndex].shortName,
        logo: TEAMS[t.teamIndex].logo,
        color: TEAMS[t.teamIndex].color,
        agent_name: t.agent.name,
        purse_remaining: Math.round(t.purseRemaining * 10) / 10,
        squad_size: t.wonPlayers.length, // Use actual count, not potentially stale field
        overseas_count: t.overseasCount,
        players: t.wonPlayers.map((p) => ({
          name: p.name,
          role: p.role,
          price: p.soldPrice ? Math.round(p.soldPrice * 10) / 10 : null,
        })),
      })),
      current_lot: currentLot
        ? {
            lot_number: currentLot.lotNumber,
            player_name: currentLot.player.name,
            player_role: currentLot.player.role,
            player_sub_type: currentLot.player.subType,
            nationality: currentLot.player.nationality,
            base_price: currentLot.player.basePrice,
            career_stats: (() => { try { return JSON.parse(currentLot.player.careerStats || "{}"); } catch { return {}; } })(),
            current_bid: (() => { const a = currentLot.bids.find((b) => b.action === "bid")?.amount; return a ? Math.round(a * 10) / 10 : null; })(),
            current_bidder: (() => {
              const lastBid = currentLot.bids.find((b) => b.action === "bid");
              if (!lastBid) return null;
              const team = auction.teams.find((t) => t.id === lastBid.teamId);
              return team ? { team_index: team.teamIndex, agent_name: team.agent.name } : null;
            })(),
          }
        : null,
      last_result: lastCompletedLot
        ? {
            lot_number: lastCompletedLot.lotNumber,
            player_name: lastCompletedLot.player.name,
            status: lastCompletedLot.status,
            final_price: lastCompletedLot.finalPrice,
            winner_team: (() => {
              if (!lastCompletedLot.winnerId) return null;
              const team = auction.teams.find((t) => t.id === lastCompletedLot.winnerId);
              return team ? { team_index: team.teamIndex, agent_name: team.agent.name } : null;
            })(),
          }
        : null,
      progress: {
        total_lots: auction.lots.length,
        completed: completedLots.length,
        sold: auction.lots.filter((l) => l.status === "SOLD").length,
        unsold: auction.lots.filter((l) => l.status === "UNSOLD").length,
      },
      recent_bids: allRecentBids,
    });
  } catch (error: any) {
    console.error("Live state error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
