import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  createAdminClient,
} from "@/lib/supabase/admin-guard";
import { withTimeout } from "@/lib/supabase/with-timeout";

const GENERATE_LINK_MS = 5000;
const VERIFY_OTP_MS = 5000;
const STASH_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

// POST /api/admin/impersonate/[id]
//
// Caller (an admin) becomes the user behind the given member row.  The
// admin's current sb-* cookies are stashed under dw-imp-stash-* on the same
// response; restoring them happens via /api/admin/impersonate/stop.
//
// Mechanism: generate a magic link for the target via the GoTrue admin API
// (no email is sent — generateLink only returns the token), then
// verifyOtp() with that token mints a real session via the SSR cookie
// adapter.  The browser ends up with the target user's sb-* cookies and a
// stash of the original admin's, so the admin can come back.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: targetMemberId } = await params;

  if (targetMemberId === auth.caller.memberId) {
    return NextResponse.json(
      { error: "Cannot impersonate yourself" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: target, error: targetErr } = await admin
    .from("members")
    .select("auth_user_id, school_email, first_name, last_name")
    .eq("id", targetMemberId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (!target.auth_user_id) {
    return NextResponse.json(
      { error: "Member has no linked auth account" },
      { status: 400 },
    );
  }

  // Look up the target's email in auth.users.  We use the auth email (not
  // members.school_email) because that's what GoTrue's magiclink keys off.
  const { data: targetUserData, error: getUserError } =
    await admin.auth.admin.getUserById(target.auth_user_id);
  if (getUserError || !targetUserData?.user?.email) {
    return NextResponse.json(
      { error: "Could not resolve target user" },
      { status: 500 },
    );
  }
  const targetEmail = targetUserData.user.email;

  // Capture the admin's current sb-* cookies BEFORE verifyOtp overwrites
  // them.  This is the stash we'll restore from on /stop.
  const cookieStore = await cookies();
  const stash: { name: string; value: string }[] = [];
  cookieStore.getAll().forEach((c) => {
    if (c.name.startsWith("sb-") && !c.name.startsWith("dw-imp-stash-")) {
      stash.push({ name: c.name, value: c.value });
    }
  });

  // Generate a magic link for the target.  generateLink() does not send an
  // email — it just returns the token, which we immediately consume.
  let hashedToken: string;
  try {
    const { data: link, error: linkError } = await withTimeout(
      admin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      }),
      GENERATE_LINK_MS,
      "generateLink",
    );
    if (linkError || !link.properties?.hashed_token) {
      return NextResponse.json(
        { error: linkError?.message || "Failed to generate link" },
        { status: 500 },
      );
    }
    hashedToken = link.properties.hashed_token;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Link generation timed out" },
      { status: 500 },
    );
  }

  // Mint the session on the server-side SSR client.  The cookie adapter
  // writes new sb-* cookies via cookieStore, which Next attaches to the
  // redirect response below.
  const supabase = await createClient();
  try {
    const { error: verifyError } = await withTimeout(
      supabase.auth.verifyOtp({
        token_hash: hashedToken,
        type: "magiclink",
      }),
      VERIFY_OTP_MS,
      "verifyOtp",
    );
    if (verifyError) {
      return NextResponse.json(
        { error: verifyError.message },
        { status: 500 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Session mint timed out" },
      { status: 500 },
    );
  }

  // Now write the stash cookies AND a marker with the original admin's
  // email so the banner can show it.  All of these get attached to the
  // response by Next.
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: STASH_MAX_AGE_SECONDS,
  };
  for (const { name, value } of stash) {
    cookieStore.set(`dw-imp-stash-${name}`, value, cookieOptions);
  }
  cookieStore.set("dw-imp-as", `${target.first_name} ${target.last_name}`, {
    ...cookieOptions,
    httpOnly: false, // banner reads from browser
  });
  cookieStore.set("dw-imp-by", auth.caller.email, {
    ...cookieOptions,
    httpOnly: false,
  });

  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}
