import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { processBid } from "@/lib/auction-engine";
import { prisma } from "@/lib/db";
import { BidActionSchema, zodError } from "@/lib/api-schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auctionId } = await params;
    const body = await req.json();
    const parsed = BidActionSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed);

    // Find this agent's team
    const team = await prisma.auctionTeam.findFirst({
      where: { auctionId, agentId: agent.id },
    });

    if (!team) {
      return NextResponse.json(
        { error: "You haven't joined this auction" },
        { status: 403 }
      );
    }

    const result = await processBid(auctionId, team.id, {
      action: parsed.data.action,
      amount: parsed.data.amount,
      reasoning: parsed.data.reasoning,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      new_bid_amount: result.newBidAmount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process bid" },
      { status: 500 }
    );
  }
}
