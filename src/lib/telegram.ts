const TELEGRAM_API = "https://api.telegram.org";

export async function sendMessage(text: string, chatId: string, botToken?: string): Promise<void> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN must be set");
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${err}`);
  }
}

/** Weekly summary → @wise_degen_house (public announcement channel) */
export function summaryChatId(): string {
  const id = process.env.TELEGRAM_SUMMARY_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_SUMMARY_CHAT_ID must be set");
  return id;
}

/** Price alerts + position open/close → private alert group */
export function alertChatId(): string {
  const id = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_ALERT_CHAT_ID must be set");
  return id;
}

/** Private portfolio bot token */
export function privateBotToken(): string {
  const token = process.env.PRIVATE_TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("PRIVATE_TELEGRAM_BOT_TOKEN must be set");
  return token;
}

/** Private portfolio — all notifications go to DM with the bot */
export function privateChatId(): string {
  const id = process.env.PRIVATE_TELEGRAM_CHAT_ID;
  if (!id) throw new Error("PRIVATE_TELEGRAM_CHAT_ID must be set");
  return id;
}
