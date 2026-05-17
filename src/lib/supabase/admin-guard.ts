import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { withAbortableTimeout, withTimeout } from "@/lib/supabase/with-timeout";
import { fetchWithCeiling } from "@/lib/supabase/fetch-with-ceiling";
import type { Database } from "@/types/database";

const GET_USER_MS = 3000;
const MEMBER_MS = 2000;

export interface AdminCaller {
  userId: string;
  email: string;
  memberId: string;
}

// Verify the request is being made by an authenticated admin. Returns the
// caller's identity on success or a 401/403 NextResponse on failure.  Used
// at the top of every admin-only API route.
export async function requireAdmin(): Promise<
  { ok: true; caller: AdminCaller } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();

  let user;
  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      GET_USER_MS,
      "admin-getUser",
    );
    user = result.data.user;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Auth check failed" }, { status: 401 }),
    };
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }

  let memberRow;
  try {
    const { data } = await withAbortableTimeout(
      (signal) =>
        supabase
          .from("members")
          .select("id, is_admin")
          .eq("auth_user_id", user!.id)
          .abortSignal(signal)
          .maybeSingle(),
      MEMBER_MS,
      "admin-member",
    );
    memberRow = data;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Member lookup failed" }, { status: 500 }),
    };
  }

  if (!memberRow?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    caller: { userId: user.id, email: user.email!, memberId: memberRow.id },
  };
}

// Returns a Supabase client keyed with the service role.  Bypasses RLS;
// only use after requireAdmin() has confirmed the caller.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithCeiling },
    },
  );
}
