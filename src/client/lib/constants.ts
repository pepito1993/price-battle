export const WS_URL = import.meta.env.DEV
  ? `ws://${window.location.hostname}:5173/ws`
  : `ws://${window.location.host}/ws`;

export const API_BASE = "";

export const CHART_COLORS = {
  background: "#0f0f1a",
  text: "#8899aa",
  grid: "#1f2b47",
  upColor: "#00ff88",
  downColor: "#ff4466",
  crosshair: "#7142CF",
  border: "#2a3a5c",
  confidence: "rgba(113, 66, 207, 0.15)",
} as const;

export type Resolution = { label: string; seconds: number };

export const RESOLUTIONS: Resolution[] = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
];

export const DEFAULT_SYMBOL = "BTCUSD";
