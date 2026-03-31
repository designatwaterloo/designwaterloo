import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";
import { findOrInitMember } from "@/lib/supabase/member-init";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email!;

      // Validate email domain
      if (!isValidStudentEmail(email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/sign-in?error=invalid-email`);
      }

      const fullName = (data.user.user_metadata?.full_name as string) || "";
      const result = await findOrInitMember(supabase, data.user.id, email, fullName);

      if (result.onboardingCompleted) {
        return NextResponse.redirect(
          `${origin}${explicitNext || `/directory/${result.slug}`}`
        );
      }

      return NextResponse.redirect(`${origin}${explicitNext || "/profile/edit"}`);
    }
  }

  // Return to sign-in on error
  return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
}
