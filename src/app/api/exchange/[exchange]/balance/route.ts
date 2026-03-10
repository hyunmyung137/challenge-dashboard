import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createExchangeClient, type ExchangeName } from "@/lib/exchanges";

/**
 * POST /api/exchange/[exchange]/balance
 * Body: { apiKey, apiSecret, passphrase? }
 *
 * Keys are transient — used for the API call, then discarded.
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

    const balance = await client.getBalance();
    return NextResponse.json(balance);
  } catch (err) {
    console.error("Exchange balance error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
