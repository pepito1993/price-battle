import { DataSource } from "./base.js";
import type { SymbolInfo } from "../types.js";

export class ChainlinkSource extends DataSource {
  readonly name = "chainlink";

  async connect(): Promise<void> {
    console.log("[Chainlink] Not yet configured — needs API credentials");
    console.log("[Chainlink] Future: Chainlink Data Streams WebSocket connection");
    console.log("[Chainlink] Requires: CHAINLINK_API_KEY and CHAINLINK_API_SECRET in .env");
    // Future: HMAC signature auth on each request
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  getSymbols(): SymbolInfo[] {
    return [];
  }

  isConnected(): boolean {
    return false;
  }
}
