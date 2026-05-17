import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";
import { fetchWithCeiling } from "@/lib/supabase/fetch-with-ceiling";
import { withAbortableTimeout, withTimeout } from "@/lib/supabase/with-timeout";

const PROTECTED_PATHS = ["/profile", "/pending-approval", "/dashboard"];
const ONBOARDING_REDIRECT = "/profile/edit";
const ADMIN_PATHS = ["/admin"];
const AUTH_PATHS = ["/sign-in"];

const MW_GET_USER_MS = 3000;
const MW_REFRESH_MS = 3000;
const MW_MEMBER_MS = 2000;

/**
 * Create a redirect response that forwards any auth cookies that were set (or
 * refreshed) on `authResponse` during this request.  Without this, a token
 * refresh that happens inside `supabase.auth.getUser()` would write new cookies
 * to `authResponse` but those cookies would never reach the browser when we
 * return a different redirect response — leaving the client with stale/expired
 * tokens and causing redirect loops that only clear after the cookies are
 * manually deleted.
 */
function redirectWithCookies(
  to: string | URL,
  request: NextRequest,
  authResponse: NextResponse
): NextResponse {
  const url = typeof to === "string" ? new URL(to, request.url) : to;
  const response = NextResponse.redirect(url);
  authResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    response.cookies.set({ name, value, ...rest });
  });
  return response;
}

// Sweep every sb-* cookie on the outgoing response. Use after we've decided
// the session is dead and want a clean slate (refresh failed, invalid email,
// etc.). Belt-and-suspenders: `delete` plus explicit zero-Max-Age set, since
// `delete` alone misses cookies with Domain attributes.
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-")) {
      response.cookies.delete(c.name);
      response.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  });
}

function expiredRedirect(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  clearAuthCookies(request, response);
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: { fetch: fetchWithCeiling },
    }
  );

  // Check for Supabase auth cookies — their presence means the user likely
  // has a session even if getUser() fails due to a token-refresh race.
  // @supabase/ssr v0.5+ uses chunked cookies (e.g. sb-xxx-auth-token.0),
  // so we match the base name with `.includes` instead of `.endsWith`.
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  // Status codes that mean the session is *definitely* invalid (not a
  // transient backend hiccup).  Only these justify nuking the user's
  // cookies and bouncing to sign-in.  For anything else (network blips,
  // 5xx, timeouts), we pass through and let the client-side AuthProvider
  // do its own bounded validation — it has its own timeouts and will
  // redirect to /sign-in if it can't validate either.
  const DEFINITE_AUTH_REJECTION = (err: { status?: number } | null | undefined) =>
    err?.status === 401 || err?.status === 403;

  let user = null;
  try {
    const { data, error: getUserError } = await withTimeout(
      supabase.auth.getUser(),
      MW_GET_USER_MS,
      "mw-getUser",
    );
    user = data.user;

    // getUser came back with a definite 401/403 AND cookies exist — try
    // one active refresh.  If that also returns a definite rejection,
    // clear the poison cookies; otherwise pass through and let the
    // client retry.
    if (getUserError && hasAuthCookies && DEFINITE_AUTH_REJECTION(getUserError)) {
      try {
        const { data: refreshed, error: refreshError } = await withTimeout(
          supabase.auth.refreshSession(),
          MW_REFRESH_MS,
          "mw-refresh",
        );

        // `refresh_token_already_used` means a concurrent tab already
        // rotated the cookies — retry getUser once with the new ones.
        if (
          refreshError &&
          /already.?used/i.test(refreshError.message)
        ) {
          try {
            const { data: retry } = await withTimeout(
              supabase.auth.getUser(),
              MW_GET_USER_MS,
              "mw-getUser-retry",
            );
            user = retry.user;
          } catch {
            // fall through to passthrough; client will retry
          }
        } else if (refreshed?.user) {
          user = refreshed.user;
        } else if (refreshError && DEFINITE_AUTH_REJECTION(refreshError)) {
          // Both getUser and refresh definitively rejected — session is dead.
          return expiredRedirect(request, "session-expired");
        }
        // any other refresh error: fall through; client will retry
      } catch {
        // refresh threw/timed out — pass through; client will retry
      }
    }
  } catch {
    // getUser itself hung or threw transiently. Don't nuke cookies; let
    // the request through and let the client handle it.  Protected pages
    // still gate on `user`, so unauthenticated requests will redirect to
    // sign-in below.
  }

  const pathname = request.nextUrl.pathname;

  // /onboarding is a legacy URL alias — redirect before any auth checks
  if (pathname === "/onboarding") {
    return redirectWithCookies(new URL(ONBOARDING_REDIRECT, request.url), request, supabaseResponse);
  }

  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  // Redirect unauthenticated users from protected or admin routes
  if ((isProtectedPath || isAdminPath) && !user) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return redirectWithCookies(redirectUrl, request, supabaseResponse);
  }

  // Validate email domain for authenticated users
  if (user && !isValidStudentEmail(user.email || "")) {
    try {
      await withTimeout(
        supabase.auth.signOut(),
        MW_REFRESH_MS,
        "mw-signOut-invalidEmail",
      );
    } catch {
      // ignore — we're nuking cookies anyway
    }
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("error", "invalid-email");
    const response = NextResponse.redirect(redirectUrl);
    clearAuthCookies(request, response);
    return response;
  }

  // Fetch member data once for all subsequent checks. On timeout/error,
  // fail open with member=null — user lands on /profile/edit rather than
  // hanging on a slow Postgres query.
  let member: { slug: string; onboarding_completed: boolean; is_admin: boolean; review_status: string } | null = null;
  if (user && (isAuthPath || isAdminPath || isProtectedPath)) {
    try {
      const { data } = await withAbortableTimeout(
        (signal) =>
          supabase
            .from("members")
            .select("slug, onboarding_completed, is_admin, review_status")
            .eq("auth_user_id", user.id)
            .abortSignal(signal)
            .maybeSingle(),
        MW_MEMBER_MS,
        "mw-member",
      );
      member = data;
    } catch {
      // leave member = null — downstream logic treats this as "not onboarded"
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && user) {
    if (!member || !member.onboarding_completed) {
      return redirectWithCookies(new URL(ONBOARDING_REDIRECT, request.url), request, supabaseResponse);
    }
    return redirectWithCookies(new URL("/dashboard", request.url), request, supabaseResponse);
  }

  // Redirect completed users away from onboarding
  if (pathname === ONBOARDING_REDIRECT && user && member?.onboarding_completed) {
    return redirectWithCookies(new URL("/dashboard", request.url), request, supabaseResponse);
  }

  // Check admin access
  if (isAdminPath && !member?.is_admin) {
    return redirectWithCookies(new URL("/", request.url), request, supabaseResponse);
  }

  // Redirect to profile setup if user hasn't completed onboarding
  if (user && isProtectedPath && pathname !== ONBOARDING_REDIRECT) {
    if (!member || !member.onboarding_completed) {
      return redirectWithCookies(new URL(ONBOARDING_REDIRECT, request.url), request, supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
