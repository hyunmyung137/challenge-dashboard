import crypto from "crypto";
import type {
  ExchangeClient,
  ExchangeCredentials,
  StandardBalance,
  StandardPosition,
  StandardIncome,
} from "./types";

const BASE = "https://api.bybit.com";
const RECV_WINDOW = "5000";

function generateSignature(
  timestamp: string,
  apiKey: string,
  recvWindow: string,
  queryString: string,
  secret: string,
): string {
  const prehash = timestamp + apiKey + recvWindow + queryString;
  return crypto.createHmac("sha256", secret).update(prehash).digest("hex");
}

async function bybitFetch(
  method: string,
  path: string,
  creds: ExchangeCredentials,
  params: Record<string, string | number> = {},
) {
  const timestamp = String(Date.now());
  const queryString =
    method === "GET"
      ? new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        ).toString()
      : JSON.stringify(params);

  const signature = generateSignature(timestamp, creds.apiKey, RECV_WINDOW, queryString, creds.apiSecret);

  const headers: Record<string, string> = {
    "X-BAPI-API-KEY": creds.apiKey,
    "X-BAPI-SIGN": signature,
    "X-BAPI-SIGN-TYPE": "2",
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW,
    "Content-Type": "application/json",
  };

  const url = method === "GET" && queryString ? `${BASE}${path}?${queryString}` : `${BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? queryString : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bybit API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (json.retCode !== 0) {
    throw new Error(`Bybit API error: ${json.retMsg} (code: ${json.retCode})`);
  }
  return json.result;
}

export function createBybitAdapter(creds: ExchangeCredentials): ExchangeClient {
  return {
    exchange: "bybit",

    async getBalance(): Promise<StandardBalance> {
      const result = await bybitFetch("GET", "/v5/account/wallet-balance", creds, {
        accountType: "UNIFIED",
      });

      const account = result?.list?.[0];
      if (!account) throw new Error("No Bybit account data");

      // Find USDT coin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdt = account.coin?.find((c: any) => c.coin === "USDT");

      return {
        exchange: "bybit",
        totalBalance: parseFloat(account.totalEquity ?? "0"),
        availableBalance: parseFloat(account.totalAvailableBalance ?? usdt?.availableToWithdraw ?? "0"),
        unrealizedPnl: parseFloat(account.totalPerpUPL ?? "0"),
        currency: "USD",
      };
    },

    async getPositions(): Promise<StandardPosition[]> {
      const result = await bybitFetch("GET", "/v5/position/list", creds, {
        category: "linear",
        settleCoin: "USDT",
      });

      if (!result?.list) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.list.filter((p: any) => parseFloat(p.size) !== 0).map((p: any) => {
        const size = parseFloat(p.size ?? "0");
        const avgPrice = parseFloat(p.avgPrice ?? "0");
        const markPrice = parseFloat(p.markPrice ?? "0");
        const liqPrice = parseFloat(p.liqPrice ?? "0");
        const unrealisedPnl = parseFloat(p.unrealisedPnl ?? "0");
        const leverage = parseFloat(p.leverage ?? "1");

        return {
          exchange: "bybit" as const,
          symbol: p.symbol,
          side: p.side === "Buy" ? "LONG" : "SHORT",
          size,
          entryPrice: avgPrice,
          markPrice,
          liquidationPrice: liqPrice,
          unrealizedPnl: unrealisedPnl,
          roe: avgPrice > 0 ? ((markPrice - avgPrice) / avgPrice) * leverage * (p.side === "Buy" ? 1 : -1) * 100 : 0,
          leverage,
          marginType: p.tradeMode === "1" ? "isolated" : "cross",
          notionalValue: size * markPrice,
        };
      });
    },

    async getIncome(params = {}): Promise<StandardIncome[]> {
      const queryParams: Record<string, string | number> = {
        category: "linear",
        limit: params.limit ?? 100,
      };
      if (params.startTime) queryParams.startTime = params.startTime;
      if (params.endTime) queryParams.endTime = params.endTime;

      const result = await bybitFetch("GET", "/v5/position/closed-pnl", creds, queryParams);

      if (!result?.list) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.list.map((item: any) => ({
        exchange: "bybit" as const,
        symbol: item.symbol,
        incomeType: "REALIZED_PNL",
        income: parseFloat(item.closedPnl ?? "0"),
        asset: "USDT",
        time: parseInt(item.updatedTime ?? "0", 10),
      }));
    },
  };
}
