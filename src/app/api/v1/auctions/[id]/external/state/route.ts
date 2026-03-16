import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuctionState, getNextBidder } from "@/lib/auction-engine";
import { TEAMS } from "@/data/team-config";

// GET /api/v1/auctions/[id]/external/state?token=xxx
// External agent polls this to see current lot, their team status, and if it's their turn
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token query param" }, { status: 401 });
    }

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: { include: { agent: true } },
        lots: {
          where: { status: "BIDDING" },
          include: { player: true, bids: { orderBy: { timestamp: "desc" } } },
        },
      },
    });

    if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });

    // Validate token against external slots in config
    const config = JSON.parse(auction.config || "{}");
    const externalSlots: Record<string, { token: string }> = config.externalSlots || {};

    let myTeamIndex: number | null = null;
    for (const [idx, slot] of Object.entries(externalSlots)) {
      if (slot.token === token) {
        myTeamIndex = parseInt(idx);
        break;
      }
    }

    if (myTeamIndex === null) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Mark this external agent as connected (first poll)
    const slot = externalSlots[String(myTeamIndex)] as any;
    if (!slot.connected) {
      slot.connected = true;
      slot.connectedAt = new Date().toISOString();
      config.externalSlots = externalSlots;
      await prisma.auction.update({
        where: { id: auctionId },
        data: { config: JSON.stringify(config) },
      });
      console.log(`[External] ${TEAMS[myTeamIndex].shortName} agent connected!`);
    }

    const myTeam = auction.teams.find((t) => t.teamIndex === myTeamIndex);

    // In LOBBY phase, team record may not exist yet — return minimal state
    if (!myTeam) {
      return NextResponse.json({
        auction_id: auctionId,
        status: auction.status,
        your_team: {
          team_id: null,
          team_index: myTeamIndex,
          team_name: TEAMS[myTeamIndex]?.name ?? `Team ${myTeamIndex}`,
          short_name: TEAMS[myTeamIndex]?.shortName ?? `T${myTeamIndex}`,
          purse_remaining: null,
          squad_size: 0,
          overseas_count: 0,
          role_counts: {},
          needs: {},
          squad: [],
        },
        your_turn: false,
        current_lot: null,
        current_bid: null,
        opponents: [],
        progress: null,
        connected: true,
        message: auction.status === "LOBBY"
          ? "Connected! Waiting for auction to start..."
          : "Team not fully initialized yet",
      });
    }

    // Get full state
    const state = await getAuctionState(auctionId, myTeam.id);

    // Determine if it's this agent's turn
    let yourTurn = false;
    const currentLot = auction.lots[0];
    if (currentLot && auction.status === "RUNNING") {
      const nextBidderId = await getNextBidder(auctionId, currentLot.id);
      yourTurn = nextBidderId === myTeam.id;
    }

    // Also check the pendingExternalBid signal
    const pendingBid = config.pendingExternalBid;
    if (pendingBid?.teamId === myTeam.id) {
      yourTurn = true;
    }

    return NextResponse.json({
      auction_id: auctionId,
      status: auction.status,
      your_team: {
        team_id: myTeam.id,
        team_index: myTeamIndex,
        team_name: TEAMS[myTeamIndex].name,
        short_name: TEAMS[myTeamIndex].shortName,
        purse_remaining: state.yourTeam.purseRemaining,
        squad_size: state.yourTeam.squadSize,
        overseas_count: state.yourTeam.overseasCount,
        role_counts: state.yourTeam.roleCounts,
        needs: state.yourTeam.needs,
        squad: state.yourTeam.squad,
      },
      your_turn: yourTurn,
      current_lot: state.currentLot
        ? {
            lot_number: state.currentLot.lotNumber,
            player_id: state.currentLot.playerId,
            name: state.currentLot.name,
            role: state.currentLot.role,
            sub_type: state.currentLot.subType,
            nationality: state.currentLot.nationality,
            age: state.currentLot.age,
            base_price: state.currentLot.basePrice,
            career_stats: state.currentLot.careerStats,
            recent_form: state.currentLot.recentForm,
            style_tags: state.currentLot.styleTags,
          }
        : null,
      current_bid: state.currentBid
        ? { amount: state.currentBid.amount, team_id: state.currentBid.teamId }
        : null,
      opponents: state.otherTeams.map((t: any) => ({
        team_index: t.teamIndex,
        team_name: TEAMS[t.teamIndex].name,
        purse_remaining: t.purseRemaining,
        squad_size: t.squadSize,
      })),
      progress: state.auctionProgress,
    });
  } catch (error: any) {
    console.error("External state error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
