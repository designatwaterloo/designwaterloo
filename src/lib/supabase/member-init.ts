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
  const { data: linked, error: linkedErr } = await supabase
    .from("members")
    .select("slug, onboarding_completed")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (linkedErr) {
    console.error("[member-init] auth_user_id lookup failed:", linkedErr);
  }
  if (linked) return linked;

  const ids = Array.from(
    new Set(identifiers.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );
  if (ids.length === 0) return null;

  // Match on any identifier. order+limit keeps it robust if >1 row matches
  // (avoids .maybeSingle() throwing).
  const { data: matches, error: matchErr } = await supabase
    .from("members")
    .select("id, slug, auth_user_id, onboarding_completed")
    .in("school_email", ids)
    .order("created_at", { ascending: true })
    .limit(5);
  if (matchErr) {
    console.error("[member-init] identifier lookup failed:", matchErr);
  }

  // Only adopt an UNLINKED row. Rows already linked belong to a different auth
  // user (this user's own row was handled by the fast path above), so we must
  // not return someone else's profile — fall through to claim/create instead.
  const candidate = matches?.find((m) => !m.auth_user_id) ?? null;
  if (!candidate) return null;

  const { error } = await supabase
    .from("members")
    .update({ auth_user_id: userId })
    .eq("id", candidate.id)
    .is("auth_user_id", null); // guard against a race linking it first
  if (error) {
    console.error("[member-init] Failed to link by identifier:", error);
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
  school: "University of Waterloo" | "Wilfrid Laurier University" | null,
): Promise<ClaimCandidate[]> {
  const parts = (fullName || "").trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length >= 2 ? parts.slice(1).join(" ") : "";
  if (!first && !last) return [];

  // Single-name people are stored as first_name with an empty last_name, so
  // match against the right column. Scope to school in-query when known so the
  // row cap can't discard the correct same-school candidate.
  let query = supabase
    .from("members")
    .select("id, slug, first_name, last_name, school, program")
    .is("auth_user_id", null)
    .limit(50);
  query = last ? query.ilike("last_name", last) : query.ilike("first_name", first);
  if (school) query = query.eq("school", school);

  const { data, error } = await query;
  if (error) {
    console.error("[member-init] claim-candidate lookup failed:", error);
  }

  const rows = data ?? [];
  const exact = rows.filter(
    (m) =>
      normName(m.first_name) === normName(first) &&
      normName(m.last_name) === normName(last),
  );
  // School scoping already applied in-query; prefer exact full-name matches.
  const chosen = exact.length > 0 ? exact : rows;
  return chosen.map((m) => ({
    id: m.id,
    slug: m.slug,
    first_name: m.first_name,
    last_name: m.last_name,
    school: m.school,
    program: m.program,
  }));
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
