import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// POST /api/v1/tournaments/[id]/external/register
// Register an external agent slot — generates API token for predictions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { agent_index, agent_name } = body;

    if (agent_index === undefined || agent_index === null) {
      return NextResponse.json({ error: "agent_index is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const config = JSON.parse(tournament.config || "{}");
    const externalSlots: Record<string, { token: string; agentName: string; connected?: boolean }> =
      config.externalSlots || {};

    // Check if slot already has a token
    const existing = externalSlots[String(agent_index)];
    if (existing?.token) {
      return NextResponse.json({
        token: existing.token,
        agent_index,
        already_registered: true,
      });
    }

    // Generate new token
    const token = crypto.randomBytes(16).toString("hex");
    externalSlots[String(agent_index)] = { token, agentName: agent_name || `External-Agent-${agent_index}` };
    config.externalSlots = externalSlots;

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { config: JSON.stringify(config) },
    });

    return NextResponse.json({
      token,
      agent_index,
      already_registered: false,
    });
  } catch (error: any) {
    console.error("Tournament external register error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
