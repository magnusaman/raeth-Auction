import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/v1/tournaments/[id]/delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascade delete handles all related records
    await prisma.tournament.delete({ where: { id } });

    return NextResponse.json({ message: "Tournament deleted", id });
  } catch (error: any) {
    console.error("Delete tournament error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
