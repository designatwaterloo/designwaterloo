import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";
import { findOrInitMember } from "@/lib/supabase/member-init";
import { withTimeout } from "@/lib/supabase/with-timeout";

const EXCHANGE_MS = 10000;
const MEMBER_INIT_MS = 5000;

// Allowed values for `?error=` on the sign-in redirect. The sign-in page
// renders a friendly message per code; unrecognised codes fall through to
// the generic "auth-failed" copy.
const ALLOWED_ERROR_CODES = new Set([
  "access_denied",
  "consent_required",
  "auth-failed",
  "invalid-email",
  "init-failed",
  "session-expired",
]);

// Build a redirect to /sign-in?error=<reason> that also clears every sb-*
// cookie on the way out.  Critical for retry-ability: the OAuth flow writes
// an sb-*-auth-token-code-verifier cookie at sign-in start, and leaving it
// behind after a failure breaks the user's next attempt.
function errorRedirect(request: Request, reason: string): NextResponse {
  const safeReason = ALLOWED_ERROR_CODES.has(reason) ? reason : "auth-failed";
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/sign-in?error=${safeReason}`);

  const cookieHeader = request.headers.get("cookie") || "";
  cookieHeader.split(";").forEach((c) => {
    const name = c.split("=")[0]?.trim();
    if (name && name.startsWith("sb-")) {
      response.cookies.delete(name);
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Microsoft (and Supabase OAuth in general) returns ?error=... when the
  // user cancels, the tenant denies, or upstream exchange fails. Handle
  // these BEFORE the code check so we surface meaningful messages.
  const providerError = searchParams.get("error");
  if (providerError) {
    return errorRedirect(request, providerError);
  }

  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (!code) {
    return errorRedirect(request, "auth-failed");
  }

  const supabase = await createClient();

  let userId: string;
  let email: string;
  let fullName = "";
  try {
    const { data, error } = await withTimeout(
      supabase.auth.exchangeCodeForSession(code),
      EXCHANGE_MS,
      "exchangeCode",
    );
    if (error || !data.user) {
      return errorRedirect(request, "auth-failed");
    }
    userId = data.user.id;
    email = data.user.email!;
    fullName = (data.user.user_metadata?.full_name as string) || "";
  } catch {
    return errorRedirect(request, "auth-failed");
  }

  if (!isValidStudentEmail(email)) {
    try {
      await withTimeout(supabase.auth.signOut(), 3000, "signOut-invalidEmail");
    } catch {
      // ignore
    }
    return errorRedirect(request, "invalid-email");
  }

  let result;
  try {
    result = await withTimeout(
      findOrInitMember(supabase, userId, email, fullName),
      MEMBER_INIT_MS,
      "memberInit",
    );
  } catch {
    // Auth succeeded but the member init failed/timed out.  Send the user
    // to /profile/edit where the page can retry rather than booting them
    // back to sign-in with a confusing error.
    return NextResponse.redirect(`${origin}/profile/edit`);
  }

  if (result.error) {
    return errorRedirect(request, "init-failed");
  }

  if (result.onboardingCompleted) {
    return NextResponse.redirect(
      `${origin}${explicitNext || `/directory/${result.slug}`}`
    );
  }

  return NextResponse.redirect(`${origin}${explicitNext || "/profile/edit"}`);
}
