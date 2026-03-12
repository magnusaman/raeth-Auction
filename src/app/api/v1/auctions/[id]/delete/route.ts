import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/v1/auctions/[id]/delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascade delete handles all related records
    await prisma.auction.delete({ where: { id } });

    return NextResponse.json({ message: "Auction deleted", id });
  } catch (error: any) {
    console.error("Delete auction error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
