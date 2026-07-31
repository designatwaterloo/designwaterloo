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

// Origin as the BROWSER sees it. Behind Vercel's proxy `request.url` can
// carry an internal host, and apex↔www drift makes host-only cookies land on
// a host the user never returns to — so trust x-forwarded-* when present.
function getRequestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

// Build a redirect to /sign-in?error=<reason>.
//
// Cookie policy: by default clear ONLY the sb-*-code-verifier cookie — the
// OAuth flow writes it at sign-in start, and leaving a stale one behind
// breaks the user's next attempt. The session cookies (sb-*-auth-token*) are
// preserved: a failed callback with a bogus/stale/reused code (double-click,
// prefetch, retry) must NEVER destroy an existing valid session. Verified
// 10/10 reproducible before this fix. Pass sweep="all" only when the session
// itself must die (e.g. disallowed email domain after sign-out).
function errorRedirect(
  request: Request,
  reason: string,
  sweep: "verifier" | "all" = "verifier",
): NextResponse {
  const safeReason = ALLOWED_ERROR_CODES.has(reason) ? reason : "auth-failed";
  const origin = getRequestOrigin(request);
  const response = NextResponse.redirect(`${origin}/sign-in?error=${safeReason}`);

  const cookieHeader = request.headers.get("cookie") || "";
  cookieHeader.split(";").forEach((c) => {
    const name = c.split("=")[0]?.trim();
    if (!name || !name.startsWith("sb-")) return;
    if (sweep === "all" || name.includes("code-verifier")) {
      response.cookies.delete(name);
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);

  // Microsoft (and Supabase OAuth in general) returns ?error=... when the
  // user cancels, the tenant denies, or upstream exchange fails. Handle
  // these BEFORE the code check so we surface meaningful messages.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error(
      `[auth/callback] provider error: ${providerError} (${searchParams.get("error_description") || "no description"})`,
    );
    return errorRedirect(request, providerError);
  }

  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (!code) {
    console.error("[auth/callback] missing ?code param");
    return errorRedirect(request, "auth-failed");
  }

  const supabase = await createClient();

  let userId: string;
  let email: string;
  let fullName = "";
  let preferredUsername = "";
  try {
    const { data, error } = await withTimeout(
      supabase.auth.exchangeCodeForSession(code),
      EXCHANGE_MS,
      "exchangeCode",
    );
    if (error || !data.user) {
      console.error(
        "[auth/callback] exchangeCodeForSession failed:",
        error?.status,
        error?.code,
        error?.message,
      );
      return errorRedirect(request, "auth-failed");
    }
    userId = data.user.id;
    email = data.user.email!;
    fullName = (data.user.user_metadata?.full_name as string) || "";
    // Azure returns the WatIAM id here while `email` is the first.last alias.
    preferredUsername =
      (data.user.user_metadata?.preferred_username as string) || "";
  } catch (err) {
    console.error("[auth/callback] exchangeCodeForSession threw:", err);
    return errorRedirect(request, "auth-failed");
  }

  if (!isValidStudentEmail(email)) {
    console.warn(`[auth/callback] disallowed email domain, signing out`);
    try {
      await withTimeout(supabase.auth.signOut(), 3000, "signOut-invalidEmail");
    } catch {
      // ignore
    }
    // Full sweep is correct here: this session must not survive.
    return errorRedirect(request, "invalid-email", "all");
  }

  let result;
  try {
    result = await withTimeout(
      findOrInitMember(
        supabase,
        userId,
        email,
        fullName,
        preferredUsername ? [preferredUsername] : [],
      ),
      MEMBER_INIT_MS,
      "memberInit",
    );
  } catch (err) {
    // Auth succeeded but the member init failed/timed out.  Send the user
    // to /profile/edit where the page can retry rather than booting them
    // back to sign-in with a confusing error.
    console.error("[auth/callback] member init timed out/threw:", err);
    return NextResponse.redirect(`${origin}/profile/edit`);
  }

  if (result.error) {
    // Same policy as the catch above: the user IS authenticated — a failed
    // member insert must not sign them out (the old cookie wipe here made
    // this a permanent lockout loop). /profile/edit retries init client-side.
    console.error("[auth/callback] member init failed:", result.error);
    return NextResponse.redirect(`${origin}/profile/edit`);
  }

  // No identifier match but name candidates exist — let the user claim.
  if (result.outcome === "claim") {
    return NextResponse.redirect(`${origin}/claim`);
  }

  if (result.onboardingCompleted) {
    return NextResponse.redirect(
      `${origin}${explicitNext || `/directory/${result.slug}`}`,
    );
  }

  return NextResponse.redirect(`${origin}${explicitNext || "/profile/edit"}`);
}
