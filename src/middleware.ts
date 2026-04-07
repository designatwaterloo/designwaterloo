import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";

const PROTECTED_PATHS = ["/onboarding", "/profile", "/pending-approval", "/dashboard"];
const ONBOARDING_REDIRECT = "/profile/edit";
const ADMIN_PATHS = ["/admin"];
const AUTH_PATHS = ["/sign-in"];

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
    }
  );

  // Check for Supabase auth cookies — their presence means the user likely
  // has a session even if getUser() fails due to a token-refresh race.
  // @supabase/ssr v0.5+ uses chunked cookies (e.g. sb-xxx-auth-token.0),
  // so we match the base name before any chunk suffix.
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  let user = null;
  try {
    const { data, error: getUserError } = await supabase.auth.getUser();
    user = data.user;
    // If getUser() failed but cookies exist, let the request through —
    // the client-side AuthProvider will retry the session refresh.
    if (getUserError && hasAuthCookies) {
      return supabaseResponse;
    }
  } catch {
    // Supabase fetch can be aborted during dev HMR or redirects — safe to ignore
    return supabaseResponse;
  }
  const pathname = request.nextUrl.pathname;

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
    await supabase.auth.signOut();
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("error", "invalid-email");
    return redirectWithCookies(redirectUrl, request, supabaseResponse);
  }

  // Fetch member data once for all subsequent checks
  let member: { slug: string; onboarding_completed: boolean; is_admin: boolean; review_status: string } | null = null;
  if (user && (isAuthPath || isAdminPath || isProtectedPath)) {
    const { data } = await supabase
      .from("members")
      .select("slug, onboarding_completed, is_admin, review_status")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    member = data;
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && user) {
    if (!member || !member.onboarding_completed) {
      return redirectWithCookies(new URL(ONBOARDING_REDIRECT, request.url), request, supabaseResponse);
    }
    return redirectWithCookies(new URL("/dashboard", request.url), request, supabaseResponse);
  }

  // Redirect /onboarding to /profile/edit
  if (pathname === "/onboarding" && user) {
    return redirectWithCookies(new URL(ONBOARDING_REDIRECT, request.url), request, supabaseResponse);
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
  if (user && isProtectedPath && pathname !== "/onboarding" && pathname !== ONBOARDING_REDIRECT) {
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
