import crypto from "crypto";

const BASE = "https://fapi.binance.com";

export function createBinanceClient(apiKeyVar: string, apiSecretVar: string) {
  function sign(queryString: string): string {
    const secret = process.env[apiSecretVar]!;
    return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
  }

  async function binanceFetch(path: string, params: Record<string, string | number> = {}) {
    const apiKey = process.env[apiKeyVar]!;
    const timestamp = Date.now();
    const qs = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      timestamp: String(timestamp),
    }).toString();
    const signature = sign(qs);
    const url = `${BASE}${path}?${qs}&signature=${signature}`;

    const res = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance API error ${res.status}: ${err}`);
    }
    return res.json();
  }

  return {
    getBalance: () => binanceFetch("/fapi/v2/balance"),
    getPositions: () => binanceFetch("/fapi/v2/positionRisk"),
    getIncome: (params: { startTime?: number; endTime?: number; limit?: number } = {}) =>
      binanceFetch("/fapi/v1/income", { incomeType: "REALIZED_PNL", limit: 1000, ...params }),
  };
}

// Default client — challenge account
const _default = createBinanceClient("BINANCE_API_KEY", "BINANCE_API_SECRET");
export const getBalance = _default.getBalance;
export const getPositions = _default.getPositions;
export const getIncome = _default.getIncome;
