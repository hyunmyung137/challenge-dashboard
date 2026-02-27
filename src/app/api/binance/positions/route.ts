import { NextResponse } from "next/server";
import { getPositions } from "@/lib/binance/client";

export async function GET() {
  try {
    const data = await getPositions();
    // Only return positions with actual size
    const open = data.filter(
      (p: { positionAmt: string }) => parseFloat(p.positionAmt) !== 0
    ).map((p: {
      symbol: string;
      positionAmt: string;
      entryPrice: string;
      markPrice: string;
      liquidationPrice: string;
      unRealizedProfit: string;
      leverage: string;
      marginType: string;
      isolatedMargin: string;
      positionSide: string;
    }) => ({
      symbol: p.symbol,
      positionAmt: parseFloat(p.positionAmt),
      entryPrice: parseFloat(p.entryPrice),
      markPrice: parseFloat(p.markPrice),
      liquidationPrice: parseFloat(p.liquidationPrice),
      unrealizedPnl: parseFloat(p.unRealizedProfit),
      leverage: parseInt(p.leverage),
      marginType: p.marginType,
      isolatedMargin: parseFloat(p.isolatedMargin),
      side: parseFloat(p.positionAmt) > 0 ? "LONG" : "SHORT",
      // ROE = unrealizedPnl / (entryPrice * |positionAmt| / leverage) * 100
      roe: (parseFloat(p.unRealizedProfit) /
        (parseFloat(p.entryPrice) * Math.abs(parseFloat(p.positionAmt)) / parseInt(p.leverage))) * 100,
    }));
    return NextResponse.json(open);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
