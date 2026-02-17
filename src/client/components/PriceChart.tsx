import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { CHART_COLORS, RESOLUTIONS } from "../lib/constants.js";
import { formatPrice } from "../lib/formatters.js";
import type { PriceUpdate, OHLCBar } from "../hooks/types.js";

interface PriceChartProps {
  symbol: string;
  onPrice: (cb: (update: PriceUpdate) => void) => () => void;
  requestHistory: (symbol: string, resolution: string) => void;
  onHistory: (cb: (symbol: string, bars: OHLCBar[]) => void) => () => void;
  currentPrice?: PriceUpdate;
}

export function PriceChart({
  symbol,
  onPrice,
  requestHistory,
  onHistory,
  currentPrice,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);
  const currentBarRef = useRef<CandlestickData<Time> | null>(null);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
        fontFamily: '"JetBrains Mono", monospace',
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        vertLine: {
          color: CHART_COLORS.crosshair,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
        horzLine: {
          color: CHART_COLORS.crosshair,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
      },
      rightPriceScale: { borderColor: CHART_COLORS.border },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderVisible: false,
      wickUpColor: CHART_COLORS.upColor,
      wickDownColor: CHART_COLORS.downColor,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // Request history when symbol or resolution changes
  useEffect(() => {
    requestHistory(symbol, String(resolution.seconds));
    currentBarRef.current = null;
  }, [symbol, resolution, requestHistory]);

  // Listen for history responses
  useEffect(() => {
    return onHistory((histSymbol, bars) => {
      if (histSymbol.toUpperCase() !== symbol.toUpperCase()) return;
      if (!candleSeriesRef.current) return;

      const chartData: CandlestickData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));

      candleSeriesRef.current.setData(chartData);
      if (chartData.length > 0) {
        currentBarRef.current = chartData[chartData.length - 1];
      }
      chartRef.current?.timeScale().fitContent();
    });
  }, [symbol, onHistory]);

  // Listen for real-time price updates
  useEffect(() => {
    return onPrice((update) => {
      if (update.symbol !== symbol) return;
      if (!candleSeriesRef.current) return;

      const barTime = (Math.floor(
        update.timestamp / 1000 / resolution.seconds,
      ) * resolution.seconds) as Time;

      const current = currentBarRef.current;

      if (current && current.time === barTime) {
        // Update existing bar
        current.high = Math.max(current.high, update.price);
        current.low = Math.min(current.low, update.price);
        current.close = update.price;
        candleSeriesRef.current.update(current);
      } else {
        // New bar
        const newBar: CandlestickData<Time> = {
          time: barTime,
          open: update.price,
          high: update.price,
          low: update.price,
          close: update.price,
        };
        currentBarRef.current = newBar;
        candleSeriesRef.current.update(newBar);
      }
    });
  }, [symbol, resolution, onPrice]);

  return (
    <div className="flex flex-col h-full">
      {/* Chart toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-pyth-border">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{symbol}</span>
          {currentPrice && (
            <span className="text-pyth-purple-light font-mono text-lg">
              ${formatPrice(currentPrice.price)}
            </span>
          )}
          {currentPrice?.confidence != null && (
            <span className="text-pyth-text-dim text-xs">
              &plusmn;{currentPrice.confidence.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => setResolution(r)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                resolution.label === r.label
                  ? "bg-pyth-purple text-white"
                  : "text-pyth-text-dim hover:text-white hover:bg-pyth-surface-light"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="flex-1 min-h-[400px]" />
    </div>
  );
}
