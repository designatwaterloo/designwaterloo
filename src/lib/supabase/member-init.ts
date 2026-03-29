/**
 * Shared logic for finding or creating a member record after authentication.
 *
 * Called from both the OAuth callback (server-side) and the OTP verification
 * flow (client-side, after the user is already authenticated).  Keeping this
 * in one place means a bug fix or schema change only needs to happen once.
 *
 * Returns the slug to redirect to and whether a new draft was created.
 */

import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface MemberInitResult {
  slug: string;
  isNewMember: boolean;
  /** true when the profile is fully onboarded and ready for directory redirect */
  onboardingCompleted: boolean;
}

export async function findOrInitMember(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
  /** Full name from OAuth provider metadata — may be empty for OTP users */
  fullName?: string
): Promise<MemberInitResult> {
  // Run both lookups in parallel
  const [{ data: linkedMember }, { data: existingByEmail }] = await Promise.all([
    supabase
      .from("members")
      .select("slug, onboarding_completed")
      .eq("auth_user_id", userId)
      .maybeSingle() as unknown as Promise<{
        data: { slug: string; onboarding_completed: boolean } | null;
      }>,
    supabase
      .from("members")
      .select("id, slug, auth_user_id, onboarding_completed")
      .eq("school_email", email)
      .maybeSingle() as unknown as Promise<{
        data: {
          id: string;
          slug: string;
          auth_user_id: string | null;
          onboarding_completed: boolean;
        } | null;
      }>,
  ]);

  // Already linked — fast path for returning users
  if (linkedMember) {
    return {
      slug: linkedMember.slug,
      isNewMember: false,
      onboardingCompleted: linkedMember.onboarding_completed,
    };
  }

  // Migrated / pre-existing profile by email — link it to this auth account
  if (existingByEmail && !existingByEmail.auth_user_id) {
    const { error } = await supabase
      .from("members")
      .update({ auth_user_id: userId } as never)
      .eq("id", existingByEmail.id);

    if (error) {
      console.error("[member-init] Failed to link migrated profile:", error);
    }

    return {
      slug: existingByEmail.slug,
      isNewMember: false,
      onboardingCompleted: existingByEmail.onboarding_completed,
    };
  }

  // Profile exists by email and is already linked to a different auth account
  // (shouldn't happen in practice — treat it like a new user)
  if (existingByEmail) {
    return {
      slug: existingByEmail.slug,
      isNewMember: false,
      onboardingCompleted: existingByEmail.onboarding_completed,
    };
  }

  // No existing profile — create a draft member row
  const school = getSchoolFromEmail(email);
  const nameParts = (fullName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";

  const baseSlug = firstName
    ? generateSlug(firstName, lastName)
    : generateSlug(email.split("@")[0].replace(/\./g, "-"), "");
  const safeSlug = baseSlug || "member";

  // Find an available slug in one query
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
    auth_user_id: userId,
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
    console.error("[member-init] Failed to create draft member:", insertError);
  }

  return { slug: finalSlug, isNewMember: true, onboardingCompleted: false };
}
