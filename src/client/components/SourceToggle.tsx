export function SourceToggle() {
  return (
    <div className="flex items-center gap-1 text-xs">
      <button className="px-2 py-1 rounded bg-pyth-purple/20 text-pyth-purple-light font-semibold border border-pyth-purple/30">
        Pyth Pro
      </button>
      <button
        className="px-2 py-1 rounded text-pyth-text-dim opacity-40 cursor-not-allowed border border-transparent"
        disabled
        title="Coming soon"
      >
        Chainlink
      </button>
    </div>
  );
}
