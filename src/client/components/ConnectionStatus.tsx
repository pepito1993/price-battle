interface ConnectionStatusProps {
  wsConnected: boolean;
  sourceConnected: boolean;
}

export function ConnectionStatus({
  wsConnected,
  sourceConnected,
}: ConnectionStatusProps) {
  const allGood = wsConnected && sourceConnected;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            allGood
              ? "bg-pyth-green shadow-[0_0_6px_rgba(0,255,136,0.5)]"
              : wsConnected
                ? "bg-yellow-500"
                : "bg-pyth-red shadow-[0_0_6px_rgba(255,68,102,0.5)]"
          }`}
        />
        <span className="text-pyth-text-dim">
          {allGood
            ? "Live"
            : wsConnected
              ? "Connecting to source..."
              : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
