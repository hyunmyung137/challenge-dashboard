import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/user/profile — get current user's profile
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("get profile error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile — update user profile
 * Body: { display_name?, username_slug?, is_public? }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const allowedFields = ["display_name", "username_slug", "is_public"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate username_slug format
    if (updates.username_slug && typeof updates.username_slug === "string") {
      const slug = updates.username_slug;
      if (!/^[a-z0-9_-]{3,30}$/.test(slug)) {
        return NextResponse.json(
          { error: "Username must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores" },
          { status: 400 },
        );
      }
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("update profile error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
