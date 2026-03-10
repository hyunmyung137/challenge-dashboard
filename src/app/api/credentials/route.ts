import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/credentials — list all credentials (metadata only)
 * GET /api/credentials?exchange=binance&label=Main+Account — fetch encrypted blob for one credential
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const exchange = searchParams.get("exchange");
  const label = searchParams.get("label");

  try {
    const supabase = await createServerSupabaseClient();

    // If exchange + label provided, fetch the actual encrypted blob
    if (exchange && label) {
      const { data, error } = await supabase.rpc("get_credential", {
        p_exchange: exchange,
        p_label: label,
      });

      if (error) throw error;
      return NextResponse.json(data ?? {});
    }

    // Otherwise, list metadata only
    const { data, error } = await supabase.rpc("list_credentials");
    if (error) throw error;

    return NextResponse.json({ credentials: data ?? [] });
  } catch (err) {
    console.error("credentials GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/credentials — store an encrypted credential blob
 * Body: { exchange, label, encrypted_blob, iv, salt }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { exchange, label, encrypted_blob, iv, salt } = body;

    if (!exchange || !encrypted_blob || !iv || !salt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("store_credential", {
      p_exchange: exchange,
      p_label: label || "Main Account",
      p_encrypted_blob: encrypted_blob,
      p_iv: iv,
      p_salt: salt,
    });

    if (error) throw error;
    return NextResponse.json({ id: data });
  } catch (err) {
    console.error("store_credential error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/credentials?id=<uuid> — delete a credential
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json({ error: "Missing credential id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("delete_credential", {
      p_credential_id: credentialId,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete_credential error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
