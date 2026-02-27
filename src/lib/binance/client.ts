import crypto from "crypto";

const BASE = "https://fapi.binance.com";

function sign(queryString: string): string {
  const secret = process.env.BINANCE_API_SECRET!;
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

async function binanceFetch(path: string, params: Record<string, string | number> = {}) {
  const apiKey = process.env.BINANCE_API_KEY!;
  const timestamp = Date.now();
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), timestamp: String(timestamp) }).toString();
  const signature = sign(qs);
  const url = `${BASE}${path}?${qs}&signature=${signature}`;

  const res = await fetch(url, {
    headers: { "X-MBX-APIKEY": apiKey },
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Binance API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getBalance() {
  return binanceFetch("/fapi/v2/balance");
}

export async function getPositions() {
  return binanceFetch("/fapi/v2/positionRisk");
}

export async function getIncome(params: { startTime?: number; endTime?: number; limit?: number } = {}) {
  return binanceFetch("/fapi/v1/income", { incomeType: "REALIZED_PNL", limit: 1000, ...params });
}
