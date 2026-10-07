# First core-team recruitment

Implemented on `codex/core-team-recruitment`.

## Routes

- `/apply`: public sign-in introduction; authenticated application editor. No application data is returned to signed-out visitors.
- `/api/core-team/application`: authenticated GET, autosave PUT, submit POST. Writes require the same origin.
- `/admin/core-team`: full administrators can read submitted applications. Directory-only reviewers do not receive recruitment access. Drafts are visible only to their author.

The homepage, profile editor, and existing Get involved link lead to `/apply`. Both existing university sign-in methods retain the application destination for new accounts. Profile setup links return to the application after completion.

## Data and privacy

Apply `supabase/migrations/20260912010000_core_team_applications.sql` using the project's approved database migration process before enabling this feature on a shared environment. The migration has not been applied to the hosted database by this change. Follow account-routing/deployment preflight requirements; do not substitute accounts.

One application per member for `first-core-team-2026`. Draft answers autosave after 800 ms of inactivity; only one save is in flight per editor. Revisions prevent stale tabs from overwriting newer data. Failed/uncertain writes retain local text and support an idempotent retry. A pending or failed save activates the shared navigation warning. Drafts are restored from Supabase when the applicant returns.

Submission validates answers and profile completeness in the database, then freezes the answers and a selected profile snapshot atomically. It does not publish the profile, submit it to directory review, or grant any roles. Account deletion cascades to its application. No external messages or recruitment notifications are sent.

Required profile information: first and last name, university, program, graduation year, photo, bio, interests/skills, completed account setup and username. Social links and experience are optional. These checks are independent of profile publication.

The five prompts cover the campus design community, interests, a contribution the applicant is proud of, an optional supporting link, and optional availability. Required answers have no minimum word count. Upper character limits protect drafts without encouraging filler.

## Validation and preview

- `npx tsx --test tests/core-team.test.ts`: real PostgreSQL semantics in PGlite, including row-level privacy, write permissions, duplicate retries, version conflicts, profile requirements, and immutable submissions.
- `npx playwright test tests/browser/core-team.spec.ts`: synthetic loopback account fixture, API/UI integration, autosave/recovery, resumed drafts, submission, and responsive screenshots.
- `npx tsx tests/browser/server.ts`: standalone synthetic preview at `http://localhost:3100/apply`. Uses test data and no hosted database. Data lasts for that server process.

Before release: apply the migration on the intended database, verify with a disposable test member, review required profile fields, and verify the production `/apply` route. No public deployment has been made.

## Interim updates signup (October 2026)

Applications default to closed. `/apply` redirects to `/apply/updates`, and the dashboard banner says “Sign up for updates.” The application API also refuses reads and writes while closed. Set `CORE_TEAM_APPLICATIONS_OPEN=true` only after completing the migration, tailored-question work, and production verification above.

Signed-in members can explicitly opt in with their verified account email, without completing a profile. Consent is stored in the existing Supabase Auth `user_metadata.core_team_updates_first_2026` object (`subscribed`, `updated_at`, `source`). Other metadata is preserved. Returning to `/apply/updates` restores the preference and allows opt-out. Signup does not send an email or create an application.

When recruitment opens, send the opening announcement through the approved email workflow to verified Auth users whose current preference has `subscribed: true`, using their current account email. Supabase Auth admin `listUsers` must be paginated when assembling that list; do not treat profile publication or application drafts as email consent. There is no automatic launch-email sender in this release, so the announcement is a required launch task. Never expose the Auth user list or service-role key to the browser.

Browser verification: `DW_TEST_APPLICATIONS_OPEN=false npx playwright test tests/browser/core-team-updates.spec.ts`. Existing application tests use an explicitly open synthetic fixture and do not open production recruitment.
