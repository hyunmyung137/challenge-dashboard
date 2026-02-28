import { NextResponse } from "next/server";
import { getIncome, getUserTrades } from "@/lib/binance/client";

type RawTrade = {
  symbol: string;
  side: "BUY" | "SELL";
  price: string;
  qty: string;
  realizedPnl: string;
  time: number;
};

type ClosedPosition = {
  symbol: string;
  side: "LONG" | "SHORT";
  openDate: string;
  closeDate: string;
  openTime: number;
  closeTime: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
};

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "UTC",
  });
}

function reconstructPositions(symbol: string, trades: RawTrade[]): ClosedPosition[] {
  const positions: ClosedPosition[] = [];
  const epsilon = 1e-8;

  let runningAmt = 0;
  let openTime = 0;
  let positionSide: "LONG" | "SHORT" = "LONG";
  let accPnl = 0;
  // Weighted avg entry: sum(price * qty) / sum(qty) for opening-direction trades
  let entryPriceSum = 0;
  let entryQtySum = 0;
  // Weighted avg exit: sum(price * qty) / sum(qty) for closing-direction trades
  let exitPriceSum = 0;
  let exitQtySum = 0;

  for (const trade of trades) {
    const qty = parseFloat(trade.qty);
    const price = parseFloat(trade.price);
    const pnl = parseFloat(trade.realizedPnl);
    const signedQty = trade.side === "BUY" ? qty : -qty;

    if (Math.abs(runningAmt) < epsilon) {
      // Opening a fresh position
      openTime = trade.time;
      positionSide = trade.side === "BUY" ? "LONG" : "SHORT";
      accPnl = 0;
      entryPriceSum = 0;
      entryQtySum = 0;
      exitPriceSum = 0;
      exitQtySum = 0;
    }

    const isOpening =
      Math.abs(runningAmt) < epsilon ||
      (runningAmt > 0 && signedQty > 0) ||
      (runningAmt < 0 && signedQty < 0);

    if (isOpening) {
      entryPriceSum += price * qty;
      entryQtySum += qty;
    } else {
      exitPriceSum += price * qty;
      exitQtySum += qty;
    }

    runningAmt += signedQty;
    accPnl += pnl;

    if (Math.abs(runningAmt) < epsilon && Math.abs(accPnl) > epsilon) {
      positions.push({
        symbol,
        side: positionSide,
        openTime,
        closeTime: trade.time,
        openDate: fmtDateTime(openTime),
        closeDate: fmtDateTime(trade.time),
        entryPrice: entryQtySum > 0 ? entryPriceSum / entryQtySum : 0,
        exitPrice: exitQtySum > 0 ? exitPriceSum / exitQtySum : 0,
        realizedPnl: parseFloat(accPnl.toFixed(2)),
      });
      runningAmt = 0;
      accPnl = 0;
    }
  }

  return positions;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "30");
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get symbols that had realized PNL in this period
    const income: Array<{ incomeType: string; symbol: string }> = await getIncome({ startTime });
    const symbols = [...new Set(
      income.filter((r) => r.incomeType === "REALIZED_PNL").map((r) => r.symbol)
    )];

    // Fetch user trades for each symbol in parallel
    const tradesBySymbol = await Promise.all(
      symbols.map((symbol) => getUserTrades({ symbol, startTime }))
    );

    // Reconstruct closed positions per symbol and merge
    const allPositions: ClosedPosition[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const trades: RawTrade[] = tradesBySymbol[i];
      const sorted = trades.sort((a, b) => a.time - b.time);
      allPositions.push(...reconstructPositions(symbols[i], sorted));
    }

    // Sort by close time descending (most recent first)
    allPositions.sort((a, b) => b.closeTime - a.closeTime);

    return NextResponse.json(allPositions);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
