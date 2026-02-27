import { NextResponse } from "next/server";
import { createBinanceClient } from "@/lib/binance/client";

const { getBalance } = createBinanceClient("PRIVATE_BINANCE_API_KEY", "PRIVATE_BINANCE_API_SECRET");

export async function GET() {
  try {
    const data = await getBalance();
    const usdt = data.find((a: { asset: string }) => a.asset === "USDT");
    return NextResponse.json({
      totalWalletBalance: parseFloat(usdt?.balance ?? "0"),
      availableBalance: parseFloat(usdt?.availableBalance ?? "0"),
      crossUnPnl: parseFloat(usdt?.crossUnPnl ?? "0"),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
