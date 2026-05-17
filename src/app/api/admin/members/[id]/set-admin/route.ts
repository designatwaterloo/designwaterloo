import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";

interface Body {
  isAdmin: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: targetMemberId } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin must be boolean" }, { status: 400 });
  }

  // Prevent an admin from demoting themselves — they could lock themselves
  // out of the console.  Promoting yourself is also disallowed (you already
  // are admin).
  if (targetMemberId === auth.caller.memberId) {
    return NextResponse.json(
      { error: "Cannot change your own admin status" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ is_admin: body.isAdmin })
    .eq("id", targetMemberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, memberId: targetMemberId, isAdmin: body.isAdmin });
}
