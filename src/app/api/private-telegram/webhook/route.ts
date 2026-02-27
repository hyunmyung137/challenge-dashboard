import { NextResponse } from "next/server";
import { createBinanceClient } from "@/lib/binance/client";
import { sendMessage, privateBotToken, privateChatId } from "@/lib/telegram";

const { getBalance, getPositions } = createBinanceClient(
  "PRIVATE_BINANCE_API_KEY",
  "PRIVATE_BINANCE_API_SECRET"
);

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

function verifySecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("X-Telegram-Bot-Api-Secret-Token") === secret;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update: TelegramUpdate = await req.json();
  const text = update.message?.text ?? "";
  const chatId = update.message?.chat.id;

  const expectedChatId = parseInt(process.env.PRIVATE_TELEGRAM_CHAT_ID ?? "0");
  if (!text.startsWith("/portfolio") || chatId !== expectedChatId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const [balanceData, positionsData] = await Promise.all([getBalance(), getPositions()]);

    const usdt = balanceData.find((a: { asset: string }) => a.asset === "USDT");
    const walletBalance = parseFloat(usdt?.balance ?? "0");

    const openPositions = positionsData.filter(
      (p: { positionAmt: string }) => parseFloat(p.positionAmt) !== 0
    );
    const totalUnrealizedPnl = openPositions.reduce(
      (sum: number, p: { unRealizedProfit: string }) => sum + parseFloat(p.unRealizedProfit),
      0
    );
    const portfolioValue = walletBalance + totalUnrealizedPnl;

    const positionLines = openPositions.map(
      (p: {
        symbol: string;
        positionAmt: string;
        entryPrice: string;
        unRealizedProfit: string;
        leverage: string;
      }) => {
        const amt = parseFloat(p.positionAmt);
        const entry = parseFloat(p.entryPrice);
        const pnl = parseFloat(p.unRealizedProfit);
        const lev = parseInt(p.leverage);
        const side = amt > 0 ? "롱" : "숏";
        const emoji = amt > 0 ? "🟢" : "🔴";
        const margin = (entry * Math.abs(amt)) / lev;
        const roe = margin > 0 ? (pnl / margin) * 100 : 0;
        return `${emoji} ${p.symbol} ${side} ${lev}x: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (ROE ${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%)`;
      }
    );

    const timeKST = new Date().toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });

    const upnlStr = `${totalUnrealizedPnl >= 0 ? "+" : ""}$${totalUnrealizedPnl.toFixed(2)}`;

    const message = [
      "📊 <b>프라이빗 포트폴리오 (실시간)</b>",
      "",
      `💰 총 평가금액: $${portfolioValue.toFixed(2)}`,
      `지갑 잔고: $${walletBalance.toFixed(2)}`,
      `미실현 손익: ${upnlStr}`,
      "",
      openPositions.length > 0
        ? `📋 오픈 포지션\n${positionLines.join("\n")}`
        : "📋 오픈 포지션 없음",
      "",
      `🕐 ${timeKST} KST`,
    ].join("\n");

    await sendMessage(message, privateChatId(), privateBotToken());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
