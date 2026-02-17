export interface PriceUpdate {
  source: string;
  symbol: string;
  price: number;
  confidence?: number;
  timestamp: number;
  numPublishers?: number;
  exponent?: number;
  rawPrice?: string;
  bidPrice?: number;
  askPrice?: number;
}

export interface OHLCBar {
  time: number; // Unix seconds (lightweight-charts format)
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SymbolInfo {
  id: number;
  symbol: string;
  pythSymbol: string;
  exponent: number;
}

// Server → Client messages
export type ServerMessage =
  | { type: "price"; data: PriceUpdate }
  | { type: "history"; symbol: string; bars: OHLCBar[] }
  | { type: "symbols"; data: SymbolInfo[] }
  | { type: "status"; connected: boolean; source: string }
  | { type: "error"; message: string };

// Client → Server messages
export type ClientMessage =
  | { type: "subscribe"; symbols: string[] }
  | { type: "unsubscribe"; symbols: string[] }
  | { type: "getHistory"; symbol: string; resolution: string };
