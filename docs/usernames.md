# Editable usernames

Profiles use `/@username`. `/directory` remains the people browser, and existing
`/directory/username` links redirect to the current handle, preserving query
parameters such as `edit=true`. Account settings at `/settings` are available
from the dashboard and navigation. Onboarding uses the same reservation check.

A member's UUID remains the identity used for ownership and related records.
`members.slug` is only the current public handle. `username_claims` reserves both
current and past handles; a database trigger enforces claims on every insert or
slug update, including direct requests that bypass the UI. Concurrent claims
are serialized by the username primary key. Deleting a member leaves reserved
tombstones, so old links cannot later point to someone else.

Owners may reclaim their previous handles. Alias redirects are temporary (307),
not permanently cached, to avoid cycles when a user changes back. Resolution
always joins to the current member instead of following a chain of aliases.
Resolution is request-scoped and respects public/owner/admin visibility.

New handles use 3–40 lowercase letters, numbers, and single internal hyphens.
Existing handles are backfilled without renaming accounts. Historical handles
from before this migration cannot be recovered unless recorded elsewhere.
Availability is advisory; the transactional save is authoritative. Settings
sends the previous handle to reject stale saves from other tabs.

## Rollout

`supabase/migrations/20260907010000_editable_usernames.sql` was applied to the
Design Waterloo Supabase project on September 6, 2026, before the application
rollout. Verification found 62 member records and 62 matching reservations,
with no missing claims and no direct anonymous/authenticated table writes. It briefly locks member writes while backfilling reservations,
adds the trigger and RPCs, and updates automatic username suggestions to obey
validation. Existing member IDs, current handles, account links, and approval
states are preserved. This is additive and compatible with the previous UI.

If reverting the application, keep the claims table and trigger so usernames
already shared by members remain reserved. Do not drop username history as part
of an application rollback.

## Verification

`tests/usernames.test.ts` exercises the actual migration using PostgreSQL via
PGlite, including direct-write bypass attempts, renamed and reclaimed handles,
stale saves, deleted-member tombstones, anonymous access, and account creation.
Browser tests use an isolated Supabase protocol fixture and cover settings,
mobile layout, canonical URLs, legacy redirects, and existing auth behavior.
