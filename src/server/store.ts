import type { PriceUpdate, OHLCBar } from "./types.js";

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES_PER_SYMBOL = 18_000; // ~1hr at 200ms intervals

export class PriceStore {
  private data = new Map<string, PriceUpdate[]>();
  private latestPrices = new Map<string, PriceUpdate>();

  add(update: PriceUpdate): void {
    const key = `${update.source}:${update.symbol}`;

    if (!this.data.has(key)) {
      this.data.set(key, []);
    }

    const arr = this.data.get(key)!;
    arr.push(update);

    // Ring buffer: trim if too large
    if (arr.length > MAX_ENTRIES_PER_SYMBOL) {
      arr.splice(0, arr.length - MAX_ENTRIES_PER_SYMBOL);
    }

    // Trim by age
    const cutoff = Date.now() - MAX_AGE_MS;
    while (arr.length > 0 && arr[0].timestamp < cutoff) {
      arr.shift();
    }

    this.latestPrices.set(update.symbol, update);
  }

  getHistory(source: string, symbol: string): PriceUpdate[] {
    return this.data.get(`${source}:${symbol}`) ?? [];
  }

  getLatest(symbol: string): PriceUpdate | undefined {
    return this.latestPrices.get(symbol);
  }

  getAllLatest(): PriceUpdate[] {
    return Array.from(this.latestPrices.values());
  }

  /**
   * Aggregate tick data into OHLC bars.
   * @param resolution Bar width in seconds (e.g. 60 for 1m bars)
   */
  getOHLC(source: string, symbol: string, resolution = 60): OHLCBar[] {
    const ticks = this.getHistory(source, symbol);
    if (ticks.length === 0) return [];

    const bars: OHLCBar[] = [];
    let currentBarTime =
      Math.floor(ticks[0].timestamp / 1000 / resolution) * resolution;
    let open = ticks[0].price;
    let high = ticks[0].price;
    let low = ticks[0].price;
    let close = ticks[0].price;

    for (const tick of ticks) {
      const barTime =
        Math.floor(tick.timestamp / 1000 / resolution) * resolution;

      if (barTime !== currentBarTime) {
        bars.push({ time: currentBarTime, open, high, low, close });
        currentBarTime = barTime;
        open = tick.price;
        high = tick.price;
        low = tick.price;
        close = tick.price;
      } else {
        high = Math.max(high, tick.price);
        low = Math.min(low, tick.price);
        close = tick.price;
      }
    }

    // Push the last bar
    bars.push({ time: currentBarTime, open, high, low, close });
    return bars;
  }
}
