import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/supabase/auth-utils";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();

  // Junk-domain rows: school_email domain not in the allowlist.
  const { data: allMembers } = await admin
    .from("members")
    .select(
      "id, first_name, last_name, slug, school_email, auth_user_id, review_status, is_approved",
    );

  const members = allMembers ?? [];
  const junk = members.filter((m) => {
    const domain = m.school_email.split("@")[1]?.toLowerCase();
    return !domain || !ALLOWED_EMAIL_DOMAINS.includes(domain);
  });

  // Duplicate name pairs (one linked + one unlinked is the classic signature).
  const byName = new Map<string, typeof members>();
  for (const m of members) {
    const key = `${m.first_name.trim().toLowerCase()} ${m.last_name
      .trim()
      .toLowerCase()}`;
    byName.set(key, [...(byName.get(key) ?? []), m]);
  }
  const duplicates = [...byName.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([name, rows]) => ({ name, rows }));

  // Orphan logins: auth users with no linked member.
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const linkedUserIds = new Set(
    members.filter((m) => m.auth_user_id).map((m) => m.auth_user_id),
  );
  const orphanLogins = (authList?.users ?? [])
    .filter((u) => !linkedUserIds.has(u.id))
    .map((u) => ({
      userId: u.id,
      email: u.email,
      fullName: (u.user_metadata?.full_name as string) || null,
    }));

  return NextResponse.json({ junk, duplicates, orphanLogins });
}

interface ActionBody {
  action?: "link" | "merge" | "delete";
  userId?: string; // for link
  keepId?: string; // for merge (the row to keep)
  dropId?: string; // for merge/delete (the row to remove)
  memberId?: string; // for link/delete target
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "link" && body.userId && body.memberId) {
    const { error } = await admin
      .from("members")
      .update({ auth_user_id: body.userId })
      .eq("id", body.memberId)
      .is("auth_user_id", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "merge" && body.keepId && body.dropId) {
    // Move the auth link from the dropped row onto the kept row, then delete
    // the dropped row. The kept row should be the approved/good-data one.
    const { data: drop } = await admin
      .from("members")
      .select("auth_user_id")
      .eq("id", body.dropId)
      .maybeSingle();

    // auth_user_id has a UNIQUE constraint, so the dropped row must be removed
    // BEFORE the kept row adopts its link — otherwise both briefly hold the
    // same id and the update fails.
    const { error: delErr } = await admin
      .from("members")
      .delete()
      .eq("id", body.dropId);
    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (drop?.auth_user_id) {
      const { error: linkErr } = await admin
        .from("members")
        .update({ auth_user_id: drop.auth_user_id })
        .eq("id", body.keepId);
      if (linkErr)
        return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.memberId) {
    const { error } = await admin
      .from("members")
      .delete()
      .eq("id", body.memberId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
