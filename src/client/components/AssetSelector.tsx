import type { SymbolInfo } from "../hooks/types.js";

interface AssetSelectorProps {
  symbols: SymbolInfo[];
  selected: string;
  onSelect: (symbol: string) => void;
}

export function AssetSelector({
  symbols,
  selected,
  onSelect,
}: AssetSelectorProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-pyth-surface border border-pyth-border text-white text-sm
                 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1
                 focus:ring-pyth-purple appearance-none cursor-pointer"
    >
      {symbols.length === 0 && <option value={selected}>{selected}</option>}
      {symbols.map((s) => (
        <option key={s.symbol} value={s.symbol}>
          {s.symbol}
        </option>
      ))}
    </select>
  );
}
