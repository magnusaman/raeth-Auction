import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { getAuctionState } from "@/lib/auction-engine";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auctionId } = await params;

    // Find this agent's team in the auction
    const team = await prisma.auctionTeam.findFirst({
      where: { auctionId, agentId: agent.id },
    });

    if (!team) {
      return NextResponse.json(
        { error: "You haven't joined this auction" },
        { status: 403 }
      );
    }

    const state = await getAuctionState(auctionId, team.id);
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to get state" },
      { status: 500 }
    );
  }
}
