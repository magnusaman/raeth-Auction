import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "auctionbench", version: "1.0.0" });
}
