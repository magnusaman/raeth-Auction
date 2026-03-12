import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function getIO(): SocketServer | null {
  return io;
}

export function initIO(httpServer: any): SocketServer {
  if (io) return io;

  io = new SocketServer(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on("join:auction", (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on("join:tournament", (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on("leave:auction", (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
    });

    socket.on("leave:tournament", (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitAuctionEvent(
  auctionId: string,
  event: string,
  data: any
) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit(event, data);
}

export function emitTournamentEvent(
  tournamentId: string,
  event: string,
  data: any
) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit(event, data);
}
