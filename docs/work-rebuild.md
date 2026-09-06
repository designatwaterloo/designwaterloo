# WORK rebuild

Fresh starting point: `7b422cf` (main after PR #9), September 6, 2026.
The previous WORK implementations are references, not branches to merge.

## History and useful ideas

- Original implementation: `2629fd728cd08d3d024b846e4edd26172ee6b14d`
  (`feature/work-page`). Sanity-backed projects, grid/table toggle, title/client
  search, category/year/client filters, project detail pages, rich content and
  collaborator credits linked to member profiles. Keep discoverability and
  attribution in mind; do not restore the old Sanity data model by default.
- WORK was deliberately removed from main on January 5, 2026 in `18a642a`.
- Second implementation: `207639cc2426302f8ded618a0cacda0f501d0e78`
  ([PR #5](https://github.com/designatwaterloo/designwaterloo/pull/5)).
  Supabase-backed member portfolio pieces, responsive masonry, stored cover
  aspect ratios, author links, galleries, external links, and approved-work
  navigation counts. This was read-side only: posting, editing and profile
  integration were explicitly deferred, not implemented.

## Rebuild direction

1. Build on current auth, navigation and shared layout. The root layout already
   renders Header; WORK pages must not render a second one. Use native routing.
2. Inspect the live Supabase schema and policies before adding migrations.
   PR #5 says a `works` table and RLS were applied directly to production;
   that historical claim has not been verified during this cleanup. Capture
   the actual schema in versioned migrations instead of recreating it blindly.
3. Preserve the intended ownership/review model: members manage their own
   submissions, admins approve them, public visitors see approved work only.
   Verify the rules for both the feed and direct detail-page URLs, including
   test accounts and author visibility. Never treat UI filtering as access control.
4. Plan a complete publishing journey: create draft, upload, edit, submit,
   review, publish, and show work on the author's profile. Do not ship an empty
   state directing people to a posting screen that does not exist.
5. Distinguish query failures from an empty collection or a missing item.
   The old feed discarded query errors; the old detail page could turn them
   into false 404s. Match counts to the same public visibility rules as the feed.
6. Design image sizing, responsive layouts, accessible reading order, metadata,
   loading and empty states together. Evaluate whether grid/table search and
   filters are needed initially rather than copying every old control.

## Validation for implementation

Verify draft/owner/admin/public access, rejected and unapproved direct URLs,
upload/save failures, publication and profile integration, empty and failed
queries, mobile images, keyboard navigation, and a single shared header.
Run the repository's relevant checks when implementation changes are made.

## Cleanup and retained follow-ups

Retire PR #5 and both WORK branches. Remove merged feature/auth branches and
the older auth redirect branches superseded by PR #9. Keep these pending audit:

- PR #8 / `claude/auth-profile-creation-issues-d6f300`: the upload endpoint's
  handling of failed or zero-row profile-image updates is still absent from
  main. Extract the remaining useful fix before closing this PR.
- `claude/mobile-directory-image-sizing-ayou30`: unmerged Safari image-sizing
  changes, including `min-width: 0` on the image container. Verify against the
  current image components before discarding or porting.

A verified Git bundle and original ref map were saved locally in
`/Users/brayden/School/designwaterloo-archive/2026-09-06/` before pruning.
This branch starts the rebuild with these notes; the new WORK UI is not yet built.
