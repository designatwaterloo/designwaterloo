# Member Data Reconciliation & Onboarding Fixes — Design

**Date:** 2026-06-27
**Status:** Approved (pending spec review)

## Problem

Member data is in a mismatched state. Most existing members were backfilled from
the old Sanity directory and have never logged into Design Waterloo. When they do
log in, several things go wrong, and the new-member admin flow is incomplete.

Four issues to address:

1. No test account that works on the live site for end-to-end auth/visibility testing.
2. Existing (backfilled) members are sometimes forced to create a brand-new account
   instead of editing their pre-existing profile.
3. Usernames are forced into a `firstname-lastname[-N]` pattern; users cannot choose
   or change them.
4. Duplicate accounts and broken/dirty data exist and need repair or flagging.

## Root-cause investigation (production data, 2026-06-27)

Snapshot: **58 member rows, 23 auth users.**

- **42 of 58 members have `auth_user_id = NULL`** — backfilled, never linked to a login.
- Every member row has `school_email` populated. No casing/whitespace problems; no
  duplicate emails; no duplicate slugs.
- The link logic in `src/lib/supabase/member-init.ts` already matches a login to a
  backfilled row by **exact `school_email`**, and this works: `fxfang@`, `g3tran@`,
  `dstirlin@`, `m2tannahill@`, `szehuang@`, `l3vu@` all linked cleanly.

### Why issue #2 still happens

Waterloo accounts have **two valid email forms** for the same person: the WatIAM id
(e.g. `f54zhao@uwaterloo.ca`) and the first.last alias (e.g.
`frances.zhao@uwaterloo.ca`). Azure (LEARN) returns one form; the Sanity backfill
stored the other. Exact-email match misses, and `findOrInitMember` creates a new
empty draft — orphaning the real, approved backfill profile. There is no derivable
relationship between `f54zhao` and `frances.zhao`, so email normalization cannot
bridge them.

**Three confirmed duplicate pairs already exist from this exact mechanism:**

| Person | Orphaned backfill (good data) | Auto-created on login (empty) |
|---|---|---|
| Frances Zhao | `f54zhao@` · approved · slug `frances-zhao` | `frances.zhao@` · draft · slug `frances-zhao-1` |
| Raghav Agarwal | `r37agarw@` · approved · slug `raghav-agarwal` | `raghav.agarwal@` · draft · slug `raghav-agarwal-1` |
| Victoria Feng | `v9feng@` · approved · slug `victoria-feng` | `victoria.feng@` · draft · slug `victoria-feng-1` |

In each pair the unlinked row holds the real approved profile; the linked row is an
empty draft created at first login.

### Other orphan logins (auth users with no linked member)

- `a34xie@uwaterloo.ca` (Aaryn Xie), `chavi.sharma@uwaterloo.ca` (Chavi Sharma) —
  no matching backfill row by name; these are genuinely **new** users. They also
  have **no draft row at all**, which indicates a secondary bug: the email-miss path
  did not persist a draft for them.
- `spark.mark@uwaterloo.ca` (Spark Mark) — backfill row `s5mark@uwaterloo.ca` exists
  (alias-vs-WatIAM mismatch, same class as the table above; not yet duplicated).
- `brayden@mylaurier.ca`, `bbbbbbbb@mylaurier.ca`, `herd4220@mylaurier.ca`,
  `woong5970@mylaurier.ca` — test/junk Laurier logins, no backfill match.

### Dirty backfill rows

- `hkim22@uoguelph.ca` (Hyunjin Kim) — a `uoguelph.ca` address can **never** log in
  (fails `isValidStudentEmail`). Broken identity.
- `aileen-luo@placeholder.edu` (Aileen Luo) — placeholder email for missing data.

## Decisions (from brainstorming)

- **#2 reconciliation:** user-facing **claim-your-profile** flow.
- **#3 usernames:** user picks once at onboarding, editable anytime; old URL **not**
  preserved on change.
- **#1 test account:** single hardcoded email + fixed OTP `424242`, gated behind a
  server env flag `TEST_LOGIN_ENABLED` (off by default; works in prod when on).
- **#4 repair:** auto-fix the obvious cases via a **reviewed** migration; flag the
  rest in a new admin "Data Issues" panel. Nothing destructive without sign-off.
- **Admin review:** include working **approve/reject** UI in this work.

## Architecture — five independent units

### Unit 1 — Test login (#1)

A dedicated route `POST /api/auth/test-login` that authenticates **one allowlisted
email** with the fixed code `424242`, active only when `TEST_LOGIN_ENABLED=true`.

- A true fixed OTP cannot go through Supabase `verifyOtp` (it validates the real
  emailed token), so this is a parallel, explicitly-gated path — not a change to
  real OTP behaviour.
- Mechanism mirrors the existing `src/app/api/dev/sign-in/route.ts`: service-role
  client ensures the auth user + member row exist, then `signInWithPassword` and
  forward the session cookies on the redirect response.
- Guards: returns 404 unless `TEST_LOGIN_ENABLED === "true"`; only the configured
  test email is accepted; only the code `424242` is accepted; all other emails fall
  through to the normal OTP flow untouched.
- The sign-in page shows the standard OTP entry box for the test email so the human
  flow is identical to a real Laurier login.

**Boundary:** one endpoint + a small hook in the sign-in page. Depends on env flag
and service-role key only.

### Unit 2 — Claim-your-profile (#2)

Refactor `findOrInitMember` so first login resolves in this order:

1. `auth_user_id` match → fast path (returning user). *(unchanged)*
2. Exact `school_email` match, unlinked → link `auth_user_id`. *(unchanged — the
   common, working path)*
3. **No exact match → find unlinked candidate rows by name** (normalized
   `first_name`+`last_name`, plus trigram similarity for near matches), scoped to the
   same school. **Do not create a draft yet.** Return a signal that routes the user
   to `/claim`.
4. No candidates → create a draft as today (genuinely new user). This path is also
   fixed so a draft is reliably persisted (addresses the missing-draft bug seen for
   Aaryn Xie / Chavi Sharma).

New `/claim` page: *"Is this you?"* lists candidate profiles (name, school, program).

- **This is me** → server action links `auth_user_id` to the chosen row (guarded: the
  row must still be unlinked at write time, to avoid races/double-claims), then sends
  the user into profile edit to confirm details and set their username. The claimed
  profile re-enters `pending_review` so an admin sees it before it is public.
- **None of these → start fresh** → create a draft and continue to onboarding.

**Security note:** name-based claiming carries an identity-spoofing risk. Mitigations
in v1: the claimant is already authenticated with a valid university email; the
claimed profile re-enters review before going public; every claim is logged and shown
in the admin Data Issues panel (Unit 5). Admin-gating claims before they take effect
is a deferred v1.1 option if abuse appears.

**Open implementation detail for the plan:** after a claim, whether to overwrite
`school_email` with the verified login email (so future logins exact-match) or leave
it and rely on the `auth_user_id` fast path. Default recommendation: set
`school_email` to the login email; `auth_user_id` is canonical regardless.

**Boundary:** changes to `member-init.ts`, a new `/claim` route + server action, and
a name-candidate query helper.

### Unit 3 — User-chosen usernames (#3)

- New `username` validation utility: lowercase, `[a-z0-9-]` only, length bounds,
  collapse/trim hyphens, reserved-word blocklist (`admin`, `api`, `directory`,
  `sign-in`, `auth`, `claim`, `dashboard`, `profile`, etc.).
- Debounced availability-check endpoint (uniqueness excluding the current member).
- Username field surfaced prominently in **onboarding** and **profile edit**,
  prefilled with the current slug as a suggestion, editable anytime. Changing it
  changes the public `/directory/<slug>` URL; the old slug is not preserved.
- New column **`slug_confirmed boolean default false`**. Backfilled rows are `false`
  → on a member's first edit the username field is highlighted/prompted. Set `true`
  once the user confirms/sets it.
- `generateSlug` is retained only to produce the default *suggestion*; it is no longer
  the forced identity.

**Boundary:** validation util + availability endpoint + form UI + one column +
follow-on slug uniqueness handling on save.

### Unit 4 — Admin approve/reject (#4 adjacent)

- `POST /api/admin/members/[id]/approve` and `POST /api/admin/members/[id]/reject`
  (reject accepts feedback text), behind the existing admin guard.
- Writes the schema fields that already exist: `review_status`, `is_approved`,
  `submitted_at`, `rejected_at`, `rejection_feedback`.
- Wire **Approve / Reject** buttons into the admin pending-review list.
- Surface rejection feedback to the member on their dashboard / pending view so the
  onboarding → review → directory loop closes.

**Boundary:** two API routes + admin list buttons + a user-facing feedback display.

### Unit 5 — Data Issues panel + reviewed cleanup (#4)

Admin "Data Issues" view driven by **live detectors** (no schema churn):

- **Orphan logins** — auth users with no linked member.
- **Junk-domain rows** — `school_email` outside allowed domains (`uoguelph.ca`,
  `placeholder.edu`).
- **Probable duplicate pairs** — same normalized name across rows (one linked draft +
  one unlinked approved is the signature).
- **Logged claims** — from Unit 2, for visibility.

Actions per issue: **link** (orphan login → backfill row), **merge** (fold duplicate
pair, keeping the approved row's data + clean slug, moving `auth_user_id`, deleting
the empty draft), **delete/quarantine** (junk rows).

**One reviewed migration** for the unambiguous cases — exact SQL handed over for
approval before it runs:

- Merge the three confirmed duplicate pairs (Frances Zhao, Raghav Agarwal, Victoria
  Feng): move `auth_user_id` from the empty draft onto the approved backfill row, set
  that row's `school_email` to the login email, restore the clean slug, delete the
  draft.
- Resolve the `spark.mark@` ↔ `s5mark@` orphan-login mismatch the same way (link, no
  merge needed — no duplicate yet).
- Quarantine/delete the `uoguelph.ca` and `placeholder.edu` junk rows after
  confirmation.

**Boundary:** detector queries + admin UI + action endpoints + one reviewed migration.
Reversible; nothing runs without sign-off.

## Sequencing

1. **Unit 1** (test login) — unblocks live end-to-end testing of everything else.
2. **Unit 3** (usernames) — self-contained.
3. **Unit 2** (claim flow) — the core reconciliation.
4. **Unit 4** (admin approve/reject).
5. **Unit 5** (data issues + cleanup migration).

Each unit is independently shippable.

## Schema changes

- `members.slug_confirmed boolean not null default false` (Unit 3).
- No other columns. Unit 5 detectors are computed live.

## Out of scope

- Preserving old usernames / 301 redirects on slug change.
- Admin pre-approval gating of claims (deferred v1.1).
- Automated fuzzy auto-merge without human confirmation.

## Testing

No automated test framework is configured (per CLAUDE.md, do not add one without
discussion). Verification is manual via the Unit 1 test account against each flow:
test login on/off, claim vs. fresh onboarding, username pick/edit/collision, admin
approve/reject, and each Data Issues action. The reviewed cleanup migration is
validated on the known three duplicate pairs before and after.
