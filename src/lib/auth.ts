import { NextRequest } from "next/server";
import { prisma } from "./db";

export async function authenticateAgent(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  const agent = await prisma.agent.findUnique({ where: { apiKey } });
  return agent;
}
