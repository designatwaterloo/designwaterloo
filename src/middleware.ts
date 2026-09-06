import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidStudentEmail } from '@/lib/supabase/auth-utils';
import { fetchWithCeiling } from '@/lib/supabase/fetch-with-ceiling';
import { safeRedirect } from '@/lib/auth/redirect';

const protectedPath = (path: string) => /^\/(profile|pending-approval|dashboard|admin|claim)(\/|$)/.test(path);
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const redirect = (path: string) => {
    const result = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  };
  const unavailable = () => {
    console.warn("[auth] account_service_unavailable", { path: request.nextUrl.pathname });
    // Fail closed, without turning an unavailable service into a signed-out session.
    const result = new NextResponse('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Account temporarily unavailable</title><main><h1>We couldn’t load your account</h1><p>Your connection or our account service is temporarily unavailable. Please try again.</p><button onclick="location.reload()">Try again</button><p><a href="/">Back to home</a></p></main></html>', {
      status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
    });
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    return result;
  };
  const path = request.nextUrl.pathname;
  if (path === '/onboarding') return redirect('/profile/edit');
  const hasSession = request.cookies.getAll().some(c => /^sb-.+-auth-token(?:\.\d+)?$/.test(c.name));
  if (!hasSession) {
    return protectedPath(path) ? redirect(`/sign-in?redirectTo=${encodeURIComponent(path + request.nextUrl.search)}`) : response;
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        const previous = response.cookies.getAll();
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        previous.forEach(cookie => response.cookies.set(cookie));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
    global: { fetch: fetchWithCeiling },
  });
  try {
    // Await the SDK's entire refresh lifecycle, including its cookie writes.
    // Never race this against a timer that can discard a rotated refresh token.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && !(error.status === 401 || error.status === 403 ||
        ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code ?? '') || error.name === 'AuthSessionMissingError')) {
      return unavailable();
    }
    if (!user) {
      response.headers.set('Cache-Control', 'private, no-store');
      return protectedPath(path) ? redirect(`/sign-in?redirectTo=${encodeURIComponent(path + request.nextUrl.search)}`) : response;
    }
    if (!isValidStudentEmail(user.email ?? '')) {
      await supabase.auth.signOut({ scope: 'local' });
      return redirect('/sign-in?error=invalid-email');
    }
    if (path === '/sign-in') return redirect(safeRedirect(request.nextUrl.searchParams.get('redirectTo')));
    if (/^\/admin(\/|$)/.test(path)) {
      const { data: member, error: memberError } = await supabase.from('members').select('is_admin').eq('auth_user_id', user.id).maybeSingle();
      if (memberError) return unavailable();
      if (!member?.is_admin) return redirect('/');
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch { return unavailable(); }
}

// Public pages with anonymous clients need no auth request. Profile/claim server
// renders use a session, so refresh their cookies before the render starts.
export const config = {
  matcher: ['/sign-in', '/onboarding', '/dashboard/:path*', '/profile/:path*', '/pending-approval/:path*', '/admin/:path*', '/claim', '/directory/:slug'],
};
