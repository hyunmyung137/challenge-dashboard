import { NextResponse } from "next/server";
import { sendMessage, privateBotToken, privateChatId } from "@/lib/telegram";

function auth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("Authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!auth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = [
    [
      "🚀 <b>+10% 떡상 알림</b> (테스트)",
      "",
      "BTCUSDT 롱 10x",
      "진입가: $80,000.0000 → 현재가: $88,000.0000",
      "변동: +10.00% | 손익: +$800.00",
      "",
      "백 찍는 중 형 🖨️ 존버는 승리한다",
    ].join("\n"),
    [
      "🩸 <b>-5% 하락 알림</b> (테스트)",
      "",
      "ETHUSDT 롱 5x",
      "진입가: $3,000.0000 → 현재가: $2,850.0000",
      "변동: -5.00% | 손익: -$150.00",
      "",
      "잠깐 바람 좀 쐬고 와 병사 🌿",
    ].join("\n"),
    [
      "🟢 <b>포지션 진입!</b> (테스트)",
      "",
      "SOLUSDT 롱 20x (크로스)",
      "진입가: $180.0000",
      "레버리지: 20x | 마진: $450.00",
      "",
      "가즈아~ 🚀 제발 틀리지 말아줘",
    ].join("\n"),
  ];

  await Promise.all(
    messages.map((msg) => sendMessage(msg, privateChatId(), privateBotToken()))
  );

  return NextResponse.json({ ok: true, sent: messages.length });
}
