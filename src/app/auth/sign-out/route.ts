import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Non-JavaScript fallback. Normal UI uses the browser SDK to notify other tabs.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  // signOut() clears the session cookies through the server client's setAll
  // callback (next/headers cookieStore), which Next.js merges into the
  // response headers for Route Handlers.
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
