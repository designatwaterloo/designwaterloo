import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// User-visible recovery route.  Anyone can hit this; it only deletes their
// own cookies via the response, so there is no auth gate by design.
// Used when a user is stuck with poisoned cookies and wants a clean slate.
export async function GET() {
  return new NextResponse('<!doctype html><html lang="en"><title>Reset sign-in</title><main><h1>Reset sign-in on this browser?</h1><p>You will need to sign in again.</p><form method="post"><button>Reset sign-in</button></form><a href="/">Cancel</a></main></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch { /* Explicit reset still removes this browser's cookies. */ }
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/sign-in?reset=1`, { status: 303 });

  // Sweep every sb-* cookie AND any leftover impersonation stash.
  // `delete` plus an explicit zero-Max-Age set: `delete` alone can miss
  // cookies with a Domain attribute.
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-") || c.name.startsWith("dw-imp")) {
      response.cookies.delete(c.name);
      response.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  });

  return response;
}
