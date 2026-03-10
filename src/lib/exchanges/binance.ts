import crypto from "crypto";
import type {
  ExchangeClient,
  ExchangeCredentials,
  StandardBalance,
  StandardPosition,
  StandardIncome,
  StandardClosedPosition,
} from "./types";

const BASE = "https://fapi.binance.com";

function sign(queryString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

async function binanceFetch(
  path: string,
  creds: ExchangeCredentials,
  params: Record<string, string | number> = {},
) {
  const timestamp = Date.now();
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(timestamp),
  }).toString();
  const signature = sign(qs, creds.apiSecret);
  const url = `${BASE}${path}?${qs}&signature=${signature}`;

  const res = await fetch(url, {
    headers: { "X-MBX-APIKEY": creds.apiKey },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Binance API error ${res.status}: ${err}`);
  }
  return res.json();
}

export function createBinanceAdapter(creds: ExchangeCredentials): ExchangeClient {
  return {
    exchange: "binance",

    async getBalance(): Promise<StandardBalance> {
      const data = await binanceFetch("/fapi/v2/balance", creds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdt = data.find((a: any) => a.asset === "USDT");
      return {
        exchange: "binance",
        totalBalance: parseFloat(usdt?.balance ?? "0"),
        availableBalance: parseFloat(usdt?.availableBalance ?? "0"),
        unrealizedPnl: parseFloat(usdt?.crossUnPnl ?? "0"),
        currency: "USD",
      };
    },

    async getPositions(): Promise<StandardPosition[]> {
      const data = await binanceFetch("/fapi/v2/positionRisk", creds);
      return (
        data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => parseFloat(p.positionAmt) !== 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => {
            const amt = parseFloat(p.positionAmt);
            const entry = parseFloat(p.entryPrice);
            const mark = parseFloat(p.markPrice);
            const liq = parseFloat(p.liquidationPrice);
            const unrealizedPnl = parseFloat(p.unRealizedProfit);
            const leverage = parseFloat(p.leverage);
            const notional = Math.abs(amt) * mark;

            return {
              exchange: "binance" as const,
              symbol: p.symbol,
              side: amt > 0 ? "LONG" : "SHORT",
              size: Math.abs(amt),
              entryPrice: entry,
              markPrice: mark,
              liquidationPrice: liq,
              unrealizedPnl,
              roe: entry > 0 ? ((mark - entry) / entry) * leverage * (amt > 0 ? 1 : -1) * 100 : 0,
              leverage,
              marginType: p.marginType === "isolated" ? "isolated" : "cross",
              notionalValue: notional,
            };
          })
      );
    },

    async getIncome(params = {}): Promise<StandardIncome[]> {
      const data = await binanceFetch("/fapi/v1/income", creds, {
        incomeType: "REALIZED_PNL",
        limit: 1000,
        ...params,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => ({
        exchange: "binance" as const,
        symbol: item.symbol,
        incomeType: item.incomeType,
        income: parseFloat(item.income),
        asset: item.asset,
        time: item.time,
      }));
    },

    async getClosedPositions(params = {}): Promise<StandardClosedPosition[]> {
      // Binance doesn't have a direct closed positions endpoint.
      // This would need to be reconstructed from trade history.
      // For now, use the income data as a proxy.
      const income = await binanceFetch("/fapi/v1/income", creds, {
        incomeType: "REALIZED_PNL",
        limit: 1000,
        ...params,
      });

      // Group by symbol and create simplified closed positions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return income.map((item: any) => ({
        exchange: "binance" as const,
        symbol: item.symbol,
        side: parseFloat(item.income) >= 0 ? "LONG" : "SHORT",
        openDate: new Date(item.time).toLocaleDateString(),
        closeDate: new Date(item.time).toLocaleDateString(),
        openTime: item.time,
        closeTime: item.time,
        entryPrice: 0,
        exitPrice: 0,
        realizedPnl: parseFloat(item.income),
      }));
    },
  };
}
