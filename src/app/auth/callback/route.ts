import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidStudentEmail, getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";

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
  const explicitNext = searchParams.get("next");
  const next = explicitNext ?? "/profile/edit";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Validate email domain
      if (!isValidStudentEmail(data.user.email || "")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/sign-in?error=invalid-email`);
      }

      // Run both lookups in parallel
      const [{ data: linkedMember }, { data: existingByEmail }] = await Promise.all([
        supabase
          .from("members")
          .select("slug, onboarding_completed")
          .eq("auth_user_id", data.user.id)
          .maybeSingle() as Promise<{ data: LinkedMember | null }>,
        supabase
          .from("members")
          .select("id, slug, auth_user_id, onboarding_completed")
          .eq("school_email", data.user.email!)
          .maybeSingle() as Promise<{ data: ExistingMember | null }>,
      ]);

      // Already linked — fast path for returning users
      if (linkedMember?.onboarding_completed) {
        return NextResponse.redirect(
          `${origin}${explicitNext || `/directory/${linkedMember.slug}`}`
        );
      }

      if (linkedMember) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Migrated profile — link it
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
            `${origin}${explicitNext || `/directory/${existingByEmail.slug}`}`
          );
        }
      }

      if (existingByEmail) {
        // Profile exists by email — continue to onboarding
        return NextResponse.redirect(`${origin}${next}`);
      }

      // No existing profile — create draft member row immediately
      const email = data.user.email!;
      const school = getSchoolFromEmail(email);
      const fullName = (data.user.user_metadata?.full_name as string) || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";

      // Generate slug from name or email prefix
      const baseSlug = firstName
        ? generateSlug(firstName, lastName)
        : generateSlug(email.split("@")[0].replace(/\./g, "-"), "");
      const safeSlug = baseSlug || "member";

      // Find available slug — single query covers both exact match and similar
      let finalSlug = safeSlug;
      const { data: similar } = await supabase
        .from("members")
        .select("slug")
        .like("slug", `${safeSlug}%`);

      if (similar?.some((s: { slug: string }) => s.slug === safeSlug)) {
        const escaped = safeSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`^${escaped}-(\\d+)$`);
        let maxN = 0;
        for (const s of (similar || []) as { slug: string }[]) {
          const m = s.slug.match(pattern);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
        }
        finalSlug = `${safeSlug}-${maxN + 1}`;
      }

      const { error: insertError } = await supabase.from("members").insert({
        auth_user_id: data.user.id,
        first_name: firstName || null,
        last_name: lastName || null,
        slug: finalSlug,
        school_email: email,
        school,
        onboarding_completed: false,
        is_approved: false,
        review_status: "draft",
      } as never);

      if (insertError) {
        console.error("[Auth Callback] Failed to create draft member:", insertError);
      }

      // Redirect to onboarding to confirm/fill details
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to sign-in on error
  return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
}
