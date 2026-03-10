import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 }
      );
    }

    // Check if name taken
    const existing = await prisma.agent.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Agent name already taken" },
        { status: 409 }
      );
    }

    const apiKey = `ab_${createId()}`;

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        description: description || "",
        apiKey,
      },
    });

    return NextResponse.json({
      agent_id: agent.id,
      name: agent.name,
      api_key: apiKey,
      message: "Agent registered successfully. Use this API key to authenticate.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
