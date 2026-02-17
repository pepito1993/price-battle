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
  time: number;
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
