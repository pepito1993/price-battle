import {
  PythLazerClient,
  type JsonOrBinaryResponse,
  type Response,
  type ParsedPayload,
  type ParsedFeedPayload,
  type SymbolResponse,
} from "@pythnetwork/pyth-lazer-sdk";
import { DataSource } from "./base.js";
import type { PriceUpdate, SymbolInfo } from "../types.js";

const FEED_MAP: Record<number, { symbol: string; pythSymbol: string }> = {
  1: { symbol: "BTCUSD", pythSymbol: "Crypto.BTC/USD" },
  2: { symbol: "ETHUSD", pythSymbol: "Crypto.ETH/USD" },
  3: { symbol: "PYTHUSD", pythSymbol: "Crypto.PYTH/USD" },
  5: { symbol: "SOLUSD", pythSymbol: "Crypto.SOL/USD" },
};

const WS_URLS = [
  "wss://pyth-lazer-0.dourolabs.app/v1/stream",
  "wss://pyth-lazer-1.dourolabs.app/v1/stream",
  "wss://pyth-lazer-2.dourolabs.app/v1/stream",
];

export class PythLazerSource extends DataSource {
  readonly name = "pyth-lazer";

  private client: PythLazerClient | null = null;
  private connected_ = false;
  private symbols: SymbolInfo[] = [];
  private feedIds: number[];

  constructor(
    private token: string,
    feedIds?: number[],
  ) {
    super();
    this.feedIds = feedIds ?? Object.keys(FEED_MAP).map(Number);
  }

  async connect(): Promise<void> {
    try {
      console.log("[Pyth Lazer] Connecting to WebSocket endpoints...");

      this.client = await PythLazerClient.create({
        token: this.token,
        webSocketPoolConfig: {
          urls: WS_URLS,
        },
      });

      // Fetch symbol metadata from the API
      await this.fetchSymbols();

      // Subscribe to price feeds
      this.client.subscribe({
        type: "subscribe",
        subscriptionId: 1,
        priceFeedIds: this.feedIds,
        properties: ["price", "bestBidPrice", "bestAskPrice", "confidence", "publisherCount", "exponent"],
        formats: ["leUnsigned"],
        deliveryFormat: "json",
        jsonBinaryEncoding: "base64",
        parsed: true,
        channel: "fixed_rate@200ms",
      });

      // Listen for messages — SDK returns JsonOrBinaryResponse
      this.client.addMessageListener((event: JsonOrBinaryResponse) => {
        if (event.type === "json") {
          this.handleJsonMessage(event.value);
        } else if (event.type === "binary" && event.value.parsed) {
          this.handleParsedPayload(event.value.parsed);
        }
      });

      // Handle all connections going down
      this.client.addAllConnectionsDownListener(() => {
        console.warn("[Pyth Lazer] All WebSocket connections are down");
        this.connected_ = false;
        this.emit("disconnected");
      });

      this.connected_ = true;
      this.emit("connected");
    } catch (err) {
      console.error("[Pyth Lazer] Connection error:", err);
      this.emit(
        "error",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  private async fetchSymbols(): Promise<void> {
    try {
      const apiSymbols: SymbolResponse[] = await this.client!.getSymbols();
      // Build symbol list from API, filtered to our feed IDs
      const feedIdSet = new Set(this.feedIds);
      this.symbols = apiSymbols
        .filter((s) => feedIdSet.has(s.pyth_lazer_id))
        .map((s) => ({
          id: s.pyth_lazer_id,
          symbol: FEED_MAP[s.pyth_lazer_id]?.symbol ?? s.name.replace("/", ""),
          pythSymbol: s.symbol,
          exponent: s.exponent,
        }));

      // Add any missing feed IDs from hardcoded map
      for (const id of this.feedIds) {
        if (!this.symbols.find((s) => s.id === id) && FEED_MAP[id]) {
          this.symbols.push({
            id,
            symbol: FEED_MAP[id].symbol,
            pythSymbol: FEED_MAP[id].pythSymbol,
            exponent: -8,
          });
        }
      }

      console.log(
        `[Pyth Lazer] Loaded ${this.symbols.length} symbols:`,
        this.symbols.map((s) => s.symbol).join(", "),
      );
    } catch (err) {
      console.warn("[Pyth Lazer] Could not fetch symbols from API, using hardcoded map:", err);
      // Fall back to hardcoded feed map
      this.symbols = this.feedIds
        .filter((id) => FEED_MAP[id])
        .map((id) => ({
          id,
          symbol: FEED_MAP[id].symbol,
          pythSymbol: FEED_MAP[id].pythSymbol,
          exponent: -8,
        }));
    }
  }

  private handleJsonMessage(response: Response): void {
    switch (response.type) {
      case "streamUpdated":
        if (response.parsed) {
          this.handleParsedPayload(response.parsed);
        }
        break;
      case "error":
        console.error("[Pyth Lazer] Server error:", response.error);
        this.emit("error", new Error(response.error));
        break;
      case "subscribed":
        console.log(`[Pyth Lazer] Subscribed (id: ${response.subscriptionId})`);
        break;
      case "subscriptionError":
        console.error(`[Pyth Lazer] Subscription error: ${response.error}`);
        this.emit("error", new Error(response.error));
        break;
    }
  }

  private handleParsedPayload(parsed: ParsedPayload): void {
    const timestampUs = String(parsed.timestampUs);
    // Convert microseconds to milliseconds
    const timestampMs =
      timestampUs.length > 13
        ? Math.floor(Number(timestampUs) / 1000)
        : Number(timestampUs);

    for (const feed of parsed.priceFeeds) {
      this.processFeed(feed, timestampMs);
    }
  }

  private processFeed(feed: ParsedFeedPayload, timestampMs: number): void {
    const feedId = feed.priceFeedId;
    const feedInfo = FEED_MAP[feedId];
    if (!feedInfo) return;

    // Get exponent from symbol metadata or feed data
    const symInfo = this.symbols.find((s) => s.id === feedId);
    const exponent = feed.exponent ?? symInfo?.exponent ?? -8;

    if (feed.price == null) return;

    const rawPrice = String(feed.price);
    // Convert integer mantissa + exponent → human-readable price
    let price: number;
    try {
      price = Number(BigInt(rawPrice)) * Math.pow(10, exponent);
    } catch {
      price = Number(rawPrice) * Math.pow(10, exponent);
    }

    const update: PriceUpdate = {
      source: this.name,
      symbol: feedInfo.symbol,
      price,
      timestamp: timestampMs,
      exponent,
      rawPrice,
      numPublishers: feed.publisherCount,
      confidence:
        feed.confidence != null
          ? Number(feed.confidence) * Math.pow(10, exponent)
          : undefined,
      bidPrice:
        feed.bestBidPrice != null
          ? Number(feed.bestBidPrice) * Math.pow(10, exponent)
          : undefined,
      askPrice:
        feed.bestAskPrice != null
          ? Number(feed.bestAskPrice) * Math.pow(10, exponent)
          : undefined,
    };

    // Update stored exponent
    if (symInfo && feed.exponent != null) {
      symInfo.exponent = feed.exponent;
    }

    this.emit("price", update);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.shutdown();
      this.client = null;
    }
    this.connected_ = false;
    this.emit("disconnected");
  }

  getSymbols(): SymbolInfo[] {
    return this.symbols;
  }

  isConnected(): boolean {
    return this.connected_;
  }
}
