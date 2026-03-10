import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createExchangeClient, type ExchangeName } from "@/lib/exchanges";

/**
 * POST /api/exchange/[exchange]/income?days=N
 * Body: { apiKey, apiSecret, passphrase? }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ exchange: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { exchange } = await params;
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);
    const body = await req.json();
    const { apiKey, apiSecret, passphrase } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API key and secret are required" }, { status: 400 });
    }

    const client = createExchangeClient(exchange as ExchangeName, {
      apiKey,
      apiSecret,
      passphrase,
    });

    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const income = await client.getIncome({ startTime });

    // Group by day and compute daily + cumulative PNL
    const dailyMap = new Map<string, number>();
    for (const item of income) {
      const date = new Date(item.time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + item.income);
    }

    let cumulative = 0;
    const result = Array.from(dailyMap.entries()).map(([date, dailyPnl]) => {
      cumulative += dailyPnl;
      return { date, dailyPnl, cumulativePnl: cumulative };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Exchange income error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
