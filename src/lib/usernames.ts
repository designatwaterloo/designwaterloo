// Username == public profile slug. Validation shared by the profile editor's
// availability check and submit. generateSlug (auth-utils) still produces the
// default suggestion; this enforces what a user may keep.

const RESERVED = new Set([
  "admin",
  "api",
  "auth",
  "claim",
  "dashboard",
  "directory",
  "profile",
  "sign-in",
  "sign-out",
  "onboarding",
  "pending-approval",
  "settings",
  "about",
  "member",
  "members",
  "new",
  "edit",
  "work",
  "designwaterloo",
  "support",
]);

const MIN = 3;
const MAX = 40;

export interface UsernameCheck {
  ok: boolean;
  normalized: string;
  error?: string;
}

export function validateUsername(raw: string): UsernameCheck {
  const normalized = raw.trim().replace(/^@/, "").toLowerCase();

  if (normalized.length < MIN) {
    return { ok: false, normalized, error: `Use at least ${MIN} characters.` };
  }
  if (normalized.length > MAX) {
    return { ok: false, normalized, error: `Use at most ${MAX} characters.` };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalized)) {
    return { ok: false, normalized, error: "Use letters, numbers, and single hyphens between words." };
  }
  if (RESERVED.has(normalized)) {
    return { ok: false, normalized, error: "That username is reserved." };
  }
  return { ok: true, normalized };
}
