import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// POST /api/v1/auctions/[id]/external/register
// Register an external agent slot for a specific team index (generates token on demand)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const body = await req.json();
    const { team_index } = body;

    if (team_index === undefined || team_index === null) {
      return NextResponse.json({ error: "team_index is required" }, { status: 400 });
    }

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    if (auction.status !== "LOBBY") {
      return NextResponse.json({ error: "Auction already started" }, { status: 400 });
    }

    const config = JSON.parse(auction.config || "{}");
    const externalSlots: Record<string, { token: string; connected?: boolean; connectedAt?: string }> = config.externalSlots || {};

    // Check if slot already has a token
    const existing = externalSlots[String(team_index)];
    if (existing?.token) {
      return NextResponse.json({
        token: existing.token,
        team_index,
        already_registered: true,
      });
    }

    // Generate new token
    const token = crypto.randomBytes(16).toString("hex");
    externalSlots[String(team_index)] = { token };
    config.externalSlots = externalSlots;

    await prisma.auction.update({
      where: { id: auctionId },
      data: { config: JSON.stringify(config) },
    });

    return NextResponse.json({
      token,
      team_index,
      already_registered: false,
    });
  } catch (error: any) {
    console.error("External register error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
