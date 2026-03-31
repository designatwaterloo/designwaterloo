import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /auth/sign-out
 *
 * Signs the user out server-side and redirects to the homepage.
 *
 * NOTE: All current UI sign-out paths use AuthProvider.signOut() (client-side)
 * and then navigate away — they do not call this route.  This endpoint exists
 * as a fallback for non-JS contexts or future server-action usage.
 *
 * Using POST (not GET) prevents accidental sign-out from link-prefetching,
 * browser history replays, or bots crawling href links.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  // signOut() clears the session cookies through the server client's setAll
  // callback (next/headers cookieStore), which Next.js merges into the
  // response headers for Route Handlers.
  await supabase.auth.signOut();

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
