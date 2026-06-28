/**
 * Shared logic for finding, linking, or creating a member after authentication.
 *
 * Matching order:
 *   1. auth_user_id (returning user — fast path)
 *   2. exact match on ANY known identifier (alias email + WatIAM
 *      preferred_username) against school_email → link the backfilled row
 *   3. no identifier match but name candidates exist → signal claim flow
 *   4. no candidates → create a draft (genuinely new user)
 */

import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface ClaimCandidate {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  school: string | null;
  program: string | null;
}

export interface MemberInitResult {
  /** "linked" | "created" | "claim" */
  outcome: "linked" | "created" | "claim";
  slug: string;
  onboardingCompleted: boolean;
  candidates?: ClaimCandidate[];
  error?: string;
}

/** Normalize a name for case-insensitive comparison. */
function normName(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Match the login to a backfilled/existing row by auth_user_id first, then by
 * exact school_email against any of the supplied identifiers. Links the row to
 * the auth user when matched by identifier. Returns the row or null.
 */
export async function findAndLinkByIdentifiers(
  supabase: SupabaseClient<Database>,
  userId: string,
  identifiers: string[],
): Promise<{ slug: string; onboarding_completed: boolean } | null> {
  const { data: linked } = await supabase
    .from("members")
    .select("slug, onboarding_completed")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (linked) return linked;

  const ids = Array.from(
    new Set(identifiers.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );
  if (ids.length === 0) return null;

  // Match on any identifier. Prefer an unlinked row; ignore rows already linked
  // to a different auth user. order+limit keeps it robust if >1 row matches.
  const { data: matches } = await supabase
    .from("members")
    .select("id, slug, auth_user_id, onboarding_completed")
    .in("school_email", ids)
    .order("created_at", { ascending: true })
    .limit(5);

  const candidate =
    matches?.find((m) => !m.auth_user_id) ?? matches?.[0] ?? null;
  if (!candidate) return null;

  if (!candidate.auth_user_id) {
    const { error } = await supabase
      .from("members")
      .update({ auth_user_id: userId })
      .eq("id", candidate.id)
      .is("auth_user_id", null); // guard against a race linking it first
    if (error) {
      console.error("[member-init] Failed to link by identifier:", error);
    }
  }
  return {
    slug: candidate.slug,
    onboarding_completed: candidate.onboarding_completed,
  };
}

/** Unlinked rows whose name matches, scoped to the same school when known. */
export async function findClaimCandidates(
  supabase: SupabaseClient<Database>,
  fullName: string,
  school: string | null,
): Promise<ClaimCandidate[]> {
  const parts = (fullName || "").trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length >= 2 ? parts.slice(1).join(" ") : "";
  if (!first && !last) return [];

  const { data } = await supabase
    .from("members")
    .select("id, slug, first_name, last_name, school, program, auth_user_id")
    .is("auth_user_id", null)
    .ilike("last_name", last || first)
    .limit(20);

  const rows = (data ?? []).filter((m) => !m.auth_user_id);
  const exact = rows.filter(
    (m) =>
      normName(m.first_name) === normName(first) &&
      normName(m.last_name) === normName(last),
  );
  const pool = exact.length > 0 ? exact : rows;
  const scoped = school ? pool.filter((m) => m.school === school) : pool;
  const chosen = scoped.length > 0 ? scoped : pool;
  return chosen.map(({ auth_user_id: _ignore, ...rest }) => rest);
}

/** Insert a fresh draft row with a collision-free slug. */
export async function createDraftMember(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
  fullName?: string,
): Promise<MemberInitResult> {
  const school = getSchoolFromEmail(email);
  const nameParts = (fullName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";

  const baseSlug = firstName
    ? generateSlug(firstName, lastName)
    : generateSlug(email.split("@")[0].replace(/\./g, "-"), "");
  const safeSlug = baseSlug || "member";

  let finalSlug = safeSlug;
  const { data: similar } = await supabase
    .from("members")
    .select("slug")
    .like("slug", `${safeSlug}%`);

  if (similar?.some((s) => s.slug === safeSlug)) {
    const escaped = safeSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}-(\\d+)$`);
    let maxN = 0;
    for (const s of similar) {
      const m = s.slug.match(pattern);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    finalSlug = `${safeSlug}-${maxN + 1}`;
  }

  const { error: insertError } = await supabase.from("members").insert({
    auth_user_id: userId,
    first_name: firstName,
    last_name: lastName,
    slug: finalSlug,
    school_email: email,
    school,
    onboarding_completed: false,
    is_approved: false,
    review_status: "draft",
  });

  if (insertError) {
    console.error("[member-init] Failed to create draft member:", insertError);
    return {
      outcome: "created",
      slug: "",
      onboardingCompleted: false,
      error: insertError.message,
    };
  }
  return { outcome: "created", slug: finalSlug, onboardingCompleted: false };
}

/**
 * Orchestrator used by the OAuth callback and the OTP flow.
 * `altIdentifiers` carries the WatIAM `preferred_username` (Azure) when present.
 */
export async function findOrInitMember(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
  fullName?: string,
  altIdentifiers: string[] = [],
): Promise<MemberInitResult> {
  const matched = await findAndLinkByIdentifiers(supabase, userId, [
    email,
    ...altIdentifiers,
  ]);
  if (matched) {
    return {
      outcome: "linked",
      slug: matched.slug,
      onboardingCompleted: matched.onboarding_completed,
    };
  }

  const school = getSchoolFromEmail(email);
  const candidates = await findClaimCandidates(supabase, fullName || "", school);
  if (candidates.length > 0) {
    return { outcome: "claim", slug: "", onboardingCompleted: false, candidates };
  }

  return createDraftMember(supabase, userId, email, fullName);
}
