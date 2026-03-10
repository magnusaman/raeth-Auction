import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/v1/tournaments/[id]/stop — Cancel a running prediction
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (tournament.status !== "PREDICTING") {
      return NextResponse.json({ error: "Tournament is not currently predicting" }, { status: 400 });
    }

    await prisma.tournament.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Tournament predictions cancelled", id });
  } catch (error: any) {
    console.error("Stop tournament error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
