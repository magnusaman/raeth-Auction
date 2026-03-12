"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ConnectionState {
  status: "connecting" | "connected" | "reconnecting" | "disconnected";
  retryCount: number;
}

export function useAuctionStream<T>(
  auctionId: string,
  onData: (data: T) => void
) {
  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
    retryCount: 0,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const fallbackPoll = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/auctions/${auctionId}/live`);
        const data = await res.json();
        onDataRef.current(data);
        setConnection({ status: "connected", retryCount: 0 });

        if (data.status === "COMPLETED" || data.status === "STOPPED") {
          clearInterval(interval);
        }
      } catch {
        setConnection((prev) => ({
          status: "reconnecting",
          retryCount: prev.retryCount + 1,
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [auctionId]);

  const connect = useCallback(() => {
    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource(`/api/v1/auctions/${auctionId}/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        retryCountRef.current = 0;
        setConnection({ status: "connected", retryCount: 0 });
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error("Stream error:", data.error);
            return;
          }
          retryCountRef.current = 0;
          setConnection({ status: "connected", retryCount: 0 });
          onDataRef.current(data);
        } catch (e) {
          console.error("Parse error:", e);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        const retryCount = retryCountRef.current + 1;
        retryCountRef.current = retryCount;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 15000);

        setConnection({ status: "reconnecting", retryCount });

        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      // SSE not supported, fall back to polling
      fallbackPoll();
    }
  }, [auctionId, fallbackPoll]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setConnection({ status: "disconnected", retryCount: 0 });
  }, []);

  return { connection, disconnect, reconnect: connect };
}
