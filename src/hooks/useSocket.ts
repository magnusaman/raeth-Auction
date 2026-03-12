"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ path: "/api/socket", addTrailingSlash: false });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinAuction = useCallback((auctionId: string) => {
    socketRef.current?.emit("join:auction", auctionId);
  }, []);

  const leaveAuction = useCallback((auctionId: string) => {
    socketRef.current?.emit("leave:auction", auctionId);
  }, []);

  const joinTournament = useCallback((tournamentId: string) => {
    socketRef.current?.emit("join:tournament", tournamentId);
  }, []);

  const leaveTournament = useCallback((tournamentId: string) => {
    socketRef.current?.emit("leave:tournament", tournamentId);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    joinAuction,
    leaveAuction,
    joinTournament,
    leaveTournament,
  };
}
