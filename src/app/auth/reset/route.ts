import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/supabase/with-timeout";

// User-visible recovery route.  Anyone can hit this; it only deletes their
// own cookies via the response, so there is no auth gate by design.
// Used when a user is stuck with poisoned cookies and wants a clean slate.
export async function GET(request: NextRequest) {
  // Best-effort local sign-out so the SDK clears its in-memory state too.
  try {
    const supabase = await createClient();
    await withTimeout(
      supabase.auth.signOut({ scope: "local" }),
      3000,
      "reset-signOut",
    );
  } catch {
    // ignore — cookie sweep below is the source of truth
  }

  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/sign-in?reset=1`);

  // Sweep every sb-* cookie.  `delete` plus an explicit zero-Max-Age set:
  // `delete` alone can miss cookies with a Domain attribute.
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-")) {
      response.cookies.delete(c.name);
      response.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  });

  return response;
}
