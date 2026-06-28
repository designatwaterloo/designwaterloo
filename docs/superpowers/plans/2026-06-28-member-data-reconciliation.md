# Member Data Reconciliation & Onboarding Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let backfilled Sanity members log in and edit their real profiles, let users choose their own usernames, give admins a working approve/reject + data-repair flow, and provide a gated test account — all verified manually.

**Architecture:** Five independent units. Unit 2's core is a one-field change: match login against `school_email IN (email, preferred_username)` because Azure returns the WatIAM id in `preferred_username` (what the backfill stored) while putting the first.last alias in `email` (what we matched before). The claim flow, data-issues panel, and reviewed cleanup migration handle the small residue. Most username/status UI already exists and is extended, not rebuilt.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase (`@supabase/ssr`, service-role admin client), CSS Modules. No test framework — verification is a manual checklist per the spec ([2026-06-27-member-data-reconciliation-design.md](../specs/2026-06-27-member-data-reconciliation-design.md)).

**Execution approach:** Subagent-driven (chosen). A fresh subagent implements each
task in order; the orchestrator reviews between tasks before dispatching the next.
DB-touching steps (the `slug_confirmed` migration and the `reconcile_existing_members`
cleanup) require explicit user sign-off before they run.

**Reference reading before starting:**
- Spec: `docs/superpowers/specs/2026-06-27-member-data-reconciliation-design.md`
- `src/lib/supabase/member-init.ts` — the matching logic being refactored
- `src/app/api/dev/sign-in/route.ts` — the service-role sign-in pattern reused by Unit 1
- `src/lib/supabase/admin-guard.ts` — `requireAdmin()` / `createAdminClient()` used by all admin routes
- `src/app/api/admin/members/[id]/set-admin/route.ts` — the admin route pattern to mirror

**Conventions:**
- Files/folders `kebab-case`; components/types `PascalCase`; vars/functions `camelCase`.
- Use the project `<Link>` from `src/components/Link`, not `next/link`.
- `.npmrc` has `legacy-peer-deps=true` — do not touch.
- Commit after each task with the message shown.

---

## File Structure

**Create:**
- `src/app/api/auth/test-login/route.ts` — gated fixed-OTP test sign-in (Unit 1)
- `src/app/claim/page.tsx` — "Is this you?" claim screen (Unit 2)
- `src/app/claim/page.module.css` — styles for claim screen (Unit 2)
- `src/app/api/claim/route.ts` — link-or-start-fresh claim actions (Unit 2)
- `src/lib/usernames.ts` — username validation + reserved words (Unit 3)
- `src/app/api/admin/members/[id]/approve/route.ts` — approve (Unit 4)
- `src/app/api/admin/members/[id]/reject/route.ts` — reject + feedback (Unit 4)
- `src/app/admin/data-issues/page.tsx` — data-issues panel (Unit 5)
- `src/app/admin/data-issues/page.module.css` — styles (Unit 5)
- `src/app/api/admin/data-issues/route.ts` — detectors (GET) + actions (POST) (Unit 5)
- `docs/superpowers/test-plan-member-reconciliation.md` — the manual test checklist (all units)

**Modify:**
- `src/lib/supabase/test-accounts.ts` — add `TEST_LOGIN_EMAIL` (Unit 1)
- `src/app/sign-in/page.tsx` — route the test email through test-login (Unit 1)
- `src/lib/supabase/member-init.ts` — dual-identifier match, claim signal, extracted helpers (Unit 2)
- `src/app/auth/callback/route.ts` — forward `preferred_username`, handle claim redirect (Unit 2)
- `src/app/profile/edit/page.tsx` — apply `validateUsername`, first-edit prompt, set `slug_confirmed` (Unit 3)
- `src/types/database.ts` — add `slug_confirmed` (Unit 3)
- `src/app/admin/page.tsx` — Approve/Reject buttons + Data Issues link (Units 4, 5)

**Migrations (via `mcp__supabase__apply_migration`, after sign-off):**
- `add_slug_confirmed` — `slug_confirmed boolean` column (Unit 3)
- `reconcile_existing_members` — merge 3 dup pairs, link spark.mark, quarantine junk (Unit 5)

---

## Unit 1 — Gated test login

**Goal:** A single allowlisted `@mylaurier.ca` email accepts the fixed OTP `424242`, but only when `TEST_LOGIN_ENABLED=true`. Flows through the existing Laurier OTP UI.

### Task 1.1: Add the test-login email constant

**Files:**
- Modify: `src/lib/supabase/test-accounts.ts`

- [ ] **Step 1: Add the constant**

Append to `src/lib/supabase/test-accounts.ts`:

```ts
// Single allowlisted email for the gated fixed-OTP test login (Unit 1).
// Not a secret — the server-side TEST_LOGIN_ENABLED flag is the actual gate.
// Uses a real @mylaurier.ca shape so it flows through the existing Laurier
// OTP UI. The fixed code is 424242.
export const TEST_LOGIN_EMAIL = "dwtest@mylaurier.ca";
export const TEST_LOGIN_CODE = "424242";

export function isTestLoginEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === TEST_LOGIN_EMAIL;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `test-accounts.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/test-accounts.ts
git commit -m "feat(test-login): add allowlisted test email + fixed code constants"
```

### Task 1.2: Create the gated test-login endpoint

**Files:**
- Create: `src/app/api/auth/test-login/route.ts`

- [ ] **Step 1: Write the route**

This mirrors `src/app/api/dev/sign-in/route.ts` (service-role ensure-user → ensure-member → password sign-in → forward cookies) but is gated on `TEST_LOGIN_ENABLED` and the fixed code, and works in production when the flag is on.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { generateSlug } from "@/lib/supabase/auth-utils";
import {
  TEST_LOGIN_EMAIL,
  TEST_LOGIN_CODE,
  isTestLoginEmail,
} from "@/lib/supabase/test-accounts";

// Fixed password for the single test user. Only reachable when
// TEST_LOGIN_ENABLED=true AND the email is the allowlisted test email AND the
// code is TEST_LOGIN_CODE. Never a path for real users.
const TEST_LOGIN_PASSWORD = "test-login-not-for-real-users";

interface Body {
  email?: string;
  code?: string;
  redirectTo?: string;
}

export async function POST(request: NextRequest) {
  if (process.env.TEST_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Test login disabled" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!isTestLoginEmail(email) || body.code !== TEST_LOGIN_CODE) {
    return NextResponse.json({ error: "Invalid test credentials" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set" },
      { status: 500 },
    );
  }

  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Idempotently ensure the auth user exists with the known password.
  let userId: string | undefined;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_LOGIN_PASSWORD,
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
  } else if (createError) {
    let page = 1;
    while (!userId) {
      const { data: list, error: listError } =
        await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      const match = list.users.find((u) => u.email === email);
      if (match) {
        userId = match.id;
        break;
      }
      if (list.users.length < 200) break;
      page += 1;
    }
    if (!userId) {
      return NextResponse.json(
        { error: `Could not create or find ${email}: ${createError.message}` },
        { status: 500 },
      );
    }
    await admin.auth.admin.updateUserById(userId, { password: TEST_LOGIN_PASSWORD });
  }

  if (!userId) {
    return NextResponse.json({ error: "Failed to resolve test user" }, { status: 500 });
  }

  // Ensure a member row exists (draft, not onboarded) so the normal flow runs.
  const { data: existingMember } = await admin
    .from("members")
    .select("id")
    .or(`auth_user_id.eq.${userId},school_email.eq.${email}`)
    .maybeSingle();

  if (existingMember) {
    await admin
      .from("members")
      .update({ auth_user_id: userId })
      .eq("id", existingMember.id);
  } else {
    await admin.from("members").insert({
      auth_user_id: userId,
      school_email: email,
      first_name: "DW",
      last_name: "Test",
      slug: generateSlug("dw", "test"),
      school: "Wilfrid Laurier University",
      onboarding_completed: false,
      is_approved: false,
      review_status: "draft",
    });
  }

  // Sign in with the SSR cookie client so the session cookie lands on the
  // response. Return JSON (client navigates) rather than redirecting.
  const cookieStore = await cookies();
  const toForward: { name: string; value: string; options?: object }[] = [];
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(setList) {
          toForward.push(...setList);
        },
      },
    },
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_LOGIN_PASSWORD,
  });
  if (signInError) {
    return NextResponse.json(
      { error: `Sign-in failed: ${signInError.message}` },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: body.redirectTo || "/profile/edit",
  });
  for (const { name, value, options } of toForward) {
    response.cookies.set(name, value, options);
  }
  return response;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no errors in `src/app/api/auth/test-login/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/test-login/route.ts
git commit -m "feat(test-login): gated fixed-OTP endpoint behind TEST_LOGIN_ENABLED"
```

### Task 1.3: Route the test email through the endpoint in the sign-in UI

**Files:**
- Modify: `src/app/sign-in/page.tsx`

- [ ] **Step 1: Import the helper**

In `src/app/sign-in/page.tsx`, update the auth-utils import line (line 5):

```tsx
import { isLaurierEmail } from "@/lib/supabase/auth-utils";
import { isTestLoginEmail } from "@/lib/supabase/test-accounts";
```

- [ ] **Step 2: Short-circuit "Send Code" for the test email**

In `handleSendOtp` (around line 31), add the test-email branch right after `setSendingOtp(true)` is *not yet* called — insert before the `setSendingOtp(true)` line:

```tsx
  const handleSendOtp = async () => {
    setLaurierError(null);
    if (!laurierUsername.trim()) {
      setLaurierError("Please enter your Laurier username.");
      return;
    }
    // Test login: no real OTP is sent; just reveal the code box. The server
    // endpoint enforces the gate + fixed code on verify.
    if (isTestLoginEmail(laurierEmail)) {
      setOtpSent(true);
      return;
    }
    setSendingOtp(true);
    const { error } = await signInWithLaurierOtp(laurierEmail);
    setSendingOtp(false);
    if (error) {
      setLaurierError(error);
      return;
    }
    setOtpSent(true);
  };
```

- [ ] **Step 3: Route verify through the test-login endpoint**

In `handleVerifyOtp` (around line 49), add the test branch immediately after the `otpCode.length !== 6` check:

```tsx
    setVerifyingOtp(true);

    // Test login path: POST the fixed code to the gated endpoint.
    if (isTestLoginEmail(laurierEmail)) {
      try {
        const res = await fetch("/api/auth/test-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: laurierEmail,
            code: otpCode,
            redirectTo: redirectTo || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          redirectTo?: string;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          setVerifyingOtp(false);
          setLaurierError(data.error || "Test login failed.");
          return;
        }
        window.location.assign(data.redirectTo || "/profile/edit");
        return;
      } catch {
        setVerifyingOtp(false);
        setLaurierError("Test login failed. Please try again.");
        return;
      }
    }

    const { error, user } = await verifyLaurierOtp(laurierEmail, otpCode);
```

Note: the existing code currently has `setVerifyingOtp(true);` followed by `const { error, user } = await verifyLaurierOtp(...)`. Replace that pair so the test branch sits between them (the `setVerifyingOtp(true)` line stays once, at the top of the block shown above).

- [ ] **Step 4: Verify it compiles**

Run: `npm run lint`
Expected: no errors in `sign-in/page.tsx`.

- [ ] **Step 5: Manual test (local)**

```bash
# Terminal A
TEST_LOGIN_ENABLED=true npm run dev
```
1. Visit `http://localhost:3000/sign-in` → "Sign in with @mylaurier.ca".
2. Enter username `dwtest` → Send Code → code box appears (no email sent).
3. Enter `424242` → Verify → lands on `/profile/edit` authenticated.
4. Stop dev, restart **without** `TEST_LOGIN_ENABLED` → repeat steps 1–3 → Verify shows "Test login disabled"/failure and does NOT sign in.

Record both outcomes in the test plan (Task 6.1).

- [ ] **Step 6: Commit**

```bash
git add src/app/sign-in/page.tsx
git commit -m "feat(test-login): route allowlisted test email through gated endpoint"
```

---

## Unit 2 — Dual-identifier matching + claim fallback

**Goal:** Match a login to a backfilled row on the alias **or** the WatIAM id; only fall back to the claim screen when neither matches; only create a fresh draft when there are no name candidates.

### Task 2.1: Refactor `member-init.ts` into helpers with dual-identifier matching

**Files:**
- Modify: `src/lib/supabase/member-init.ts`

- [ ] **Step 1: Replace the file with the refactored version**

Full replacement for `src/lib/supabase/member-init.ts`:

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: errors only at the call sites in `auth/callback/route.ts` and `sign-in/page.tsx` that still read the old `MemberInitResult` shape (fixed in 2.2 / 2.4). The file itself must be clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/member-init.ts
git commit -m "feat(auth): dual-identifier matching + claim-candidate detection"
```

### Task 2.2: Forward `preferred_username` and handle the claim outcome in the OAuth callback

**Files:**
- Modify: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Capture the WatIAM identifier**

Replace the metadata extraction block (lines 74–76) with:

```ts
    userId = data.user.id;
    email = data.user.email!;
    fullName = (data.user.user_metadata?.full_name as string) || "";
    // Azure returns the WatIAM id here while `email` is the first.last alias.
    preferredUsername =
      (data.user.user_metadata?.preferred_username as string) || "";
```

And add the declaration near the other `let` declarations (after line 64 `let fullName = "";`):

```ts
  let preferredUsername = "";
```

- [ ] **Step 2: Pass it into `findOrInitMember` and handle `claim`**

Replace the member-init call + result handling (lines 90–114) with:

```ts
  let result;
  try {
    result = await withTimeout(
      findOrInitMember(
        supabase,
        userId,
        email,
        fullName,
        preferredUsername ? [preferredUsername] : [],
      ),
      MEMBER_INIT_MS,
      "memberInit",
    );
  } catch {
    return NextResponse.redirect(`${origin}/profile/edit`);
  }

  if (result.error) {
    return errorRedirect(request, "init-failed");
  }

  // No identifier match but name candidates exist — let the user claim.
  if (result.outcome === "claim") {
    return NextResponse.redirect(`${origin}/claim`);
  }

  if (result.onboardingCompleted) {
    return NextResponse.redirect(
      `${origin}${explicitNext || `/directory/${result.slug}`}`,
    );
  }

  return NextResponse.redirect(`${origin}${explicitNext || "/profile/edit"}`);
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors in `auth/callback/route.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat(auth): forward WatIAM preferred_username, route to /claim"
```

### Task 2.3: Build the claim page and action endpoint

**Files:**
- Create: `src/app/api/claim/route.ts`
- Create: `src/app/claim/page.tsx`
- Create: `src/app/claim/page.module.css`

- [ ] **Step 1: Write the claim action endpoint**

`src/app/api/claim/route.ts` — authenticated user either claims a candidate (link) or starts fresh (create draft). Uses the user's own session client; linking is guarded so only an unlinked row can be claimed.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDraftMember } from "@/lib/supabase/member-init";

interface Body {
  action?: "claim" | "fresh";
  memberId?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Guard: if the user already has a member, don't let them claim another.
  const { data: existing } = await supabase
    .from("members")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "fresh") {
    const fullName = (user.user_metadata?.full_name as string) || "";
    const result = await createDraftMember(
      supabase,
      user.id,
      user.email!,
      fullName,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  if (body.action === "claim" && body.memberId) {
    // Link only if the row is still unlinked (prevents double-claim races).
    const { data: linkedRow, error } = await supabase
      .from("members")
      .update({ auth_user_id: user.id, school_email: user.email! })
      .eq("id", body.memberId)
      .is("auth_user_id", null)
      .select("slug")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!linkedRow) {
      return NextResponse.json(
        { error: "That profile was already claimed. Choose another or start fresh." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, redirectTo: "/profile/edit" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Step 2: Write the claim page**

`src/app/claim/page.tsx` — server component computes candidates for the current user, renders a client list. Redirects to `/sign-in` if unauthenticated, or `/profile/edit` if the user already has a member or has no candidates.

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSchoolFromEmail } from "@/lib/supabase/auth-utils";
import { findClaimCandidates } from "@/lib/supabase/member-init";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClaimList from "./ClaimList";

export default async function ClaimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/profile/edit");

  const fullName = (user.user_metadata?.full_name as string) || "";
  const school = getSchoolFromEmail(user.email!);
  const candidates = await findClaimCandidates(supabase, fullName, school);
  if (candidates.length === 0) redirect("/profile/edit");

  return (
    <div>
      <Header />
      <main className="w-full">
        <ClaimList candidates={candidates} />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Write the client list component**

Create `src/app/claim/ClaimList.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ClaimCandidate } from "@/lib/supabase/member-init";
import styles from "./page.module.css";

export default function ClaimList({
  candidates,
}: {
  candidates: ClaimCandidate[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      window.location.assign(data.redirectTo || "/profile/edit");
    } catch {
      setError("Request failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Is this you?</h1>
      <p className={styles.subtitle}>
        We found existing profiles that match your name. Claim yours to keep your
        existing info, or start a new profile.
      </p>

      <div className={styles.list}>
        {candidates.map((c) => (
          <button
            key={c.id}
            className={styles.candidate}
            disabled={busy}
            onClick={() => post({ action: "claim", memberId: c.id })}
          >
            <span className={styles.candidateName}>
              {c.first_name} {c.last_name}
            </span>
            <span className={styles.candidateMeta}>
              {c.school}
              {c.program ? ` · ${c.program}` : ""}
            </span>
            <span className={styles.candidateCta}>This is me →</span>
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.fresh}
        disabled={busy}
        onClick={() => post({ action: "fresh" })}
      >
        None of these — start a new profile
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Write minimal styles**

Create `src/app/claim/page.module.css`:

```css
.section {
  max-width: 640px;
  margin: 0 auto;
  padding: 4rem var(--margin);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 60vh;
}
.title { font-size: 2rem; font-weight: 600; }
.subtitle { opacity: 0.7; }
.list { display: flex; flex-direction: column; gap: 0.75rem; }
.candidate {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  transition: border-color 0.15s ease;
}
.candidate:hover:not(:disabled) { border-color: rgba(0, 0, 0, 0.5); }
.candidate:disabled { opacity: 0.5; cursor: default; }
.candidateName { font-weight: 600; }
.candidateMeta { font-size: 0.875rem; opacity: 0.7; }
.candidateCta { font-size: 0.875rem; margin-top: 0.25rem; }
.fresh {
  align-self: flex-start;
  padding: 0.5rem 0;
  text-decoration: underline;
  background: transparent;
  cursor: pointer;
}
.error { color: #c0392b; }
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run lint`
Expected: no errors in any `src/app/claim/*` file or `src/app/api/claim/route.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/app/claim src/app/api/claim
git commit -m "feat(claim): is-this-you claim screen + link/fresh action endpoint"
```

### Task 2.4: Route the OTP flow through the new result shape

**Files:**
- Modify: `src/app/sign-in/page.tsx`

- [ ] **Step 1: Update the OTP member-init handling**

In `handleVerifyOtp`, replace the `try { const result = await findOrInitMember(...) ... }` block (around lines 75–86) with:

```tsx
    try {
      const result = await findOrInitMember(supabase, user.id, user.email!);
      if (result.outcome === "claim") {
        startTransition("/claim");
      } else if (result.onboardingCompleted) {
        startTransition(redirectTo || `/directory/${result.slug}`);
      } else {
        startTransition(redirectTo || "/profile/edit");
      }
    } catch (err) {
      console.error("[OTP] Failed to initialise member record:", err);
      setLaurierError("Something went wrong. Please try again.");
      setVerifyingOtp(false);
    }
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/sign-in/page.tsx
git commit -m "feat(auth): handle claim outcome in OTP sign-in flow"
```

### Task 2.5: Manual verification of matching (uses real DB rows, read-then-test)

- [ ] **Step 1: Confirm the matching query against live data (read-only)**

Run this via the Supabase MCP `execute_sql` (or psql) to confirm each path has a representative row BEFORE testing logins:

```sql
SELECT first_name, last_name, school_email, auth_user_id IS NULL AS unlinked
FROM members
WHERE school_email IN ('f54zhao@uwaterloo.ca','adnardi@uwaterloo.ca','winston.zhao@uwaterloo.ca')
ORDER BY school_email;
```
Expected: three unlinked rows (WatIAM-with-digit, WatIAM-no-digit, alias). These are the Unit 2 link cases.

- [ ] **Step 2: Record expectations in the test plan**

Add to the test plan (Task 6.1) the four matching cases and their expected outcome (link via email, link via preferred_username, fresh draft, claim). Actual login verification for `@uwaterloo.ca` rows requires the real person's Azure account, so production verification of those is observational (watch `auth_user_id` get set); the `dwtest@` test account exercises the create/claim branches end-to-end locally.

- [ ] **Step 3: No code change — no commit.**

---

## Unit 3 — User-chosen usernames

**Goal:** Stricter username validation (reserved words, charset) on the existing slug editor, and a first-edit prompt for backfilled members via a `slug_confirmed` column.

### Task 3.1: Add the `slug_confirmed` column + type

**Files:**
- Migration: `add_slug_confirmed`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Apply the migration (after sign-off)**

Use `mcp__supabase__apply_migration` with name `add_slug_confirmed`:

```sql
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS slug_confirmed boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Add to the TypeScript types**

In `src/types/database.ts`, add `slug_confirmed: boolean;` to the `members` `Row`, and `slug_confirmed?: boolean;` to both `Insert` and `Update` (next to `onboarding_completed`).

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(db): add members.slug_confirmed"
```

### Task 3.2: Username validation utility

**Files:**
- Create: `src/lib/usernames.ts`

- [ ] **Step 1: Write the utility**

```ts
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
]);

const MIN = 3;
const MAX = 40;

export interface UsernameCheck {
  ok: boolean;
  normalized: string;
  error?: string;
}

export function validateUsername(raw: string): UsernameCheck {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length < MIN) {
    return { ok: false, normalized, error: `Use at least ${MIN} characters.` };
  }
  if (normalized.length > MAX) {
    return { ok: false, normalized, error: `Use at most ${MAX} characters.` };
  }
  if (RESERVED.has(normalized)) {
    return { ok: false, normalized, error: "That username is reserved." };
  }
  return { ok: true, normalized };
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/usernames.ts
git commit -m "feat(usernames): validation util with reserved words + charset"
```

### Task 3.3: Apply validation + first-edit prompt + confirm-on-save in the editor

**Files:**
- Modify: `src/app/profile/edit/page.tsx`

- [ ] **Step 1: Import the validator**

Add to the imports (next to line 8's auth-utils import):

```tsx
import { validateUsername } from "@/lib/usernames";
```

- [ ] **Step 2: Reject reserved/invalid usernames in the manual-edit handler**

In the manual slug edit effect (around lines 190–204), before the availability network check, short-circuit invalid usernames. Locate the `slugCheckRef.current = setTimeout(async () => {` inside the manual-edit handler and prepend a synchronous validity gate in the handler body (before scheduling the timeout):

```tsx
    const check = validateUsername(value);
    if (!check.ok) {
      setSlugStatus("taken"); // reuse the existing "taken" visual + disabled submit
      // Surface the specific reason via the existing error channel:
      setError(check.error ?? null);
      return;
    }
    setError(null);
```

(Keep the existing availability timeout logic after this gate for valid usernames.)

- [ ] **Step 3: Enforce on submit**

In `handleSubmit` (around line 281 where `finalSlug` is computed), replace the `const finalSlug = slug.replace(/^-|-$/g, "");` line with:

```tsx
      const usernameCheck = validateUsername(slug);
      if (!usernameCheck.ok) {
        setError(usernameCheck.error ?? "Invalid username.");
        setSaving(false);
        return;
      }
      const finalSlug = usernameCheck.normalized;
```

- [ ] **Step 4: Set `slug_confirmed` on save**

In the same submit handler, add `slug_confirmed: true` to BOTH the update payload (around line 286) and the insert payload (around line 350), alongside the existing `slug: finalSlug` / `onboarding_completed` fields.

- [ ] **Step 5: Prompt backfilled members on first edit**

Add a banner above the slug field. First, read the flag from the loaded member — near the prefill effect (around line 96 where `setSlug(member.slug || "")`), add a state and set it:

```tsx
  const [needsUsernamePrompt, setNeedsUsernamePrompt] = useState(false);
```
and in the prefill effect:
```tsx
      setNeedsUsernamePrompt(member.slug_confirmed === false);
```
Then render the prompt just above the slug `<label htmlFor="slug">` (around line 458):
```tsx
              {needsUsernamePrompt && (
                <p className={styles.hint}>
                  Pick the username for your public profile URL — you can change
                  it anytime.
                </p>
              )}
```

- [ ] **Step 6: Verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Manual test (local, `TEST_LOGIN_ENABLED=true`)**

1. Sign in as `dwtest` / `424242` → `/profile/edit`.
2. Try username `admin` → blocked with "reserved" message; submit disabled.
3. Try `ab` → blocked ("at least 3 characters").
4. Try `my-name` → "Available"; save succeeds; revisit edit → prompt no longer shown (slug_confirmed now true).
Record in the test plan.

- [ ] **Step 8: Commit**

```bash
git add src/app/profile/edit/page.tsx
git commit -m "feat(usernames): reserved-word validation + first-edit prompt + confirm flag"
```

---

## Unit 4 — Admin approve / reject

**Goal:** Approve/Reject (with feedback) from the admin pending list. User-facing display already exists in the dashboard.

### Task 4.1: Approve endpoint

**Files:**
- Create: `src/app/api/admin/members/[id]/approve/route.ts`

- [ ] **Step 1: Write the route (mirrors set-admin)**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ review_status: "approved", is_approved: true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, memberId: id, reviewStatus: "approved" });
}
```

- [ ] **Step 2: Verify + commit**

```bash
npm run lint
git add "src/app/api/admin/members/[id]/approve/route.ts"
git commit -m "feat(admin): approve member endpoint"
```

### Task 4.2: Reject endpoint

**Files:**
- Create: `src/app/api/admin/members/[id]/reject/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";

interface Body {
  feedback?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  const feedback = (body.feedback ?? "").trim();
  if (!feedback) {
    return NextResponse.json(
      { error: "Rejection feedback is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({
      review_status: "rejected",
      is_approved: false,
      rejection_feedback: feedback,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, memberId: id, reviewStatus: "rejected" });
}
```

- [ ] **Step 2: Verify + commit**

```bash
npm run lint
git add "src/app/api/admin/members/[id]/reject/route.ts"
git commit -m "feat(admin): reject member endpoint with required feedback"
```

### Task 4.3: Approve/Reject buttons in the admin pending list

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add review action state**

After the `actioning` state (line 43), add:

```tsx
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Member | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
```

- [ ] **Step 2: Add the action handlers**

After `runImpersonate` (line 148), add:

```tsx
  const runApprove = async (m: Member) => {
    setReviewing(m.id);
    setReviewError(null);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setReviewError(b.error || `Failed (${res.status})`);
      } else {
        setPendingMembers((prev) => prev.filter((p) => p.id !== m.id));
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Request failed");
    }
    setReviewing(null);
  };

  const runReject = async () => {
    if (!rejectFor) return;
    setReviewing(rejectFor.id);
    setReviewError(null);
    try {
      const res = await fetch(`/api/admin/members/${rejectFor.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: rejectFeedback }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setReviewError(b.error || `Failed (${res.status})`);
      } else {
        const rejectedId = rejectFor.id;
        setPendingMembers((prev) => prev.filter((p) => p.id !== rejectedId));
        setRejectFor(null);
        setRejectFeedback("");
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Request failed");
    }
    setReviewing(null);
  };
```

- [ ] **Step 3: Add buttons to each pending member**

In the pending list, replace the `<div className={styles.memberActions}>` block (lines 227–234) with:

```tsx
                    <div className={styles.memberActions}>
                      <Link
                        href={`/directory/${m.slug}`}
                        className={styles.previewLink}
                      >
                        Preview
                      </Link>
                      <button
                        type="button"
                        className={styles.actionButton}
                        disabled={reviewing === m.id}
                        onClick={() => runApprove(m)}
                      >
                        {reviewing === m.id ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        disabled={reviewing === m.id}
                        onClick={() => {
                          setRejectFor(m);
                          setRejectFeedback("");
                        }}
                      >
                        Reject
                      </button>
                    </div>
```

- [ ] **Step 4: Add the reject-feedback dialog + error**

Right after the Pending Approvals card's closing `</div>` (line 239), add the error line inside the card before its close, and add a dialog near the bottom (next to the existing `ConfirmDialog`, around line 315). For the feedback dialog reuse `ConfirmDialog` with a textarea passed as children if it supports it; otherwise render a minimal inline modal:

```tsx
      {reviewError && <p className={styles.statusError}>{reviewError}</p>}

      {rejectFor && (
        <ConfirmDialog
          title={`Reject ${rejectFor.first_name} ${rejectFor.last_name}`}
          message="Explain what needs to change. This is shown to the member on their dashboard."
          confirmLabel="Send rejection"
          onConfirm={runReject}
          onCancel={() => {
            setRejectFor(null);
            setRejectFeedback("");
          }}
          loading={reviewing === rejectFor.id}
        >
          <textarea
            className={styles.searchInput}
            rows={4}
            placeholder="Feedback for the member…"
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
          />
        </ConfirmDialog>
      )}
```

If `ConfirmDialog` does not accept `children`, open `src/components/ConfirmDialog` and add `children?: React.ReactNode` to its props and render `{children}` below the message. Make that change as part of this step and commit it together.

- [ ] **Step 5: Verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Manual test (local)**

1. Create a pending member: sign in as `dwtest`, complete onboarding, submit for review (dashboard "Submit for review").
2. Impersonate/sign in as an admin (use `/api/dev/sign-in?as=admin-waterloo` in dev) → `/admin`.
3. The dwtest member appears under Pending Approvals.
4. Approve → it disappears from pending; confirm in directory (after ISR) or DB `review_status='approved'`.
5. Repeat with a second pending member → Reject with feedback → DB shows `review_status='rejected'`, `rejection_feedback` set; sign in as that member → dashboard shows the feedback (existing UI).
Record results.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/page.tsx src/components/ConfirmDialog
git commit -m "feat(admin): approve/reject buttons with feedback dialog"
```

---

## Unit 5 — Data Issues panel + reviewed cleanup migration

**Goal:** A live detector panel (orphan logins, junk-domain rows, duplicate pairs) with link/merge/delete actions, plus one reviewed migration that fixes the known cases.

### Task 5.1: Detector + action API

**Files:**
- Create: `src/app/api/admin/data-issues/route.ts`

- [ ] **Step 1: Write the route (GET = detect, POST = act)**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/supabase/auth-utils";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();

  // Junk-domain rows: school_email domain not in the allowlist.
  const { data: allMembers } = await admin
    .from("members")
    .select("id, first_name, last_name, slug, school_email, auth_user_id, review_status, is_approved");

  const members = allMembers ?? [];
  const junk = members.filter((m) => {
    const domain = m.school_email.split("@")[1]?.toLowerCase();
    return !domain || !ALLOWED_EMAIL_DOMAINS.includes(domain);
  });

  // Duplicate name pairs (one linked + one unlinked is the classic signature).
  const byName = new Map<string, typeof members>();
  for (const m of members) {
    const key = `${m.first_name.trim().toLowerCase()} ${m.last_name.trim().toLowerCase()}`;
    byName.set(key, [...(byName.get(key) ?? []), m]);
  }
  const duplicates = [...byName.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([name, rows]) => ({ name, rows }));

  // Orphan logins: auth users with no linked member.
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const linkedUserIds = new Set(
    members.filter((m) => m.auth_user_id).map((m) => m.auth_user_id),
  );
  const orphanLogins = (authList?.users ?? [])
    .filter((u) => !linkedUserIds.has(u.id))
    .map((u) => ({
      userId: u.id,
      email: u.email,
      fullName: (u.user_metadata?.full_name as string) || null,
    }));

  return NextResponse.json({ junk, duplicates, orphanLogins });
}

interface ActionBody {
  action?: "link" | "merge" | "delete";
  userId?: string;       // for link
  keepId?: string;       // for merge (the row to keep)
  dropId?: string;       // for merge/delete (the row to remove)
  memberId?: string;     // for link/delete target
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "link" && body.userId && body.memberId) {
    const { error } = await admin
      .from("members")
      .update({ auth_user_id: body.userId })
      .eq("id", body.memberId)
      .is("auth_user_id", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "merge" && body.keepId && body.dropId) {
    // Move the auth link from the dropped row onto the kept row, then delete
    // the dropped row. The kept row should be the approved/good-data one.
    const { data: drop } = await admin
      .from("members")
      .select("auth_user_id")
      .eq("id", body.dropId)
      .maybeSingle();

    if (drop?.auth_user_id) {
      // Clear the link on the kept row first to avoid a unique conflict, then set it.
      await admin.from("members").update({ auth_user_id: null }).eq("id", body.keepId);
      const { error: linkErr } = await admin
        .from("members")
        .update({ auth_user_id: drop.auth_user_id })
        .eq("id", body.keepId);
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
    const { error: delErr } = await admin.from("members").delete().eq("id", body.dropId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.memberId) {
    const { error } = await admin.from("members").delete().eq("id", body.memberId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

Note: `ALLOWED_EMAIL_DOMAINS` is exported from `auth-utils.ts` (verified). In production the test domain is excluded, so the `dwtest@mylaurier.ca` row stays valid (mylaurier.ca is allowed).

- [ ] **Step 2: Verify + commit**

```bash
npm run lint
git add src/app/api/admin/data-issues/route.ts
git commit -m "feat(admin): data-issues detectors + link/merge/delete actions"
```

### Task 5.2: Data Issues admin page

**Files:**
- Create: `src/app/admin/data-issues/page.tsx`
- Create: `src/app/admin/data-issues/page.module.css`
- Modify: `src/app/admin/page.tsx` (add a link to the panel)

- [ ] **Step 1: Write the page**

`src/app/admin/data-issues/page.tsx` (client component, fetches detectors, renders actions):

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  school_email: string;
  auth_user_id: string | null;
  review_status: string;
  is_approved: boolean;
}
interface Detected {
  junk: MemberRow[];
  duplicates: { name: string; rows: MemberRow[] }[];
  orphanLogins: { userId: string; email: string | null; fullName: string | null }[];
}

export default function DataIssuesPage() {
  const { member, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detected | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!member || !member.is_admin)) router.replace("/");
  }, [loading, member, router]);

  const load = useMemo(
    () => async () => {
      const res = await fetch("/api/admin/data-issues");
      if (res.ok) setData((await res.json()) as Detected);
      else setError(`Failed to load (${res.status})`);
    },
    [],
  );

  useEffect(() => {
    if (member?.is_admin) load();
  }, [member, load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error || `Failed (${res.status})`);
      } else {
        await load();
      }
    } catch {
      setError("Request failed.");
    }
    setBusy(false);
  };

  if (loading || !member?.is_admin) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className={styles.section}>
          <h1>Data Issues</h1>
          {error && <p className={styles.error}>{error}</p>}
          {!data ? (
            <p>Loading detectors…</p>
          ) : (
            <>
              <div className={styles.card}>
                <h2>Duplicate name pairs ({data.duplicates.length})</h2>
                {data.duplicates.length === 0 && <p>None.</p>}
                {data.duplicates.map((d) => (
                  <div key={d.name} className={styles.group}>
                    <p className={styles.groupTitle}>{d.name}</p>
                    {d.rows.map((r) => (
                      <div key={r.id} className={styles.row}>
                        <span>
                          {r.school_email} · {r.review_status} ·{" "}
                          {r.auth_user_id ? "linked" : "unlinked"}
                        </span>
                        <span className={styles.actions}>
                          {d.rows
                            .filter((o) => o.id !== r.id)
                            .map((o) => (
                              <button
                                key={o.id}
                                disabled={busy}
                                onClick={() =>
                                  act({ action: "merge", keepId: r.id, dropId: o.id })
                                }
                              >
                                Keep this, drop {o.school_email}
                              </button>
                            ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h2>Junk-domain rows ({data.junk.length})</h2>
                {data.junk.length === 0 && <p>None.</p>}
                {data.junk.map((r) => (
                  <div key={r.id} className={styles.row}>
                    <span>
                      {r.first_name} {r.last_name} · {r.school_email}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => act({ action: "delete", memberId: r.id })}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h2>Orphan logins ({data.orphanLogins.length})</h2>
                {data.orphanLogins.length === 0 && <p>None.</p>}
                {data.orphanLogins.map((o) => (
                  <div key={o.userId} className={styles.row}>
                    <span>
                      {o.email} {o.fullName ? `· ${o.fullName}` : ""}
                    </span>
                  </div>
                ))}
                <p className={styles.note}>
                  To link an orphan login to an unlinked member, merge the
                  duplicate pair above (if one exists) or fix via SQL.
                </p>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Write minimal styles**

`src/app/admin/data-issues/page.module.css`:

```css
.section { max-width: 880px; margin: 0 auto; padding: 3rem var(--margin); display: flex; flex-direction: column; gap: 1.5rem; }
.card { border: 1px solid rgba(0,0,0,0.12); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.group { border-top: 1px solid rgba(0,0,0,0.08); padding-top: 0.5rem; }
.groupTitle { font-weight: 600; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-size: 0.9rem; }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.row button { padding: 0.35rem 0.6rem; border: 1px solid rgba(0,0,0,0.2); border-radius: 8px; cursor: pointer; }
.note { font-size: 0.8rem; opacity: 0.6; }
.error { color: #c0392b; }
```

- [ ] **Step 3: Link to the panel from the admin dashboard**

In `src/app/admin/page.tsx`, under the `<h1>Admin Dashboard</h1>` subtitle (line 205), add:

```tsx
          <p className={styles.subtitle}>
            <Link href="/admin/data-issues">→ Data Issues</Link>
          </p>
```

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/data-issues src/app/admin/page.tsx
git commit -m "feat(admin): data-issues panel UI"
```

### Task 5.3: Reviewed cleanup migration for known cases

**Files:**
- Migration: `reconcile_existing_members`

- [ ] **Step 1: Snapshot current state (read-only, save output)**

Run and save the output to paste into the test plan:

```sql
SELECT id, first_name, last_name, school_email, slug, review_status,
       auth_user_id IS NULL AS unlinked
FROM members
WHERE lower(first_name)||' '||lower(last_name)
      IN ('frances zhao','raghav agarwal','victoria feng','spark mark')
   OR school_email IN ('hkim22@uoguelph.ca','aileen-luo@placeholder.edu')
ORDER BY first_name, last_name;
```

- [ ] **Step 2: Get explicit sign-off on the SQL below before applying**

Present this exact SQL to the user and wait for approval. It (a) merges the three dup pairs by moving the draft's auth link onto the approved backfill row and deleting the draft, (b) links spark.mark's orphan login to the s5mark backfill, (c) deletes the two junk rows. Each statement is scoped by email so it cannot touch unrelated rows.

```sql
-- == Dup merges: keep the approved backfill row, adopt the draft's auth link ==
-- Frances Zhao
WITH draft AS (
  SELECT auth_user_id FROM members WHERE school_email = 'frances.zhao@uwaterloo.ca'
)
UPDATE members SET auth_user_id = (SELECT auth_user_id FROM draft)
WHERE school_email = 'f54zhao@uwaterloo.ca';
DELETE FROM members WHERE school_email = 'frances.zhao@uwaterloo.ca';

-- Raghav Agarwal
WITH draft AS (
  SELECT auth_user_id FROM members WHERE school_email = 'raghav.agarwal@uwaterloo.ca'
)
UPDATE members SET auth_user_id = (SELECT auth_user_id FROM draft)
WHERE school_email = 'r37agarw@uwaterloo.ca';
DELETE FROM members WHERE school_email = 'raghav.agarwal@uwaterloo.ca';

-- Victoria Feng
WITH draft AS (
  SELECT auth_user_id FROM members WHERE school_email = 'victoria.feng@uwaterloo.ca'
)
UPDATE members SET auth_user_id = (SELECT auth_user_id FROM draft)
WHERE school_email = 'v9feng@uwaterloo.ca';
DELETE FROM members WHERE school_email = 'victoria.feng@uwaterloo.ca';

-- == Orphan login link: Spark Mark (no dup row yet) ==
UPDATE members
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'spark.mark@uwaterloo.ca'
)
WHERE school_email = 's5mark@uwaterloo.ca' AND auth_user_id IS NULL;

-- == Junk rows: no valid login possible ==
DELETE FROM members WHERE school_email = 'hkim22@uoguelph.ca';
DELETE FROM members WHERE school_email = 'aileen-luo@placeholder.edu';
```

- [ ] **Step 3: Apply via `apply_migration` named `reconcile_existing_members` (only after sign-off).**

- [ ] **Step 4: Verify (re-run the Step 1 snapshot)**

Expected after: `frances.zhao@`, `raghav.agarwal@`, `victoria.feng@` rows gone; `f54zhao@`, `r37agarw@`, `v9feng@`, `s5mark@` now linked (`unlinked=false`) and still `approved`; the two junk rows gone. Paste before/after into the test plan.

- [ ] **Step 5: Commit (the snapshot/notes; migration is applied via MCP, not a repo file)**

```bash
git add docs/superpowers/test-plan-member-reconciliation.md
git commit -m "chore(data): record reconcile_existing_members before/after snapshots"
```

---

## Task 6.1: Author the manual test plan

**Files:**
- Create: `docs/superpowers/test-plan-member-reconciliation.md`

- [ ] **Step 1: Write the checklist file**

Create `docs/superpowers/test-plan-member-reconciliation.md` covering every case below, each with a checkbox, steps, expected result, and a blank for actual result:

```markdown
# Manual Test Plan — Member Data Reconciliation

Run with `TEST_LOGIN_ENABLED=true npm run dev` unless noted. Record actual results.

## Unit 1 — Test login
- [ ] Send Code for `dwtest` shows the code box without sending email.
- [ ] `424242` signs in → `/profile/edit`. (actual: ___)
- [ ] With the flag OFF, verify fails ("Test login disabled"); no session. (actual: ___)
- [ ] A normal `@mylaurier.ca` username still gets a real OTP (regression). (actual: ___)

## Unit 2 — Matching & claim
- [ ] DB check: f54zhao / adnardi / winston.zhao are unlinked before tests. (actual: ___)
- [ ] (Observational, prod) A WatIAM-id backfill logging in links its row, no dup. (actual: ___)
- [ ] (Observational, prod) An alias backfill logging in links its row, no dup. (actual: ___)
- [ ] No-match user with a same-name unlinked row → `/claim` lists it; "This is me" links it → `/profile/edit`. (actual: ___)
- [ ] "None of these" → fresh draft → `/profile/edit`. (actual: ___)
- [ ] Genuinely new user (no name match) → straight to `/profile/edit` with a draft. (actual: ___)

## Unit 3 — Usernames
- [ ] `admin` rejected (reserved). (actual: ___)
- [ ] `ab` rejected (too short). (actual: ___)
- [ ] Taken slug rejected. (actual: ___)
- [ ] Valid slug saves; URL is `/directory/<slug>`. (actual: ___)
- [ ] Backfilled member sees the username prompt on first edit; gone after save. (actual: ___)

## Unit 4 — Admin approve/reject
- [ ] Pending member shows Approve/Reject. (actual: ___)
- [ ] Approve → leaves pending, `review_status=approved`, appears in directory. (actual: ___)
- [ ] Reject without feedback blocked. (actual: ___)
- [ ] Reject with feedback → `review_status=rejected`; member dashboard shows feedback. (actual: ___)
- [ ] Non-admin gets 403 from approve/reject endpoints. (actual: ___)

## Unit 5 — Data issues + migration
- [ ] Panel lists 3 duplicate pairs, 2 junk rows, orphan logins (pre-migration). (actual: ___)
- [ ] reconcile_existing_members before/after snapshots (paste): ___
- [ ] After migration: panel shows 0 known duplicates, 0 junk rows. (actual: ___)
- [ ] Merge action on a fresh test dup pair works + reversible check. (actual: ___)
- [ ] Delete action on a test junk row works. (actual: ___)
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/test-plan-member-reconciliation.md
git commit -m "docs: manual test plan for member reconciliation"
```

---

## Environment / deploy notes

- Add `TEST_LOGIN_ENABLED` to the deployment env (Vercel) — leave **unset/false** by default; set to `true` only for a testing window.
- `SUPABASE_SERVICE_ROLE_KEY` must be present server-side (already used by dev sign-in + admin routes).
- No new public env vars. `TEST_LOGIN_EMAIL` is a hardcoded non-secret constant.

## Self-review notes (spec coverage)

- #1 test account → Unit 1 (Tasks 1.1–1.3). ✓
- #2 existing members can edit → Unit 2 dual-identifier match (2.1–2.2) + claim (2.3–2.4). ✓
- #3 user-chosen usernames → Unit 3 (3.1–3.3), building on existing slug editor. ✓
- #4 duplicates/broken data → Unit 5 panel (5.1–5.2) + reviewed migration (5.3). ✓
- Admin approve/reject (in-scope addition) → Unit 4 (4.1–4.3); user-facing display already exists. ✓
- Extensive testing → manual test plan (Task 6.1) + per-task manual steps. ✓
```
