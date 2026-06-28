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
- [ ] Panel lists 3 duplicate pairs, 2 junk rows, orphan logins (pre-migration). (actual: ___)
- [ ] reconcile_existing_members before/after snapshots (paste): ___
- [ ] After migration: panel shows 0 known duplicates, 0 junk rows. (actual: ___)
- [ ] Merge action on a fresh test dup pair works + reversible check. (actual: ___)
- [ ] Delete action on a test junk row works. (actual: ___)
