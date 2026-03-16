import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAMS } from "@/data/team-config";
import { ExternalBidSchema, zodError } from "@/lib/api-schemas";

// POST /api/v1/auctions/[id]/external/bid?token=xxx
// External agent submits a bid/pass decision.
// Decision is stored in auction config — the bidding loop picks it up
// and routes it through processBid() for proper validation.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token query param" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ExternalBidSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed);

    const { action, amount, reasoning } = parsed.data;

    if (action === "bid" && (amount === undefined || amount <= 0)) {
      return NextResponse.json({ error: "amount is required for bid action" }, { status: 400 });
    }

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: true,
        lots: {
          where: { status: "BIDDING" },
          include: { bids: { orderBy: { timestamp: "desc" } } },
        },
      },
    });

    if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    if (auction.status !== "RUNNING") {
      return NextResponse.json({ error: "Auction is not running" }, { status: 400 });
    }

    // Validate token
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

    const myTeam = auction.teams.find((t) => t.teamIndex === myTeamIndex);
    if (!myTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Verify it's actually this agent's turn (pendingExternalBid signal)
    const pendingBid = config.pendingExternalBid;
    if (!pendingBid || pendingBid.teamId !== myTeam.id) {
      return NextResponse.json({ error: "It's not your turn" }, { status: 409 });
    }

    const currentLot = auction.lots[0];
    if (!currentLot) {
      return NextResponse.json({ error: "No active lot" }, { status: 400 });
    }

    if (pendingBid.lotId !== currentLot.id) {
      return NextResponse.json({ error: "Lot has changed, not your turn anymore" }, { status: 409 });
    }

    // Store decision in config — the bidding loop's waitForExternalBid()
    // will pick this up and route through processBid() for validation.
    // This prevents bypassing squad size, purse, and overseas checks.
    config.externalBidResponse = {
      teamId: myTeam.id,
      lotId: currentLot.id,
      action,
      amount: action === "bid" ? amount : null,
      reasoning: reasoning || "",
      timestamp: new Date().toISOString(),
    };

    await prisma.auction.update({
      where: { id: auctionId },
      data: { config: JSON.stringify(config) },
    });

    console.log(`  [External] ${TEAMS[myTeamIndex].shortName}: ${action}${amount ? ` ₹${amount}Cr` : ""}`);

    return NextResponse.json({
      message: `${action === "bid" ? "Bid" : "Pass"} submitted`,
      action,
      amount: action === "bid" ? amount : null,
      team: TEAMS[myTeamIndex].shortName,
      lot_number: currentLot.lotNumber,
    });
  } catch (error: any) {
    console.error("External bid error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
