# Account suite verification — September 9, 2026

## Implemented in this pass

- Account settings includes permanent deletion with two independent confirmations: exact `delete my account` phrase and the current full name. The endpoint verifies the authenticated user, same-origin request, both inputs, and absence of an impersonation session. It never accepts a target member ID. Auth deletion happens first; foreign-key cascades remove the profile, experience, leadership and work records. Session cookies are cleared and public pages revalidated only after successful deletion.
- Shared admin/delete confirmation dialogs use modal semantics, labelled content, keyboard focus containment, focus restoration and Escape. Busy requests cannot be dismissed.
- Review feedback is visible on the dashboard. Approval clears previous rejection feedback and refreshes public caches; rejection also refreshes those caches. Non-string feedback receives a validation error.
- Submission requires completed onboarding. Repeated submission preserves its original timestamp.
- Onboarding remembers the last reached step for the same browser tab/account and restores saved fields after reload. Replay still starts at the introduction. Onboarding and dashboard both allow five skills.
- Username save confirmation survives the member refresh.
- Social URL validation now runs in Supabase as well as the dashboard. Legacy unchanged values can remain until edited. This validates platform/domain/profile shape, not ownership of the social account or whether it exists.
- Notification failures are visible and retryable without losing a submission. Ando now requires `ANDO_REVIEW_API_KEY` bound to an agent in Design Waterloo; the personal credential is no longer a fallback.

## Results

- 75 unit/database tests passed.
- 46 browser tests passed in the final complete run.
- Optimized production build passed, including TypeScript checks. Existing lint warnings remain in unrelated UI files.
- The account deletion dialog was opened and canceled in the real local preview. Destructive endpoint tests used only the synthetic fixture.

## Live database verification

`20260909020000_profile_link_validation.sql` was applied through the personal Arc Supabase session, project `skalyworwmxcofolgnjs`. A valid GitHub URL was accepted and a spoofed domain rejected on the demo account inside a transaction that was rolled back. No member data was retained from this check.

Verified live `ON DELETE CASCADE` constraints: members → auth.users; member_experiences, member_leadership and works → members. The previously applied review RLS migration remains in place. No real account was deleted during testing.

## Test boundaries and remaining release gates

The browser suite uses an isolated synthetic Supabase protocol fixture on localhost, with external browser requests blocked. It exercises application routes, cookies, UI and error handling; the database tests independently execute real SQL in PGlite. The combined lifecycle test exercises submission, changes, editing, resubmission, approval, public profile and unpublishing. Onboarding has separate complete browser coverage, including resuming after reload. Role tests verify privileged API denial and immediate revocation in an existing session.

Still requires live verification:

- Real Waterloo Microsoft sign-in and Laurier OTP delivery. Synthetic sign-in does not prove those external providers are configured or delivering correctly.
- Real image upload/CDN delivery. Crop interaction is browser-tested, but the upload provider is not exercised by this suite.
- Provision an agent-bound Ando credential. The existing connection identifies as Brayden; no messages were sent during this audit. Agent creation does not itself return a usable credential. Submission remains functional without notification delivery. Delivery is retried but is not a durable database outbox.
- Account deletion removes database/account records; it does not purge previously uploaded Sanity assets or provider backups. Asset ownership/retention cleanup is a separate remaining concern; do not describe this as erasing every third-party copy.
- Application deployment and smoke tests on the production domain. This pass builds locally and applies the stated SQL migration, but does not deploy application changes.
