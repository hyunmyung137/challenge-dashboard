import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/portfolio/snapshot
 * Body: { totalValue, positions, balances }
 * Saves a snapshot for the public dashboard.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await req.json();
    const supabase = await createServerSupabaseClient();

    // Delete old snapshots for this user (keep only latest)
    await supabase
      .from("portfolio_snapshots")
      .delete()
      .eq("user_id", session.user.id);

    // Insert new snapshot
    const { error } = await supabase.from("portfolio_snapshots").insert({
      user_id: session.user.id,
      snapshot,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("save snapshot error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
