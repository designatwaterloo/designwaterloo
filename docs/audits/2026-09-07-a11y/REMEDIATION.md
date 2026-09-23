# Accessibility remediation

Implemented locally on September 7, 2026; not deployed.

- Directory content now renders on the server, including member links and initial URL filters. Removed the client search-parameter dependency that left a blank Suspense fallback without JavaScript.
- Closed filter panels and accordions are inert and excluded from the accessibility tree. Accordion headers are buttons with expanded state and associated panel IDs.
- Directory table uses native table, row, header and cell elements. Sort controls are keyboard buttons with `aria-sort`. Profile links remain normal links, including modifier-key behavior.
- Navigation and mobile filters use native modal dialogs for background isolation and focus containment. Escape/close restores the opener, including immediate menu dismissal before its entrance animation finishes.
- Profile facts use valid description lists.
- Muted text, directory metadata, search placeholders, sign-in copy and past work-term labels have stronger contrast. Dark navigation retains suitable light text.
- Search has an explicit label. View controls expose pressed state, filter triggers expose expanded state, remove-filter buttons describe their action, and result counts use a polite status region.
- Added a skip-to-content link, an account navigation landmark, and navigation available without JavaScript; replaced the nested complementary filter landmark with a named group.
- Sitemap now contains only home, about and directory. It performs no profile query. No profile `noindex` or indexing opt-in feature was added; indexing policy was left unchanged pending clarification.

## Validation

- Four Playwright regression tests pass: no-JavaScript directory, keyboard filtering/sorting/view state, navigation focus containment/restoration, and mobile filter operation/dismissal.
- Sitemap privacy regression test passes.
- TypeScript check and targeted ESLint checks pass.
- Local axe WCAG A/AA scans returned no violations on home, directory, about, sign-in and a synthetic public profile; open navigation and a 320px mobile filter state also returned no violations.
- Inspected desktop table/navigation screenshots and mobile filter layout. The sampled mobile state had no body overflow at 320px.

Tests use an isolated synthetic Supabase fixture, not live member records. These results do not establish full site-wide WCAG conformance: real VoiceOver/NVDA testing, comprehensive 200% zoom/reflow, third-party video accessibility and all authenticated flows remain outside this pass. The earlier production audit remains a historical record of the deployed site.
