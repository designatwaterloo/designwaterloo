import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidStudentEmail } from "@/lib/supabase/auth-utils";

interface LinkedMember {
  slug: string;
  onboarding_completed: boolean;
}

interface ExistingMember {
  id: string;
  slug: string;
  auth_user_id: string | null;
  onboarding_completed: boolean;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Validate email domain
      if (!isValidStudentEmail(data.user.email || "")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/sign-in?error=invalid-email`);
      }

      // Check if member profile is already linked to this auth account
      const { data: linkedMember } = (await supabase
        .from("members")
        .select("slug, onboarding_completed")
        .eq("auth_user_id", data.user.id)
        .maybeSingle()) as { data: LinkedMember | null };

      if (linkedMember?.onboarding_completed) {
        // Already linked and onboarded, go to their profile
        return NextResponse.redirect(
          `${origin}/directory/${linkedMember.slug}`
        );
      }

      // Check if there's an existing member with matching school_email (migrated from Sanity)
      const { data: existingByEmail } = (await supabase
        .from("members")
        .select("id, slug, auth_user_id, onboarding_completed")
        .eq("school_email", data.user.email!)
        .maybeSingle()) as { data: ExistingMember | null };

      if (existingByEmail && !existingByEmail.auth_user_id) {
        // Found a migrated profile - link it to this auth account
        const { error: updateError } = await supabase
          .from("members")
          .update({ auth_user_id: data.user.id } as never)
          .eq("id", existingByEmail.id);

        if (updateError) {
          console.error("[Auth Callback] Failed to link migrated profile:", updateError);
        } else {
          return NextResponse.redirect(
            `${origin}/directory/${existingByEmail.slug}`
          );
        }
      }

      // No existing profile found - needs onboarding
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to sign-in on error
  return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
}
