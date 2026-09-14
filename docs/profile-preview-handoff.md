# Profile design handoff

Run `npm install` and `npm run dev`, then open `/dev/profile-preview`. The development-only route reads `tests/fixtures/profile-preview.json`; an ignored `.local-profile-preview.json` can override it. The fixture contains display-only profile fields and placeholder row IDs, with no account credentials. Use the usual project environment configuration for the app shell.

The shared profile now uses the editor's work/study schedule, including academic term labels and the red Now marker. New-grad availability is shown above the grid, using Spring of the graduation year under the current schedule convention. Work terms link to positions starting in that term; ambiguous matches offer a chooser. Unknown dates remain unlinked.

All profile handles use @ and Inter optical size 14. Position accordions have square edges, no list gaps, one open at a time, opening animation with reduced-motion support, city/country locations, and external company links with favicons. Schedule links automatically open the selected position.

The preview fixture contains the requested Ontario company renames, student-council removal, imported descriptions and company links. These preview data edits have not been written to production. The earlier five redundant experience rows were removed from the hosted profile separately, with a local backup. The profile's existing bio and overlapping leadership roles remain for review.

Favicons load from Google's favicon service. Saved position links remain the source for external navigation. The development preview route returns 404 in production.

Recruitment work and its pending database migration are documented in `docs/core-team-recruitment.md`. No migration or production deployment is part of this handoff.

## Handoff validation

- 85 unit/database tests pass (`npm test`).
- 24 selected browser tests pass: core-team, dashboard, and unsaved-changes suites.
- Production build passes after clearing stale generated route types.
- Lint passes with three existing warnings (two admin image elements and an unused GridView helper).
- Profile schedule jumps, single-open accordion, company links, and desktop/mobile layout were checked in the local preview.
