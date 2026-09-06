import { createRouteClient } from "@/lib/supabase/route-client";
import { NextResponse, type NextRequest } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";
import { findOrInitMember } from "@/lib/supabase/member-init";
import { safeRedirect } from "@/lib/auth/redirect";


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

// An OAuth cancellation must not destroy an existing session.
function errorRedirect(request: Request, reason: string): NextResponse {
  const safeReason = ALLOWED_ERROR_CODES.has(reason) ? reason : "auth-failed";
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/sign-in?error=${safeReason}`);

  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Microsoft (and Supabase OAuth in general) returns ?error=... when the
  // user cancels, the tenant denies, or upstream exchange fails. Handle
  // these BEFORE the code check so we surface meaningful messages.
  const providerError = searchParams.get("error");
  if (providerError) {
    return errorRedirect(request, providerError);
  }

  const code = searchParams.get("code");
  const cookieStore = request.cookies;
  let savedNext = "";
  try { savedNext = decodeURIComponent(cookieStore.get("dw-auth-next")?.value ?? ""); } catch { /* invalid cookie */ }

  const explicitNext = safeRedirect(searchParams.get("next") ?? savedNext, "/dashboard");

  if (!code) {
    return errorRedirect(request, "auth-failed");
  }

  const { client: supabase, waitForSessionCookies, applyCookies } = createRouteClient(request);
  const finish = (response: NextResponse) => {
    response.cookies.delete("dw-auth-next");
    return applyCookies(response);
  };

  let email: string;
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user || !data.session) {
      return finish(errorRedirect(request, "auth-failed"));
    }
    // auth-js emits SIGNED_IN on a later task after exchange resolves. SSR
    // flushes its cookie buffer from that event; never redirect before it runs.
    await waitForSessionCookies(data.session.access_token);
    email = data.user.email ?? "";
  } catch {
    return finish(errorRedirect(request, "auth-failed"));
  }

  if (!isValidStudentEmail(email)) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    return finish(errorRedirect(request, "invalid-email"));
  }

  let result;
  try {
    result = await findOrInitMember(supabase);
  } catch {
    console.warn("[auth] account_resolution_failed; session preserved");
    // Auth succeeded but the member init failed/timed out.  Send the user
    // to /profile/edit where the page can retry rather than booting them
    // back to sign-in with a confusing error.
    return finish(NextResponse.redirect(`${origin}/profile/edit`));
  }

  if (result.onboardingCompleted) {
    return finish(NextResponse.redirect(`${origin}${explicitNext}`));
  }

  return finish(NextResponse.redirect(`${origin}/profile/edit`));
}
