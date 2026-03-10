import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/public/[username]
 * Returns the public dashboard snapshot for a user (no auth needed).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const supabase = createServiceRoleClient();

    // Find user by username slug and check if public
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, username_slug, is_public")
      .eq("username_slug", username)
      .eq("is_public", true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found or profile is private" }, { status: 404 });
    }

    // Get latest snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from("portfolio_snapshots")
      .select("snapshot, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: "No snapshot available" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        display_name: profile.display_name,
        username: profile.username_slug,
      },
      snapshot: snapshot.snapshot,
      updated_at: snapshot.created_at,
    });
  } catch (err) {
    console.error("public snapshot error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
