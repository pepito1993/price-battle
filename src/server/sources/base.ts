import { EventEmitter } from "events";
import type { PriceUpdate, SymbolInfo } from "../types.js";

export interface DataSourceEvents {
  price: (update: PriceUpdate) => void;
  connected: () => void;
  disconnected: () => void;
  error: (err: Error) => void;
}

export abstract class DataSource extends EventEmitter {
  abstract readonly name: string;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getSymbols(): SymbolInfo[];
  abstract isConnected(): boolean;

  override emit<K extends keyof DataSourceEvents>(
    event: K,
    ...args: Parameters<DataSourceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof DataSourceEvents>(
    event: K,
    listener: DataSourceEvents[K],
  ): this {
    return super.on(event, listener);
  }
}
