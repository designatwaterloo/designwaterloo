import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { generateSlug } from "@/lib/supabase/auth-utils";
import {
  TEST_LOGIN_CODE,
  isTestLoginEmail,
} from "@/lib/supabase/test-accounts";

// Fixed password for the single test user. Only reachable when
// TEST_LOGIN_ENABLED=true AND the email is the allowlisted test email AND the
// code is TEST_LOGIN_CODE. Never a path for real users.
const TEST_LOGIN_PASSWORD = "test-login-not-for-real-users";

interface Body {
  email?: string;
  code?: string;
  redirectTo?: string;
}

export async function POST(request: NextRequest) {
  if (process.env.TEST_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Test login disabled" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!isTestLoginEmail(email) || body.code !== TEST_LOGIN_CODE) {
    return NextResponse.json({ error: "Invalid test credentials" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set" },
      { status: 500 },
    );
  }

  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Idempotently ensure the auth user exists with the known password.
  let userId: string | undefined;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_LOGIN_PASSWORD,
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
  } else if (createError) {
    let page = 1;
    while (!userId) {
      const { data: list, error: listError } =
        await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      const match = list.users.find((u) => u.email === email);
      if (match) {
        userId = match.id;
        break;
      }
      if (list.users.length < 200) break;
      page += 1;
    }
    if (!userId) {
      return NextResponse.json(
        { error: `Could not create or find ${email}: ${createError.message}` },
        { status: 500 },
      );
    }
    await admin.auth.admin.updateUserById(userId, { password: TEST_LOGIN_PASSWORD });
  }

  if (!userId) {
    return NextResponse.json({ error: "Failed to resolve test user" }, { status: 500 });
  }

  // Ensure a member row exists (draft, not onboarded) so the normal flow runs.
  const { data: existingMember } = await admin
    .from("members")
    .select("id")
    .or(`auth_user_id.eq.${userId},school_email.eq.${email}`)
    .maybeSingle();

  if (existingMember) {
    await admin
      .from("members")
      .update({ auth_user_id: userId })
      .eq("id", existingMember.id);
  } else {
    await admin.from("members").insert({
      auth_user_id: userId,
      school_email: email,
      first_name: "DW",
      last_name: "Test",
      slug: generateSlug("dw", "test"),
      school: "Wilfrid Laurier University",
      onboarding_completed: false,
      is_approved: false,
      review_status: "draft",
    });
  }

  // Sign in with the SSR cookie client so the session cookie lands on the
  // response. Return JSON (client navigates) rather than redirecting.
  const cookieStore = await cookies();
  const toForward: { name: string; value: string; options?: object }[] = [];
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(setList) {
          toForward.push(...setList);
        },
      },
    },
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_LOGIN_PASSWORD,
  });
  if (signInError) {
    return NextResponse.json(
      { error: `Sign-in failed: ${signInError.message}` },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: body.redirectTo || "/profile/edit",
  });
  for (const { name, value, options } of toForward) {
    response.cookies.set(name, value, options);
  }
  return response;
}
