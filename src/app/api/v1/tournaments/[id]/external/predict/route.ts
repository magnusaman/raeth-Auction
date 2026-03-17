import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/v1/tournaments/[id]/external/predict?token=xxx
// External agent submits a prediction for the current pending match
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const body = await req.json();
    const { prediction, confidence, margin, key_factors, reasoning } = body;

    if (!prediction) {
      return NextResponse.json({ error: "prediction (team short name) is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const config = JSON.parse(tournament.config || "{}");
    const externalSlots = config.externalSlots || {};

    // Verify token
    let agentIndex: string | null = null;
    for (const [idx, slot] of Object.entries(externalSlots) as [string, any][]) {
      if (slot.token === token) {
        agentIndex = idx;
        break;
      }
    }

    if (!agentIndex) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Store the external prediction response
    config.externalPredictionResponse = {
      agentIndex: parseInt(agentIndex),
      prediction,
      confidence: Math.max(0.5, Math.min(0.95, parseFloat(confidence) || 0.6)),
      margin: margin || "5 wickets",
      keyFactors: key_factors || ["External agent analysis"],
      reasoning: reasoning || "External agent prediction.",
    };

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { config: JSON.stringify(config) },
    });

    return NextResponse.json({
      success: true,
      message: "Prediction submitted",
    });
  } catch (error: any) {
    console.error("Tournament external predict error:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
