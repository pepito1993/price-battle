import { useRef, useEffect, useState } from "react";
import {
  formatPrice,
  formatConfidence,
  formatTimestamp,
} from "../lib/formatters.js";
import type { PriceUpdate } from "../hooks/types.js";

interface PriceTableProps {
  prices: Map<string, PriceUpdate>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export function PriceTable({
  prices,
  selectedSymbol,
  onSelectSymbol,
}: PriceTableProps) {
  const prevPrices = useRef<Map<string, number>>(new Map());
  const [flashState, setFlashState] = useState<Map<string, "up" | "down">>(
    new Map(),
  );

  useEffect(() => {
    const newFlash = new Map<string, "up" | "down">();
    for (const [sym, update] of prices) {
      const prev = prevPrices.current.get(sym);
      if (prev !== undefined && prev !== update.price) {
        newFlash.set(sym, update.price > prev ? "up" : "down");
      }
      prevPrices.current.set(sym, update.price);
    }
    if (newFlash.size > 0) {
      setFlashState(newFlash);
      const timer = setTimeout(() => setFlashState(new Map()), 300);
      return () => clearTimeout(timer);
    }
  }, [prices]);

  if (prices.size === 0) {
    return (
      <div className="bg-pyth-surface rounded-lg border border-pyth-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-pyth-text-dim uppercase tracking-wider">
          Live Prices
        </h2>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-pyth-surface rounded-lg border border-pyth-border p-4">
      <h2 className="text-sm font-semibold text-pyth-text-dim uppercase tracking-wider mb-3">
        Live Prices
      </h2>
      <div className="space-y-2">
        {Array.from(prices.entries()).map(([symbol, update]) => {
          const flash = flashState.get(symbol);
          return (
            <button
              key={symbol}
              onClick={() => onSelectSymbol(symbol)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                symbol === selectedSymbol
                  ? "bg-pyth-purple/20 border border-pyth-purple/30"
                  : "hover:bg-pyth-surface-light border border-transparent"
              } ${flash === "up" ? "price-up" : flash === "down" ? "price-down" : ""}`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-white text-sm">
                  {symbol}
                </span>
                <span
                  className={`font-mono text-sm ${
                    flash === "up"
                      ? "text-pyth-green"
                      : flash === "down"
                        ? "text-pyth-red"
                        : "text-white"
                  }`}
                >
                  ${formatPrice(update.price)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-pyth-text-dim">
                  {formatConfidence(update.confidence)}
                </span>
                <span className="text-xs text-pyth-text-dim">
                  {update.numPublishers ?? "?"} pubs
                </span>
              </div>
              <div className="text-xs text-pyth-text-dim mt-0.5">
                {formatTimestamp(update.timestamp)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
