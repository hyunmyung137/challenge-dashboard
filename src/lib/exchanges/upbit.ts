import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  ExchangeClient,
  ExchangeCredentials,
  StandardBalance,
  StandardPosition,
  StandardIncome,
} from "./types";

const BASE = "https://api.upbit.com";

// Cached KRW→USD rate (refresh every hour)
let krwUsdRate: number | null = null;
let krwUsdRateTimestamp = 0;

async function getKrwUsdRate(): Promise<number> {
  const now = Date.now();
  if (krwUsdRate && now - krwUsdRateTimestamp < 3_600_000) {
    return krwUsdRate;
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();
    krwUsdRate = 1 / (data.rates?.KRW ?? 1350);
    krwUsdRateTimestamp = now;
    return krwUsdRate;
  } catch {
    return krwUsdRate ?? 1 / 1350;
  }
}

function createJWT(apiKey: string, apiSecret: string, queryHash?: string): string {
  // Upbit uses JWT HS256
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

  const payload: Record<string, string> = {
    access_key: apiKey,
    nonce: uuidv4(),
  };
  if (queryHash) {
    payload.query_hash = queryHash;
    payload.query_hash_alg = "SHA512";
  }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${header}.${payloadStr}`)
    .digest("base64url");

  return `${header}.${payloadStr}.${signature}`;
}

async function upbitFetch(path: string, creds: ExchangeCredentials, queryString?: string) {
  let queryHash: string | undefined;
  if (queryString) {
    queryHash = crypto.createHash("sha512").update(queryString, "utf-8").digest("hex");
  }

  const token = createJWT(creds.apiKey, creds.apiSecret, queryHash);
  const url = queryString ? `${BASE}${path}?${queryString}` : `${BASE}${path}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upbit API error ${res.status}: ${err}`);
  }
  return res.json();
}

export function createUpbitAdapter(creds: ExchangeCredentials): ExchangeClient {
  return {
    exchange: "upbit",

    async getBalance(): Promise<StandardBalance> {
      const accounts = await upbitFetch("/v1/accounts", creds);
      const rate = await getKrwUsdRate();

      let totalKRW = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const acc of accounts) {
        const balance = parseFloat(acc.balance ?? "0");
        const avgBuyPrice = parseFloat(acc.avg_buy_price ?? "0");
        if (acc.currency === "KRW") {
          totalKRW += balance;
        } else {
          totalKRW += balance * avgBuyPrice;
        }
      }

      return {
        exchange: "upbit",
        totalBalance: totalKRW * rate,
        availableBalance: totalKRW * rate,
        unrealizedPnl: 0, // Spot exchange — no unrealized PNL concept
        currency: "KRW",
      };
    },

    async getPositions(): Promise<StandardPosition[]> {
      const accounts = await upbitFetch("/v1/accounts", creds);
      const rate = await getKrwUsdRate();

      return accounts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((acc: any) => acc.currency !== "KRW" && parseFloat(acc.balance) > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((acc: any) => {
          const balance = parseFloat(acc.balance ?? "0");
          const avgBuyPrice = parseFloat(acc.avg_buy_price ?? "0");
          // For mark price we'd need current market data. Use avg_buy_price as placeholder.
          const markPrice = avgBuyPrice; // Would need market API call for live price
          const notionalKRW = balance * markPrice;

          return {
            exchange: "upbit" as const,
            symbol: `${acc.currency}KRW`,
            side: "SPOT" as const,
            size: balance,
            entryPrice: avgBuyPrice * rate,
            markPrice: markPrice * rate,
            liquidationPrice: 0,
            unrealizedPnl: 0,
            roe: 0,
            leverage: 1,
            marginType: "spot" as const,
            notionalValue: notionalKRW * rate,
          };
        });
    },

    async getIncome(): Promise<StandardIncome[]> {
      // Upbit doesn't have a direct PNL endpoint for spot.
      // Would need to reconstruct from order history.
      return [];
    },
  };
}
