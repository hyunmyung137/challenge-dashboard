import { NextResponse } from "next/server";
import { getPositions } from "@/lib/binance/client";
import { sendMessage, alertChatId } from "@/lib/telegram";
import { checkPriceAlert, detectPositionChanges, clearAlertState } from "@/lib/alert-state";

function auth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const header = req.headers.get("Authorization") ?? "";
  return header === `Bearer ${cronSecret}`;
}

interface RawPosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  leverage: string;
  marginType: string;
  positionSide: string;
}

interface Position {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginType: string;
  side: "LONG" | "SHORT";
}

function formatUSD(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${abs.toFixed(2)}`;
}

function buildOpenMessage(p: Position): string {
  const sideKr = p.side === "LONG" ? "롱" : "숏";
  const emoji = p.side === "LONG" ? "🟢" : "🔴";
  const marginType = p.marginType === "cross" ? "크로스" : "아이솔레이티드";
  const margin = (p.entryPrice * Math.abs(p.positionAmt)) / p.leverage;

  return [
    `${emoji} <b>포지션 진입!</b>`,
    "",
    `${p.symbol} ${sideKr} ${p.leverage}x (${marginType})`,
    `진입가: $${p.entryPrice.toFixed(4)}`,
    `레버리지: ${p.leverage}x | 마진: $${margin.toFixed(2)}`,
    "",
    "가즈아~ 🚀 제발 틀리지 말아줘",
  ].join("\n");
}

function buildCloseMessage(symbol: string): string {
  return [
    `🔴 <b>포지션 청산</b>`,
    "",
    `${symbol}`,
    "청산 완료",
    "",
    "수고했어 병사 💀 다음 거 찾아보자",
  ].join("\n");
}

function buildPriceAlertMessage(
  p: Position,
  pricePct: number,
  direction: "up" | "down"
): string {
  const pctLabel = `${direction === "up" ? "+" : ""}${pricePct.toFixed(2)}%`;
  const bucketPct = Math.floor(Math.abs(pricePct) / 5) * 5;
  const sideKr = p.side === "LONG" ? "롱" : "숏";

  if (direction === "up") {
    const funnyLines = [
      "백 찍는 중 형 🖨️ 존버는 승리한다",
      "어 이거 가는 거 맞지? 🤔 손 떨리네",
      "선물 터질 것 같아 🎁 진짜 가는 건지",
      "형 나 지금 심장이 🫀 두근두근",
    ];
    const funny = funnyLines[Math.floor(Math.abs(pricePct / 5)) % funnyLines.length];
    return [
      `🚀 <b>+${bucketPct}% 떡상 알림</b>`,
      "",
      `${p.symbol} ${sideKr} ${p.leverage}x`,
      `진입가: $${p.entryPrice.toFixed(4)} → 현재가: $${p.markPrice.toFixed(4)}`,
      `변동: ${pctLabel} | 손익: ${formatUSD(p.unrealizedPnl)}`,
      "",
      funny,
    ].join("\n");
  } else {
    const funnyLines = [
      "잠깐 바람 좀 쐬고 와 병사 🌿",
      "멘탈 챙겨 형 🧘 이건 그냥 조정이야",
      "존버는 승리한다고 했잖아... 그죠? 😅",
      "차트 꺼라 병사 🙈 보면 더 힘들어",
    ];
    const funny = funnyLines[Math.floor(Math.abs(pricePct / 5)) % funnyLines.length];
    return [
      `🩸 <b>-${bucketPct}% 하락 알림</b>`,
      "",
      `${p.symbol} ${sideKr} ${p.leverage}x`,
      `진입가: $${p.entryPrice.toFixed(4)} → 현재가: $${p.markPrice.toFixed(4)}`,
      `변동: ${pctLabel} | 손익: ${formatUSD(p.unrealizedPnl)}`,
      "",
      funny,
    ].join("\n");
  }
}

export async function GET(req: Request) {
  if (!auth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw: RawPosition[] = await getPositions();

    const positions: Position[] = raw
      .filter((p) => parseFloat(p.positionAmt) !== 0)
      .map((p) => ({
        symbol: p.symbol,
        positionAmt: parseFloat(p.positionAmt),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unRealizedProfit),
        leverage: parseInt(p.leverage),
        marginType: p.marginType,
        side: parseFloat(p.positionAmt) > 0 ? "LONG" : "SHORT",
      }));

    const currentSymbols = positions.map((p) => p.symbol);
    const { opened, closed, isColdStart } = detectPositionChanges(currentSymbols);

    const chatId = alertChatId();
    const alerts: Promise<void>[] = [];

    if (!isColdStart) {
      // Position open notifications
      for (const symbol of opened) {
        const pos = positions.find((p) => p.symbol === symbol);
        if (pos) {
          alerts.push(sendMessage(buildOpenMessage(pos), chatId));
        }
      }

      // Position close notifications
      for (const symbol of closed) {
        clearAlertState(symbol);
        alerts.push(sendMessage(buildCloseMessage(symbol), chatId));
      }
    }

    // Price movement alerts
    for (const pos of positions) {
      if (pos.entryPrice === 0) continue;
      const pricePct = ((pos.markPrice - pos.entryPrice) / pos.entryPrice) * 100;
      const result = checkPriceAlert(pos.symbol, pricePct);
      if (result) {
        alerts.push(sendMessage(buildPriceAlertMessage(pos, pricePct, result.direction), chatId));
      }
    }

    await Promise.all(alerts);
    return NextResponse.json({ ok: true, coldStart: isColdStart, opened, closed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
