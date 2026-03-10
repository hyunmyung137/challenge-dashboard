import crypto from "crypto";
import type {
  ExchangeClient,
  ExchangeCredentials,
  StandardBalance,
  StandardPosition,
  StandardIncome,
} from "./types";

const BASE = "https://www.okx.com";

function signRequest(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secret: string,
): string {
  const prehash = timestamp + method + path + body;
  return crypto.createHmac("sha256", secret).update(prehash).digest("base64");
}

async function okxFetch(
  method: string,
  path: string,
  creds: ExchangeCredentials,
  body: string = "",
) {
  const timestamp = new Date().toISOString();
  const signature = signRequest(timestamp, method, path, body, creds.apiSecret);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": creds.passphrase ?? "",
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : body || undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OKX API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (json.code !== "0") {
    throw new Error(`OKX API error: ${json.msg} (code: ${json.code})`);
  }
  return json.data;
}

export function createOKXAdapter(creds: ExchangeCredentials): ExchangeClient {
  return {
    exchange: "okx",

    async getBalance(): Promise<StandardBalance> {
      const data = await okxFetch("GET", "/api/v5/account/balance", creds);
      const account = data?.[0];
      if (!account) throw new Error("No OKX account data");

      // Find USDT details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdt = account.details?.find((d: any) => d.ccy === "USDT");

      return {
        exchange: "okx",
        totalBalance: parseFloat(account.totalEq ?? "0"),
        availableBalance: parseFloat(usdt?.availBal ?? account.availBal ?? "0"),
        unrealizedPnl: parseFloat(account.upl ?? "0"),
        currency: "USD",
      };
    },

    async getPositions(): Promise<StandardPosition[]> {
      const data = await okxFetch("GET", "/api/v5/account/positions", creds);
      if (!data) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.filter((p: any) => parseFloat(p.pos) !== 0).map((p: any) => {
        const pos = parseFloat(p.pos);
        const avgPx = parseFloat(p.avgPx ?? "0");
        const markPx = parseFloat(p.markPx ?? "0");
        const liqPx = parseFloat(p.liqPx ?? "0");
        const upl = parseFloat(p.upl ?? "0");
        const lever = parseFloat(p.lever ?? "1");
        const notionalUsd = parseFloat(p.notionalUsd ?? "0");

        return {
          exchange: "okx" as const,
          symbol: p.instId?.replace("-", "") ?? p.instId,
          side: p.posSide === "long" ? "LONG" : p.posSide === "short" ? "SHORT" : (pos > 0 ? "LONG" : "SHORT"),
          size: Math.abs(pos),
          entryPrice: avgPx,
          markPrice: markPx,
          liquidationPrice: liqPx,
          unrealizedPnl: upl,
          roe: avgPx > 0 ? ((markPx - avgPx) / avgPx) * lever * (pos > 0 ? 1 : -1) * 100 : 0,
          leverage: lever,
          marginType: p.mgnMode === "isolated" ? "isolated" : "cross",
          notionalValue: notionalUsd || Math.abs(pos) * markPx,
        };
      });
    },

    async getIncome(params = {}): Promise<StandardIncome[]> {
      const queryParams = new URLSearchParams();
      if (params.startTime) queryParams.set("begin", String(params.startTime));
      if (params.endTime) queryParams.set("end", String(params.endTime));
      if (params.limit) queryParams.set("limit", String(params.limit));
      queryParams.set("instType", "SWAP");

      const qs = queryParams.toString();
      const path = `/api/v5/account/bills${qs ? `?${qs}` : ""}`;
      const data = await okxFetch("GET", path, creds);
      if (!data) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => ({
        exchange: "okx" as const,
        symbol: item.instId?.replace("-", "") ?? "",
        incomeType: item.subType ?? item.type ?? "REALIZED_PNL",
        income: parseFloat(item.pnl ?? item.balChg ?? "0"),
        asset: item.ccy ?? "USDT",
        time: parseInt(item.ts ?? "0", 10),
      }));
    },
  };
}
