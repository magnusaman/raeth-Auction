import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/v1/auctions/[id]/stop — Stop a running auction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (auction.status !== "RUNNING") {
      return NextResponse.json({ error: "Auction is not running" }, { status: 400 });
    }

    // Set status to STOPPED — the bidding loop checks this and will exit
    await prisma.auction.update({
      where: { id },
      data: { status: "STOPPED", completedAt: new Date() },
    });

    return NextResponse.json({ message: "Auction stopped", status: "STOPPED" });
  } catch (error: any) {
    console.error("Stop auction error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
