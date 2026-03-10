import crypto from "crypto";
import type {
  ExchangeClient,
  ExchangeCredentials,
  StandardBalance,
  StandardPosition,
  StandardIncome,
} from "./types";

const BASE = "https://api.bithumb.com";

// Cached KRW→USD rate
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

function createSignature(
  endpoint: string,
  params: string,
  apiSecret: string,
  nonce: string,
): string {
  const hmacData = `${endpoint}\0${params}\0${nonce}`;
  const hmac = crypto.createHmac("sha512", apiSecret).update(hmacData).digest("hex");
  return Buffer.from(hmac).toString("base64");
}

async function bithumbFetch(
  path: string,
  creds: ExchangeCredentials,
  params: Record<string, string> = {},
) {
  const nonce = String(Date.now());
  const endpoint = path;

  const bodyParams = new URLSearchParams({
    ...params,
    endpoint,
  });
  const bodyString = bodyParams.toString();

  const signature = createSignature(endpoint, bodyString, creds.apiSecret, nonce);

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Api-Key": creds.apiKey,
      "Api-Sign": signature,
      "Api-Timestamp": nonce,
      "Api-Nonce": nonce,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyString,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bithumb API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (json.status !== "0000") {
    throw new Error(`Bithumb API error: ${json.message} (status: ${json.status})`);
  }
  return json.data;
}

export function createBithumbAdapter(creds: ExchangeCredentials): ExchangeClient {
  return {
    exchange: "bithumb",

    async getBalance(): Promise<StandardBalance> {
      const data = await bithumbFetch("/info/balance", creds, { currency: "ALL" });
      const rate = await getKrwUsdRate();

      // Bithumb returns balance for each currency as total_xxx, available_xxx
      let totalKRW = parseFloat(data?.total_krw ?? "0");
      const availableKRW = parseFloat(data?.available_krw ?? "0");

      // Sum all non-KRW balances (approximate value)
      // In practice, we'd need ticker data for precise valuation
      for (const [key, value] of Object.entries(data ?? {})) {
        if (key.startsWith("total_") && key !== "total_krw" && typeof value === "string") {
          const amount = parseFloat(value);
          if (amount > 0) {
            // Would need ticker price — skip for now, included in positions
          }
        }
      }

      return {
        exchange: "bithumb",
        totalBalance: totalKRW * rate,
        availableBalance: availableKRW * rate,
        unrealizedPnl: 0,
        currency: "KRW",
      };
    },

    async getPositions(): Promise<StandardPosition[]> {
      const data = await bithumbFetch("/info/balance", creds, { currency: "ALL" });
      const rate = await getKrwUsdRate();
      const positions: StandardPosition[] = [];

      if (!data) return positions;

      // Extract all currency balances
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("total_") && key !== "total_krw" && typeof value === "string") {
          const currency = key.replace("total_", "").toUpperCase();
          const amount = parseFloat(value);
          if (amount > 0) {
            positions.push({
              exchange: "bithumb",
              symbol: `${currency}KRW`,
              side: "SPOT",
              size: amount,
              entryPrice: 0, // Would need order history
              markPrice: 0, // Would need ticker data
              liquidationPrice: 0,
              unrealizedPnl: 0,
              roe: 0,
              leverage: 1,
              marginType: "spot",
              notionalValue: 0, // Would need ticker data
            });
          }
        }
      }

      return positions;
    },

    async getIncome(): Promise<StandardIncome[]> {
      // Bithumb spot doesn't have PNL concept
      return [];
    },
  };
}
