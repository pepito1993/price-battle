import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { AssetSelector } from "./components/AssetSelector.js";
import { PriceChart } from "./components/PriceChart.js";
import { PriceTable } from "./components/PriceTable.js";
import { ConnectionStatus } from "./components/ConnectionStatus.js";
import { SourceToggle } from "./components/SourceToggle.js";
import { DEFAULT_SYMBOL } from "./lib/constants.js";

export default function App() {
  const ws = useWebSocket();
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);

  return (
    <div className="min-h-screen bg-pyth-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-pyth-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Price Battle
          </h1>
          <SourceToggle />
        </div>
        <div className="flex items-center gap-4">
          <AssetSelector
            symbols={ws.symbols}
            selected={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
          <ConnectionStatus
            wsConnected={ws.isConnected}
            sourceConnected={ws.sourceConnected}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Chart — 3/4 width on large screens */}
        <div className="lg:col-span-3 bg-pyth-surface rounded-lg border border-pyth-border overflow-hidden flex flex-col">
          <PriceChart
            symbol={selectedSymbol}
            onPrice={ws.onPrice}
            requestHistory={ws.requestHistory}
            onHistory={ws.onHistory}
            currentPrice={ws.prices.get(selectedSymbol)}
          />
        </div>

        {/* Price Table — 1/4 width */}
        <div className="lg:col-span-1">
          <PriceTable
            prices={ws.prices}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
          />
        </div>
      </main>
    </div>
  );
}
