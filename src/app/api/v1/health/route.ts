import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      service: "raeth-arena",
      version: "1.0.0",
      db: "connected",
      dbLatencyMs,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", service: "raeth-arena", db: "disconnected" },
      { status: 503 }
    );
  }
}
