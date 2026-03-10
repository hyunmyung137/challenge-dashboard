/**
 * Standardized exchange interfaces.
 * All exchange adapters normalize their responses to these types.
 */

export type ExchangeName = "binance" | "okx" | "bybit" | "upbit" | "bithumb";

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // Required for OKX
}

export interface StandardBalance {
  exchange: ExchangeName;
  totalBalance: number; // Total wallet/account balance in USD
  availableBalance: number; // Available for trading
  unrealizedPnl: number; // Total unrealized PNL
  currency: string; // 'USD' | 'KRW'
}

export interface StandardPosition {
  exchange: ExchangeName;
  symbol: string; // e.g., "BTCUSDT"
  side: "LONG" | "SHORT" | "SPOT";
  size: number; // Position quantity
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  roe: number; // Return on equity (percentage)
  leverage: number;
  marginType: "cross" | "isolated" | "spot";
  notionalValue: number; // size * markPrice
}

export interface StandardIncome {
  exchange: ExchangeName;
  symbol: string;
  incomeType: string;
  income: number;
  asset: string;
  time: number; // Unix timestamp ms
}

export interface StandardClosedPosition {
  exchange: ExchangeName;
  symbol: string;
  side: "LONG" | "SHORT" | "SPOT";
  openDate: string;
  closeDate: string;
  openTime: number;
  closeTime: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
}

/**
 * Unified exchange client interface.
 * Each exchange adapter implements this interface.
 */
export interface ExchangeClient {
  readonly exchange: ExchangeName;

  getBalance(): Promise<StandardBalance>;
  getPositions(): Promise<StandardPosition[]>;
  getIncome(params?: { startTime?: number; endTime?: number; limit?: number }): Promise<StandardIncome[]>;
  getClosedPositions?(params?: { startTime?: number; limit?: number }): Promise<StandardClosedPosition[]>;
}
