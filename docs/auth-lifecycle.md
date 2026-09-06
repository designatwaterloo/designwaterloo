# Authentication and account lifecycle

Supabase owns authentication and refresh-token persistence. React owns a view of that session; a failed profile request never means the user signed out.

## Invariants

- `SessionStore` subscribes with a synchronous auth-event callback. Member queries run on a later task, outside the Supabase auth lock. Never await another Supabase operation inside `onAuthStateChange`.
- Session and profile-loading state are separate. Transient errors retain the same user's last profile and offer retry. Account switches and sign-out invalidate outstanding requests.
- Middleware awaits the complete SDK refresh and forwards every cookie write, including redirect responses. No application timer may abandon a rotating refresh token. Network/service failures return a retryable 503 rather than redirecting to sign-in.
- Public homepage/directory queries use an anonymous client. Session-dependent profile rendering passes through refresh middleware. Session responses are not publicly cacheable.
- OAuth uses an exact callback URL without query parameters so Supabase does not fall back to the Site URL. A short-lived, validated destination cookie carries the return path. OAuth and OTP use validated local redirects and a full navigation after cookies change. Onboarding errors preserve successful authentication.
- `ensure_member()` resolves the authenticated user's existing account, verified email, or server-maintained Azure identity alias in one transaction. User-editable metadata and matching names cannot prove ownership. Ambiguous/already-linked matches fail for manual resolution. Existing profile IDs and URLs are preserved.
- `save_my_profile()` saves the profile, experiences, leadership and optional review submission together. Any failure rolls everything back. RLS applies; the RPC cannot write another user's profile.
- Ordinary members cannot set administrator/approval flags or reassign an existing account. Service-role review routes retain admin access.
- Normal sign-out is local to the current Supabase session; it does not invalidate the user's other devices. The reset endpoint requires POST rather than logging users out on GET.

## Deployment and recovery

Apply `supabase/migrations/20260906010000_account_lifecycle.sql` before deploying this application. It adds two RPCs and replaces the privilege trigger; it does not bulk-update/delete account records. This migration was applied to project `skalyworwmxcofolgnjs` on 2026-09-06 UTC after a transaction/rollback validation.

Supabase URL configuration was corrected at the same time: Site URL is `https://www.designwaterloo.com`; the exact `https://www.designwaterloo.com/auth/callback` redirect is now allowed. Existing localhost, apex and preview entries remain. The apex redirects to www, so both application origin and callback allowlist must agree. Session settings remain unchanged (3600-second access token, no session timebox/inactivity cap, normal refresh-token replay protection).

A private local logical snapshot was taken before migration: 27 public/auth tables, 1,992 rows, schema catalog and checksums. No credentials or data from that snapshot belong in Git. This is not a complete platform backup or a rehearsed full restore: storage objects and platform settings are excluded, and the free project has no listed managed backups/PITR.

For application rollback, revert the deployment first. The additive RPCs can remain. Only if necessary, run the separate SQL under `supabase/rollback/`; it restores the old privilege trigger as well, so it also restores the old insert-protection weakness. Do not apply rollback SQL as a forward migration. No session purge or account recreation is needed.

## Verification

Run `npm test`, `npx tsc --noEmit --incremental false`, `npm run lint -- --quiet`, and `npm run build`.

Tests exercise the installed Supabase SDK's refresh event lock, slow/transient middleware validation, cookie forwarding on redirects, cross-account stale requests, remount recovery, safe redirect targets, and PostgreSQL account/RLS/transaction behavior using PGlite. The SQL fixture contains schema only and synthetic identities.

Before production promotion, complete real Microsoft OAuth, reload the dashboard/profile, open another tab, verify persisted identity, sign out, and sign in again. Real Laurier mailbox delivery and multi-hour browser/device persistence require separate real-world checks; the regression suite cannot prove those external services work.

Diagnostics: `[auth] account_service_unavailable` records the route without tokens or identity data; `[auth] account_resolution_failed` records account initialization failure while preserving the session. Inspect Supabase auth logs and Vercel logs together when reports recur. Do not log session payloads or refresh tokens.

Real-account verification on the production build at localhost (2026-09-06 UTC): Microsoft OAuth, dashboard reload, fresh second tab, profile ownership, cross-tab sign-out, protected-route rejection and relogin all passed. A controlled local session-expiry change triggered a real refresh-token rotation; expiry was restored and the same member remained signed in. The initial paused OAuth state expired; a fresh attempt exposed the exact-callback/query mismatch, now covered by an installed-SDK regression test. These checks do not establish multi-day/device persistence or real Laurier mailbox delivery.

UI verification (2026-09-06 UTC): a real Publish click exposed a React click event being forwarded into the RPC submission flag. Separate zero-argument save/submit handlers fix it. A reversible whitespace edit then saved and survived reload; the exact original bio was restored, with approval state and 6 experience/3 leadership entries verified. Dashboard cold-load CLS measured about 0.032 before reserving matching loading/loaded heights and avatar dimensions, then 0 in the repeated desktop test. The header avatar now loads eagerly, but still waits for account hydration on a cold load (about 1.1 seconds in this local run). This is not a claim of instant cold loading or zero shift on every viewport.

Menu-to-profile navigation verification: the View profile link previously closed the menu before the shared link's delayed curtain/router push, exposing the homepage and running two competing curtains. Account/profile destinations now use native Next navigation, and the menu closes only when the destination route arrives (or when selecting the current page). The menu profile link reports pending navigation. The shared link also respects cancelled/modified clicks, external protocol-relative links and URL-object hrefs. Reproduced the original homepage exposure and verified the repaired menu remains visible until the actual profile arrives.

## Motion and navigation

The timer-driven route-transition context and page curtain have been removed. Shared links delegate to Next; imperative account redirects use the router directly. Pages have a subtle 140ms opacity entrance with no transforms or routing delays. The homepage gets a decorative CSS curtain/logo entrance once per document, not on return navigation. CSS always reveals the page even without hydration; reduced motion skips the entrance.

The navigation menu retains its curtain. Animation frames are cancelled on reversal/unmount, responsive column count is CSS-owned (six desktop/four mobile), transition completion filters the sentinel property, and the safety fallback derives from computed CSS timing. Verified first-load reveal/completion, home-directory-home without replay, rapid menu reversal, reduced motion and the mobile four-column layout in-browser.

Native scrolling and cursors: Lenis, its root wrapper, the cursor follower, and their component props/data attributes have been removed. Next.js owns navigation scroll behavior. The social-links modal locks body scrolling while open and restores the prior inline overflow value on cleanup. The initial entrance and menu animations remain independent of scrolling and pointer movement.
