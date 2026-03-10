import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { joinAuction } from "@/lib/auction-engine";
import { TEAMS } from "@/data/team-config";

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
    const teamPreference = body.team_preference;

    const { teamId, teamIndex } = await joinAuction(
      auctionId,
      agent.id,
      teamPreference
    );

    return NextResponse.json({
      team_id: teamId,
      team_index: teamIndex,
      team_name: TEAMS[teamIndex].name,
      team_color: TEAMS[teamIndex].color,
      message: `Joined as ${TEAMS[teamIndex].name}`,
    });
  } catch (error: any) {
    const msg = error?.message || "Failed to join";
    const status = msg.includes("not found") ? 404 : msg.includes("full") || msg.includes("started") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
