import { NextResponse } from "next/server";
import { createBinanceClient } from "@/lib/binance/client";
import { sendMessage, privateBotToken, privateChatId } from "@/lib/telegram";

const { getBalance, getPositions, getIncome } = createBinanceClient(
  "PRIVATE_BINANCE_API_KEY",
  "PRIVATE_BINANCE_API_SECRET"
);

function auth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("Authorization") === `Bearer ${cronSecret}`;
}

interface Position {
  positionAmt: string;
  entryPrice: string;
  unRealizedProfit: string;
  leverage: string;
  symbol: string;
}

interface IncomeRecord {
  incomeType: string;
  income: string;
  time: number;
}

function formatUSD(value: number): string {
  const abs = Math.abs(value);
  return `${value >= 0 ? "+" : "-"}$${abs.toFixed(2)}`;
}

export async function GET(req: Request) {
  if (!auth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [balanceData, positionsData, incomeData] = await Promise.all([
      getBalance(),
      getPositions(),
      getIncome({ startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 }),
    ]);

    const usdt = balanceData.find((a: { asset: string }) => a.asset === "USDT");
    const walletBalance = parseFloat(usdt?.balance ?? "0");

    const openPositions: Position[] = positionsData.filter(
      (p: Position) => parseFloat(p.positionAmt) !== 0
    );
    const totalUnrealizedPnl = openPositions.reduce(
      (sum: number, p: Position) => sum + parseFloat(p.unRealizedProfit),
      0
    );
    const portfolioValue = walletBalance + totalUnrealizedPnl;

    const byDate: Record<string, number> = {};
    for (const record of incomeData as IncomeRecord[]) {
      if (record.incomeType !== "REALIZED_PNL") continue;
      const date = new Date(record.time).toLocaleDateString("ko-KR", {
        month: "numeric",
        day: "numeric",
        timeZone: "Asia/Seoul",
      });
      byDate[date] = (byDate[date] ?? 0) + parseFloat(record.income);
    }
    const dailyEntries = Object.entries(byDate);
    const totalRealizedPnl = dailyEntries.reduce((sum, [, v]) => sum + v, 0);
    const bestDay = dailyEntries.reduce(
      (best, [date, pnl]) => (pnl > (best?.pnl ?? -Infinity) ? { date, pnl } : best),
      null as { date: string; pnl: number } | null
    );
    const worstDay = dailyEntries.reduce(
      (worst, [date, pnl]) => (pnl < (worst?.pnl ?? Infinity) ? { date, pnl } : worst),
      null as { date: string; pnl: number } | null
    );

    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startLabel = `${sevenDaysAgo.getMonth() + 1}월 ${sevenDaysAgo.getDate()}일`;
    const endLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

    const positionLines = openPositions.map((p: Position) => {
      const amt = parseFloat(p.positionAmt);
      const entry = parseFloat(p.entryPrice);
      const pnl = parseFloat(p.unRealizedProfit);
      const lev = parseInt(p.leverage);
      const side = amt > 0 ? "롱" : "숏";
      const emoji = amt > 0 ? "🟢" : "🔴";
      const margin = (entry * Math.abs(amt)) / lev;
      const roe = margin > 0 ? (pnl / margin) * 100 : 0;
      return `${emoji} ${p.symbol} ${side} ${lev}x: ${formatUSD(pnl)} (ROE ${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%)`;
    });

    let highlight: string;
    if (totalRealizedPnl > 1000) highlight = "프라이빗 계좌 대박 🤑 진짜 잘하고 있어";
    else if (totalRealizedPnl > 0) highlight = "조용히 잘 버티고 있어 💪 이게 진짜 데겐";
    else if (totalRealizedPnl > -500) highlight = "좀 힘들었지만 멘탈 잡아 🧘 다음 주 기대";
    else highlight = "잠깐 숨 좀 고르자 형 🌬️ 일단 쉬어";

    const message = [
      `📊 <b>프라이빗 주간 리포트</b> — ${startLabel}~${endLabel}`,
      "",
      "💰 <b>포트폴리오 현황</b>",
      `총 평가금액: $${portfolioValue.toFixed(2)}`,
      `지갑 잔고: $${walletBalance.toFixed(2)}`,
      `미실현 손익: ${formatUSD(totalUnrealizedPnl)}`,
      "",
      openPositions.length > 0
        ? `📋 <b>오픈 포지션</b>\n${positionLines.join("\n")}`
        : "📋 오픈 포지션 없음",
      "",
      "📈 <b>이번 주 성과</b>",
      `실현 손익 합계: ${formatUSD(totalRealizedPnl)}`,
      bestDay ? `최고의 날: ${bestDay.date} (${formatUSD(bestDay.pnl)})` : "최고의 날: 없음",
      worstDay ? `최악의 날: ${worstDay.date} (${formatUSD(worstDay.pnl)})` : "최악의 날: 없음",
      "",
      highlight,
    ].join("\n");

    await sendMessage(message, privateChatId(), privateBotToken());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
