import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";

const PROTECTED_PATHS = ["/onboarding", "/profile"];
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Check if path is protected
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  // Redirect authenticated users away from auth pages
  if (isAuthPath && user) {
    // Check if they have completed onboarding
    const { data: member } = await supabase
      .from("members")
      .select("onboarding_completed, slug")
      .eq("auth_user_id", user.id)
      .single();

    if (!member || !member.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(
      new URL(`/directory/${member.slug}`, request.url)
    );
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !user) {
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

  // Redirect to onboarding if user hasn't completed it
  if (user && isProtectedPath && pathname !== "/onboarding") {
    const { data: member } = await supabase
      .from("members")
      .select("onboarding_completed")
      .eq("auth_user_id", user.id)
      .single();

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
