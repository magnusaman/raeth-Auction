import { NextRequest } from "next/server";

// Socket.io needs to hijack the HTTP connection for WebSocket upgrades.
// In Next.js App Router, socket.io is initialized via instrumentation.ts
// when the server starts. This route exists so that the /api/socket path
// is recognized by Next.js routing — socket.io handles the actual
// upgrade handshake at this path.
export async function GET(req: NextRequest) {
  return new Response("Socket.io endpoint", { status: 200 });
}
