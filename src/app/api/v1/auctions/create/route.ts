import { NextResponse } from "next/server";
import { createAuction } from "@/lib/auction-engine";

export async function POST() {
  try {
    const auctionId = await createAuction();
    return NextResponse.json({
      auction_id: auctionId,
      message: "Auction created. Agents can now join.",
    });
  } catch (error) {
    console.error("Create auction error:", error);
    return NextResponse.json(
      { error: "Failed to create auction" },
      { status: 500 }
    );
  }
}
