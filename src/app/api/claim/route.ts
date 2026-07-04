import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDraftMember } from "@/lib/supabase/member-init";

interface Body {
  action?: "claim" | "fresh";
  memberId?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Guard: if the user already has a member, don't let them claim another.
  const { data: existing } = await supabase
    .from("members")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "fresh") {
    const fullName = (user.user_metadata?.full_name as string) || "";
    const result = await createDraftMember(
      supabase,
      user.id,
      user.email!,
      fullName,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  if (body.action === "claim" && body.memberId) {
    // Link only if the row is still unlinked (prevents double-claim races).
    const { data: linkedRow, error } = await supabase
      .from("members")
      .update({ auth_user_id: user.id, school_email: user.email! })
      .eq("id", body.memberId)
      .is("auth_user_id", null)
      .select("slug")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!linkedRow) {
      return NextResponse.json(
        { error: "That profile was already claimed. Choose another or start fresh." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
