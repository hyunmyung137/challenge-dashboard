import { NextResponse } from "next/server";
import { getIncome } from "@/lib/binance/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "30");
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const data: Array<{ incomeType: string; income: string; time: number; symbol: string }> =
      await getIncome({ startTime });

    const trades = data
      .filter((r) => r.incomeType === "REALIZED_PNL")
      .map((r) => ({
        time: r.time,
        date: new Date(r.time).toLocaleDateString("en-US", {
          month: "short", day: "numeric", timeZone: "UTC",
        }),
        symbol: r.symbol,
        pnl: parseFloat(parseFloat(r.income).toFixed(2)),
      }))
      .sort((a, b) => b.time - a.time);

    return NextResponse.json(trades);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
