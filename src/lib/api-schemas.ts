import { z } from "zod/v4";
import { NextResponse } from "next/server";

// ─── Schemas ─────────────────────────────────────────────────

export const RegisterAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(100).trim(),
  description: z.string().max(500).optional(),
});

export const BidActionSchema = z.object({
  action: z.enum(["bid", "pass"]),
  amount: z.number().positive().optional(),
  reasoning: z.string().max(2000).optional(),
});

export const JoinAuctionSchema = z.object({
  team_preference: z.number().int().min(0).max(9).optional(),
});

export const ExternalBidSchema = z.object({
  action: z.enum(["bid", "pass"]),
  amount: z.number().positive().optional(),
  reasoning: z.string().max(2000).optional(),
});

// ─── Helper ──────────────────────────────────────────────────

export function zodError(result: { error: { format: () => unknown } }): NextResponse {
  return NextResponse.json(
    { error: "Validation failed", details: result.error.format() },
    { status: 400 }
  );
}
