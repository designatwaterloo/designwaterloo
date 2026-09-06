# Auth lifecycle browser regression

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

The runner starts the real Next app at **http://localhost:3100**, in a separate
`.next-e2e` build directory, plus a synthetic Supabase HTTP fixture bound only to
**127.0.0.1:54329**. It overrides Supabase credentials for that child process.
Port 3000 and real accounts are not used. Do not point these tests at production.
No shared auth state or real credentials are needed; every test resets its data.
Failure traces/screenshots contain synthetic data and are gitignored.

Coverage:

- Actual sign-in button, PKCE challenge/verifier exchange, callback cookie writes,
  intended destination, reload, menu-to-profile navigation, and another tab.
- Expired cookie and real SDK refresh-token rotation against the fixture.
- Temporary auth-service failure: 503, preserved cookies, successful retry.
- Temporary profile-service failure: retained authentication and successful retry.
- Cross-tab sign-out and protected-route rejection.
- Persistent browser profile across shutdown/relaunch.
- Profile edit, Publish, and reload with the saved value and session intact.

The fixture replaces Microsoft/Supabase *services*, not the app's auth code.
It intentionally does not model all GoTrue/PostgREST behavior or validate real
JWT signatures. The SQL tests remain the authority for RLS and transactional
writes. This suite runs the Next development server; the production build is
validated separately. Browser network requests in the normal test context are
restricted to loopback. The browser-relaunch test also uses synthetic credentials.

A timing failure found by these tests: auth-js defers `SIGNED_IN` until after
code exchange resolves, while SSR flushes session cookies from that notification.
The callback now waits for actual cookie persistence before sending its redirect.

## Before production promotion

On the deployed preview, check a real Waterloo Microsoft sign-in (including
consent/MFA), reload, profile navigation, a second tab, and sign-out/relogin.
Check real Laurier OTP delivery and verification with an authorized mailbox.
Check idle/restart persistence on actual desktop and mobile browsers. Forced
expiry and a Chromium restart do not establish multi-day, Safari, or device-wide
persistence. Do not claim these external checks based on synthetic suite results.

CI runs the unit/database suite, lint, and these browser checks on PRs and main.
For a suspected timing regression, repeat with `npm run test:browser -- --repeat-each=3`.
