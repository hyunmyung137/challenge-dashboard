import { NextResponse } from "next/server";
import { getIncome } from "@/lib/binance/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "30");
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const data: Array<{ incomeType: string; income: string; time: number; symbol: string }> =
      await getIncome({ startTime });

    // Group by UTC date
    const byDate: Record<string, number> = {};
    for (const record of data) {
      if (record.incomeType !== "REALIZED_PNL") continue;
      const date = new Date(record.time).toLocaleDateString("en-US", {
        month: "short", day: "numeric", timeZone: "UTC",
      });
      byDate[date] = (byDate[date] ?? 0) + parseFloat(record.income);
    }

    // Build ordered array with cumulative
    const entries = Object.entries(byDate).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
    let cumulative = 0;
    const result = entries.map(([date, dailyPnl]) => {
      cumulative += dailyPnl;
      return { date, dailyPnl: parseFloat(dailyPnl.toFixed(2)), cumulativePnl: parseFloat(cumulative.toFixed(2)) };
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
