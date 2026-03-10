/**
 * Exchange adapter factory.
 *
 * Creates the appropriate exchange client based on the exchange name
 * and provided credentials. Credentials are transient — only used
 * for the duration of the API call, then discarded.
 */

import type { ExchangeClient, ExchangeCredentials, ExchangeName } from "./types";
import { createBinanceAdapter } from "./binance";
import { createOKXAdapter } from "./okx";
import { createBybitAdapter } from "./bybit";
import { createUpbitAdapter } from "./upbit";
import { createBithumbAdapter } from "./bithumb";

export { type ExchangeName, type ExchangeClient, type ExchangeCredentials } from "./types";

const ADAPTERS: Record<ExchangeName, (creds: ExchangeCredentials) => ExchangeClient> = {
  binance: createBinanceAdapter,
  okx: createOKXAdapter,
  bybit: createBybitAdapter,
  upbit: createUpbitAdapter,
  bithumb: createBithumbAdapter,
};

/**
 * Create an exchange client for the given exchange.
 *
 * @param exchange - The exchange to create a client for
 * @param credentials - API credentials (transient, discarded after use)
 * @returns ExchangeClient instance
 * @throws Error if exchange is not supported
 */
export function createExchangeClient(
  exchange: ExchangeName,
  credentials: ExchangeCredentials,
): ExchangeClient {
  const factory = ADAPTERS[exchange];
  if (!factory) {
    throw new Error(`Unsupported exchange: ${exchange}`);
  }
  return factory(credentials);
}

/** List of all supported exchanges */
export const SUPPORTED_EXCHANGES: ExchangeName[] = ["binance", "okx", "bybit", "upbit", "bithumb"];

/** Exchange display info */
export const EXCHANGE_INFO: Record<ExchangeName, { label: string; color: string; needsPassphrase: boolean }> = {
  binance: { label: "Binance Futures", color: "#F0B90B", needsPassphrase: false },
  okx: { label: "OKX", color: "#FFFFFF", needsPassphrase: true },
  bybit: { label: "Bybit", color: "#F7A600", needsPassphrase: false },
  upbit: { label: "Upbit", color: "#093687", needsPassphrase: false },
  bithumb: { label: "Bithumb", color: "#F28C28", needsPassphrase: false },
};
