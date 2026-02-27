interface PositionAlertState {
  maxBucket: number;
  minBucket: number;
}

// Price alert state: tracks highest/lowest 5% bucket seen per symbol
const alertState = new Map<string, PositionAlertState>();

// null = cold start (not yet initialized), Set = known symbols
let knownSymbols: Set<string> | null = null;

/**
 * Check price movement for a position and return an alert bucket if crossed.
 * Returns the currentBucket if a new extreme is crossed, otherwise null.
 */
export function checkPriceAlert(
  symbol: string,
  pricePct: number
): { bucket: number; direction: "up" | "down" } | null {
  const currentBucket = Math.floor(pricePct / 5);

  if (!alertState.has(symbol)) {
    alertState.set(symbol, { maxBucket: currentBucket, minBucket: currentBucket });
    return null;
  }

  const state = alertState.get(symbol)!;

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
 * Returns arrays of opened and closed symbols.
 * On cold start (knownSymbols === null), initializes state without alerting.
 */
export function detectPositionChanges(currentSymbols: string[]): {
  opened: string[];
  closed: string[];
  isColdStart: boolean;
} {
  const currentSet = new Set(currentSymbols);

  if (knownSymbols === null) {
    knownSymbols = currentSet;
    return { opened: [], closed: [], isColdStart: true };
  }

  const opened = currentSymbols.filter((s) => !knownSymbols!.has(s));
  const closed = Array.from(knownSymbols).filter((s) => !currentSet.has(s));

  knownSymbols = currentSet;
  return { opened, closed, isColdStart: false };
}

/**
 * Remove price alert state for a closed position.
 */
export function clearAlertState(symbol: string): void {
  alertState.delete(symbol);
}
