# Manual Test Plan — Member Data Reconciliation

Run with `TEST_LOGIN_ENABLED=true npm run dev` unless noted. Record actual results.

## Unit 1 — Test login
- [ ] Send Code for `dwtest` shows the code box without sending email.
- [ ] `424242` signs in → `/profile/edit`. (actual: ___)
- [ ] With the flag OFF, verify fails ("Test login disabled"); no session. (actual: ___)
- [ ] A normal `@mylaurier.ca` username still gets a real OTP (regression). (actual: ___)

## Unit 2 — Matching & claim
- [ ] DB check: f54zhao / adnardi / winston.zhao are unlinked before tests. (verified 2026-06-28: all three unlinked)
- [ ] (Observational, prod) A WatIAM-id backfill logging in links its row via `preferred_username`, no dup. (actual: ___)
- [ ] (Observational, prod) An alias backfill logging in links its row via `email`, no dup. (actual: ___)
- [ ] No-match user with a same-name unlinked row → `/claim` lists it; "This is me" links it → `/profile/edit`. (actual: ___)
- [ ] "None of these" → fresh draft → `/profile/edit`. (actual: ___)
- [ ] Genuinely new user (no name match) → straight to `/profile/edit` with a draft. (actual: ___)
- [ ] Identifier match never returns a row already linked to a different auth user (review-fix #3). (actual: ___)

## Unit 3 — Usernames
- [ ] `admin` rejected (reserved). (actual: ___)
- [ ] `ab` rejected (too short). (actual: ___)
- [ ] Taken slug rejected. (actual: ___)
- [ ] Valid slug saves; URL is `/directory/<slug>`. (actual: ___)
- [ ] Backfilled member sees the username prompt on first edit; gone after save (`slug_confirmed`). (actual: ___)

## Unit 4 — Admin approve/reject
- [ ] Pending member shows Approve/Reject. (actual: ___)
- [ ] Approve → leaves pending, `review_status=approved`, appears in directory. (actual: ___)
- [ ] Reject without feedback blocked (400). (actual: ___)
- [ ] Reject with feedback → `review_status=rejected`; member dashboard shows feedback. (actual: ___)
- [ ] Non-admin gets 403 from approve/reject endpoints. (actual: ___)

## Unit 5 — Data issues + migration
- [x] `add_slug_confirmed` column migration APPLIED (2026-06-28).
- [x] Reconcile APPLIED (2026-06-28): merged Frances Zhao / Raghav Agarwal / Victoria Feng
      (draft auth link → approved row via `DELETE … RETURNING` CTE to respect the
      `members_auth_user_id_key` unique constraint; empty drafts deleted). Verified:
      each is now a single approved+linked row.
- [x] Hyunjin Kim (`hkim22@uoguelph.ca`) DELETED per instruction.
- [x] Aileen Luo (`aileen-luo@placeholder.edu`) KEPT per instruction (still approved, unlinked).
- [x] Spark Mark (`s5mark@uwaterloo.ca`) linked to orphan login `spark.mark@uwaterloo.ca`
      (2026-06-28, no duplicate existed — plain UPDATE).
- [ ] Merge action on a fresh test dup pair works + reversible check. (actual: ___)
- [ ] Delete action on a test junk row works. (actual: ___)

## Repair verification (the 3 people can now edit)
- [ ] Log in as Frances/Raghav/Victoria (their real Azure accounts) → fast-path matches
      `auth_user_id` → lands on their approved profile, NOT a new account. (actual: ___)
- [ ] They can open `/profile/edit` and SAVE changes (slug_confirmed column present). (actual: ___)
