import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/v1/tournaments/[id]/external/state?token=xxx
// External agent polls this to check status and get current match prompt
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const config = JSON.parse(tournament.config || "{}");
    const externalSlots = config.externalSlots || {};

    const isCheckOnly = req.nextUrl.searchParams.get("check") === "1";

    // Find the agent slot that matches this token
    let agentIndex: string | null = null;
    for (const [idx, slot] of Object.entries(externalSlots) as [string, any][]) {
      if (slot.token === token) {
        agentIndex = idx;
        // Mark as connected on first poll from actual external agent (not frontend check)
        if (!slot.connected && !isCheckOnly) {
          slot.connected = true;
          slot.connectedAt = new Date().toISOString();
          config.externalSlots = externalSlots;
          await prisma.tournament.update({
            where: { id: tournamentId },
            data: { config: JSON.stringify(config) },
          });
        }
        break;
      }
    }

    if (!agentIndex) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Check if there's a pending prediction request for this agent
    const pending = config.pendingExternalPrediction;
    const hasPending =
      pending && pending.agentIndex === parseInt(agentIndex);

    return NextResponse.json({
      status: tournament.status,
      agent_index: parseInt(agentIndex),
      agent_name: externalSlots[agentIndex].agentName,
      connected: !!externalSlots[agentIndex].connected,
      pending_prediction: hasPending
        ? {
            match_id: pending.matchId,
            match_number: pending.matchNumber,
            prompt: pending.prompt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Tournament external state error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
