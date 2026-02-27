interface PositionAlertState {
  maxBucket: number;
  minBucket: number;
}

// Price alert state keyed as `${namespace}:${symbol}`
const alertState = new Map<string, PositionAlertState>();

// Known symbols keyed by namespace; null = cold start
const knownSymbolsMap = new Map<string, Set<string> | null>();

/**
 * Check price movement for a position and return an alert if a new 5% bucket is crossed.
 */
export function checkPriceAlert(
  symbol: string,
  pricePct: number,
  namespace = "default"
): { bucket: number; direction: "up" | "down" } | null {
  const key = `${namespace}:${symbol}`;
  const currentBucket = Math.floor(pricePct / 5);

  if (!alertState.has(key)) {
    alertState.set(key, { maxBucket: currentBucket, minBucket: currentBucket });
    return null;
  }

  const state = alertState.get(key)!;

  if (currentBucket > state.maxBucket) {
    state.maxBucket = currentBucket;
    return { bucket: currentBucket, direction: "up" };
  }

  if (currentBucket < state.minBucket) {
    state.minBucket = currentBucket;
    return { bucket: currentBucket, direction: "down" };
  }

  return null;
}

/**
 * Detect newly opened or closed positions.
 * On cold start, initializes state without alerting.
 */
export function detectPositionChanges(
  currentSymbols: string[],
  namespace = "default"
): {
  opened: string[];
  closed: string[];
  isColdStart: boolean;
} {
  const currentSet = new Set(currentSymbols);
  const knownSymbols = knownSymbolsMap.has(namespace)
    ? knownSymbolsMap.get(namespace)!
    : null;

  if (knownSymbols === null) {
    knownSymbolsMap.set(namespace, currentSet);
    return { opened: [], closed: [], isColdStart: true };
  }

  const opened = currentSymbols.filter((s) => !knownSymbols.has(s));
  const closed = Array.from(knownSymbols).filter((s) => !currentSet.has(s));

  knownSymbolsMap.set(namespace, currentSet);
  return { opened, closed, isColdStart: false };
}

/**
 * Remove price alert state for a closed position.
 */
export function clearAlertState(symbol: string, namespace = "default"): void {
  alertState.delete(`${namespace}:${symbol}`);
}
