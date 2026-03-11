import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";

const PROTECTED_PATHS = ["/onboarding", "/profile", "/pending-approval"];
const ADMIN_PATHS = ["/admin"];
const AUTH_PATHS = ["/sign-in"];

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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
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
    return NextResponse.redirect(redirectUrl);
  }

  // Validate email domain for authenticated users
  if (user && !isValidStudentEmail(user.email || "")) {
    await supabase.auth.signOut();
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("error", "invalid-email");
    return NextResponse.redirect(redirectUrl);
  }

  // Fetch member data once for all subsequent checks
  let member: { slug: string; onboarding_completed: boolean; is_admin: boolean } | null = null;
  if (user && (isAuthPath || isAdminPath || isProtectedPath)) {
    const { data } = await supabase
      .from("members")
      .select("slug, onboarding_completed, is_admin")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    member = data;
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && user) {
    if (!member || !member.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(
      new URL(`/directory/${member.slug}`, request.url)
    );
  }

  // Check admin access
  if (isAdminPath && !member?.is_admin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect to onboarding if user hasn't completed it
  if (user && isProtectedPath && pathname !== "/onboarding") {
    if (!member || !member.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
