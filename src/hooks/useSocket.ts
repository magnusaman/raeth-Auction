"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io({ path: "/api/socket", addTrailingSlash: false });
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
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
    connected,
    joinAuction,
    leaveAuction,
    joinTournament,
    leaveTournament,
  };
}
