import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "../lib/constants.js";
import type { PriceUpdate, OHLCBar, SymbolInfo } from "./types.js";

type ServerMessage =
  | { type: "price"; data: PriceUpdate }
  | { type: "history"; symbol: string; bars: OHLCBar[] }
  | { type: "symbols"; data: SymbolInfo[] }
  | { type: "status"; connected: boolean; source: string }
  | { type: "error"; message: string };

export interface UseWebSocketReturn {
  prices: Map<string, PriceUpdate>;
  symbols: SymbolInfo[];
  isConnected: boolean;
  sourceConnected: boolean;
  requestHistory: (symbol: string, resolution: string) => void;
  onHistory: (cb: (symbol: string, bars: OHLCBar[]) => void) => () => void;
  onPrice: (cb: (update: PriceUpdate) => void) => () => void;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [isConnected, setIsConnected] = useState(false);
  const [sourceConnected, setSourceConnected] = useState(false);
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);

  const historyCallbacks = useRef<
    Set<(symbol: string, bars: OHLCBar[]) => void>
  >(new Set());
  const priceCallbacks = useRef<Set<(update: PriceUpdate) => void>>(
    new Set(),
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected to server");
      setIsConnected(true);
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "price":
            setPrices((prev) => {
              const next = new Map(prev);
              next.set(msg.data.symbol, msg.data);
              return next;
            });
            for (const cb of priceCallbacks.current) cb(msg.data);
            break;

          case "history":
            for (const cb of historyCallbacks.current)
              cb(msg.symbol, msg.bars);
            break;

          case "symbols":
            setSymbols(msg.data);
            break;

          case "status":
            setSourceConnected(msg.connected);
            break;

          case "error":
            console.warn("[WS] Server error:", msg.message);
            break;
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected from server");
      setIsConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    const delay =
      RECONNECT_DELAYS[
        Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
      ];
    console.log(`[WS] Reconnecting in ${delay}ms...`);
    reconnectAttempt.current++;
    reconnectTimer.current = setTimeout(connect, delay);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const requestHistory = useCallback(
    (symbol: string, resolution: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "getHistory", symbol, resolution }),
        );
      }
    },
    [],
  );

  const onHistory = useCallback(
    (cb: (symbol: string, bars: OHLCBar[]) => void) => {
      historyCallbacks.current.add(cb);
      return () => {
        historyCallbacks.current.delete(cb);
      };
    },
    [],
  );

  const onPrice = useCallback((cb: (update: PriceUpdate) => void) => {
    priceCallbacks.current.add(cb);
    return () => {
      priceCallbacks.current.delete(cb);
    };
  }, []);

  return {
    prices,
    symbols,
    isConnected,
    sourceConnected,
    requestHistory,
    onHistory,
    onPrice,
  };
}
