import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { generateSlug } from "@/lib/supabase/auth-utils";
import { TEST_EMAIL_DOMAIN } from "@/lib/supabase/test-accounts";

// Shared password for all dev personas. The endpoint is fenced off from
// production, so this never reaches a real user.
const TEST_PASSWORD = "dev-password-not-for-production";

type Persona = {
  email: (domain: string) => string;
  firstName: string;
  lastName: string;
  school: "University of Waterloo" | "Wilfrid Laurier University";
  program: string | null;
  bio: string | null;
  reviewStatus: "draft" | "pending_review" | "approved" | "rejected";
  onboardingCompleted: boolean;
  isApproved: boolean;
  isAdmin: boolean;
};

const PERSONAS: Record<string, Persona> = {
  "approved-waterloo": {
    email: (d) => `approved-waterloo@${d}`,
    firstName: "Avery",
    lastName: "Waterloo",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    bio: "Test persona — approved Waterloo member.",
    reviewStatus: "approved",
    onboardingCompleted: true,
    isApproved: true,
    isAdmin: false,
  },
  "approved-laurier": {
    email: (d) => `approved-laurier@${d}`,
    firstName: "Logan",
    lastName: "Laurier",
    school: "Wilfrid Laurier University",
    program: "User Experience Design",
    bio: "Test persona — approved Laurier member.",
    reviewStatus: "approved",
    onboardingCompleted: true,
    isApproved: true,
    isAdmin: false,
  },
  "pending-waterloo": {
    email: (d) => `pending-waterloo@${d}`,
    firstName: "Parker",
    lastName: "Pending",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    bio: "Test persona — submitted, awaiting review.",
    reviewStatus: "pending_review",
    onboardingCompleted: true,
    isApproved: false,
    isAdmin: false,
  },
  "draft-waterloo": {
    email: (d) => `draft-waterloo@${d}`,
    firstName: "Drew",
    lastName: "Draft",
    school: "University of Waterloo",
    program: null,
    bio: null,
    reviewStatus: "draft",
    onboardingCompleted: false,
    isApproved: false,
    isAdmin: false,
  },
  "admin-waterloo": {
    email: (d) => `admin-waterloo@${d}`,
    firstName: "Alex",
    lastName: "Admin",
    school: "University of Waterloo",
    program: "Global Business and Digital Arts",
    bio: "Test persona — admin.",
    reviewStatus: "approved",
    onboardingCompleted: true,
    isApproved: true,
    isAdmin: true,
  },
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Dev sign-in disabled in production" },
      { status: 404 }
    );
  }

  const domain = TEST_EMAIL_DOMAIN;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const as = searchParams.get("as");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  if (!as) {
    return NextResponse.json(
      { error: "Missing ?as= parameter", available: Object.keys(PERSONAS) },
      { status: 400 }
    );
  }

  const persona = PERSONAS[as];
  if (!persona) {
    return NextResponse.json(
      { error: `Unknown persona "${as}"`, available: Object.keys(PERSONAS) },
      { status: 400 }
    );
  }

  const email = persona.email(domain);

  // Admin client (service-role) — bypasses RLS, can create users
  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Idempotently ensure auth user exists with the known test password.
  // createUser is the cheapest probe — it errors fast if the user exists.
  let userId: string | undefined;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
  } else if (createError) {
    // Already exists — page through users to find by email, then reset the
    // password in case it changed.
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
        { error: `Could not create or find user ${email}: ${createError.message}` },
        { status: 500 }
      );
    }
    await admin.auth.admin.updateUserById(userId, { password: TEST_PASSWORD });
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Failed to resolve test user id" },
      { status: 500 }
    );
  }

  // Ensure a members row exists in the desired state. Look up by auth_user_id
  // first (the linked path), fall back to school_email (the migration path).
  const memberFields = {
    first_name: persona.firstName,
    last_name: persona.lastName,
    school: persona.school,
    program: persona.program,
    bio: persona.bio,
    review_status: persona.reviewStatus,
    onboarding_completed: persona.onboardingCompleted,
    slug_confirmed: persona.onboardingCompleted,
    is_approved: persona.isApproved,
    is_admin: persona.isAdmin,
  };

  const { data: existingMember } = await admin
    .from("members")
    .select("id, slug")
    .or(`auth_user_id.eq.${userId},school_email.eq.${email}`)
    .maybeSingle();

  if (existingMember) {
    await admin
      .from("members")
      .update({ auth_user_id: userId, ...memberFields })
      .eq("id", existingMember.id);
  } else {
    await admin.from("members").insert({
      auth_user_id: userId,
      school_email: email,
      slug: generateSlug(persona.firstName, persona.lastName),
      ...memberFields,
    });
  }

  // Sign in via the SSR-aware cookie client so the session cookie is set on
  // the response.  We have to build it inline (rather than calling the
  // existing createClient helper) so we can capture the cookies and forward
  // them on the redirect response.
  const cookieStore = await cookies();
  const cookiesToForward: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          cookiesToForward.push(...toSet);
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    return NextResponse.json(
      { error: `Sign-in failed: ${signInError.message}` },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  for (const { name, value, options } of cookiesToForward) {
    response.cookies.set(name, value, options);
  }
  return response;
}
