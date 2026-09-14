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
