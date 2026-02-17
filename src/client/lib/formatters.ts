export function formatPrice(price: number): string {
  const decimals = price >= 100 ? 2 : price >= 1 ? 4 : 6;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function formatConfidence(confidence: number | undefined): string {
  if (confidence === undefined) return "---";
  if (confidence >= 1) return `\u00B1${confidence.toFixed(2)}`;
  return `\u00B1${confidence.toFixed(6)}`;
}
