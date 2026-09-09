# Accessibility and agent readability audit

Local fixes and verification are recorded in [Remediation](REMEDIATION.md). The findings below describe the original production audit.

Date: September 7, 2026. Target: https://www.designwaterloo.com. Baseline: WCAG 2.1 AA, with separate agent-readability recommendations.

**Result: remediation required.** Public content is generally readable in a JavaScript browser, but the directory is empty without JavaScript, several controls lack semantics, and invisible filter options receive keyboard focus. This is an audit, not a conformance certification or completed remediation.

Ten grouped findings: seven major, three minor; no critical findings in the sampled public flows. Severity describes practical impact, not the automated scanner's individual rule severity.

## Scope and evidence

- Live desktop Chromium, 1440×1000: home, directory, about, sign-in, and public profile `/@bmp`.
- axe-core scans against WCAG A/AA tags; best-practice rules also included for the first four routes. Third-party iframe contents excluded.
- Browser accessibility snapshots; keyboard checks for directory filters, table sorting and navigation dismissal; JavaScript-disabled page loads.
- Mobile width check at 390×844 on all five routes: no body-level horizontal overflow. This is not a full visual/reflow or 200% zoom certification.
- Source inspection of the current working tree. Existing uncommitted changes were present; source and production are not assumed identical. Live findings below were reproduced in production unless marked source-only.
- An existing local server at port 3101 was sampled: home completed, directory timed out. No complete local-runtime audit is claimed.
- Signed-in onboarding, account editing, admin actions, real VoiceOver/NVDA announcements, video captions/audio description, and full touch-target measurements remain untested. No account actions or messages were submitted.

Raw evidence: [automated results](automated-results.json), [interaction results](interaction-results.json). Counts are affected nodes in sampled states, not unique defects or all site content.

## Findings

| # | Finding and impact | Severity | Criterion | Recommendation |
|---|---|---|---|---|
| 1 | **Directory content requires JavaScript.** After a completed JavaScript-disabled load, `main` is exactly `<main class="min-h-screen" aria-label="Loading directory"></main>`, with zero profile links. HTML-only agents cannot read the directory. Home exposes 24 profile links and the sampled profile exposes its text. | Major | Agent readability; no automatic WCAG failure solely for requiring JS | Render directory heading and member links on the server, then progressively enhance search, filters and view controls. Inspect the `useSearchParams`/Suspense boundary; do not rely on a larger loading label. |
| 2 | **Invisible filters receive focus and appear in the accessibility tree.** On desktop, with the filter panel closed, eight consecutive Tab presses landed on invisible checkboxes inside the sidebar. Collapsed accordion options are also exposed. Agents see controls that pointer users cannot use. | Major | 2.4.3, 2.4.7 | Apply `hidden`/conditional rendering or `inert` while closed, including each accordion. `opacity: 0` and `pointer-events: none` do not remove focusability or accessibility exposure; `aria-hidden` alone does not fix keyboard focus. |
| 3 | **Filter sections cannot be opened through normal keyboard controls.** “Graduating Class” and “Program” are generic text, with click handling on an outer `div`. No button role or expanded state is exposed. | Major | 2.1.1, 4.1.2 | Use native heading buttons with `aria-expanded` and `aria-controls`; use unique panel IDs. Keep option interaction separate from the heading toggle. |
| 4 | **Directory table and sorting are not semantic.** Switching to Table view produces zero tables. Name, Program and Class headers are `DIV` elements with no role and `tabIndex=-1`; sorting is absent from the accessible button list. Header-to-value relationships depend on visual layout. | Major | 1.3.1, 2.1.1, 4.1.2 | Use `table`, `caption`, `th scope="col"`, rows and cells, with real profile links inside cells. Put sort buttons in sortable headers and set `aria-sort` on the active header. |
| 5 | **Full-screen navigation does not manage focus or expose state.** Opening it leaves underlying `main` in the accessibility tree; the trigger lacks `aria-expanded`. Focusing About and pressing Escape closes the overlay but leaves focus on `BODY`. Source has no focus containment/restoration. | Major | 2.4.3, 4.1.2 | Treat the full-screen overlay as a named modal dialog containing navigation: move focus inside, keep Tab within it, make background inert, and restore the opener on close. Expose trigger state. A deliberately nonmodal design would instead need to leave the background visibly operable. |
| 6 | **Profile details use orphaned description-list items.** axe found 12 `dt`/`dd` elements without a `dl` ancestor on the sampled profile, including School and its value. Labels and values lose reliable structural relationships. | Major | 1.3.1 | Wrap related details in `dl`; retain valid grouped `div > dt + dd` structures. Apply to availability and all profile fields. |
| 7 | **Low contrast throughout public pages.** Live scans flag section labels, footer labels/links, directory metadata and profile labels. This also affects agents reading screenshots. | Major | 1.4.3 | Darken muted tokens and remove opacity from normal text/links where it causes failure. Check effective composited colors, including hover and dark overlay states. |
| 8 | **View/filter state and result updates are under-specified.** Grid/Table selected state is CSS-only; filter triggers lack expanded/controlled relationships. Directory results have no live status in source. Agents must infer state from content changes. | Minor | 4.1.2; 4.1.3 where results constitute a status message | Use `aria-pressed` for view buttons, `aria-expanded`/`aria-controls` for filter triggers, and a concise polite result-count status. Give remove-filter buttons an explicit action name. |
| 9 | **Search depends on a placeholder for its name.** Source renders a text input without an associated label or explicit accessible name. Chromium exposes a placeholder fallback, so this was not an axe missing-name failure. | Minor | Label robustness; 3.3.2 review | Add a persistent label such as “Search directory”, visually hidden if necessary, and use `type="search"`. Keep the placeholder for example queries. |
| 10 | **Navigation/landmark orientation needs cleanup.** Sign-in/account chrome sits outside a landmark; the scanner flags a nested complementary landmark. No skip link exists in source. Public navigation is only mounted after opening the menu. | Minor | Best practice; 2.4.1 review | Group account/navigation controls in appropriately named landmarks, add a skip-to-main link, and review sidebar landmark nesting. Keep public navigation discoverable in server HTML. Missing skip links alone do not prove 2.4.1 failure when other bypass mechanisms exist. |

## Automated scan summary

| Route | Contrast nodes flagged | Other findings |
|---|---:|---|
| `/` | 14 | 1 region best-practice finding |
| `/directory` | 108 | 1 complementary-landmark nesting and 1 region finding |
| `/about` | 13 | 1 region finding |
| `/sign-in` | 18 | 1 region finding |
| `/@bmp` | 36 | 12 orphaned description-list items; best-practice tags not run on this route |

Automated scans did not discover the generic clickable sorting/filter headings as keyboard failures. These required DOM, accessibility-tree and interaction inspection.

## Contrast examples

| Element | Effective foreground | Background | Measured ratio | Required |
|---|---|---|---:|---:|
| Home Directory section label | `#cacaca` | `#ffffff` | 1.63:1 | 4.5:1 |
| Footer labels | `#b5b5b5` | `#ffffff` | 2.05:1 | 4.5:1 |
| Footer links / profile labels | `#7f7f7f` | `#ffffff` | 4.00:1 | 4.5:1 |
| Large directory count | `#cacaca` | `#ffffff` | 1.63:1 | 3:1 |

Ratios are scanner measurements of the rendered state. Confirm font loading, blending, opacity and backgrounds during remediation; do not judge a token in isolation.

## Keyboard and accessibility-tree observations

| Interaction | Observed | Expected after remediation |
|---|---|---|
| Tab with desktop filters closed | Eight sampled stops on invisible checkboxes | Closed controls absent from Tab order and accessibility tree |
| Open a filter accordion | Heading absent from button controls | Named button supports Enter/Space and announces expanded state |
| Sort table | Generic, nonfocusable column `div` | Named sort button; active column announces sort direction |
| Open navigation | Underlying content remains exposed | Focus enters overlay; background unavailable while modal |
| Escape from About link in navigation | Overlay closes, focus becomes body | Focus returns to navigation opener |
| Read profile facts | Terms/descriptions exist without list context | Valid description-list relationships |

Accessibility-tree observations are not a claim that VoiceOver or NVDA was run.

## Implementation locations

- `src/app/directory/page.tsx` and `DirectoryClient.tsx`: initial server content and URL-state boundary.
- `src/components/DataView/FilterPanel/FilterAccordion.tsx:45`: clickable outer container and permanently mounted options.
- `src/components/DataView/FilterPanel/FilterPanel.module.css`: opacity-only closed states.
- `src/components/DataView/TableView/SortableHeader.tsx:24` and `TableView/index.tsx`: table and sorting semantics.
- `src/components/Header/index.tsx`, `OverlayNav/index.tsx`: menu state and focus lifecycle.
- `src/app/directory/[slug]/ProfileContent.tsx:295`: description-list structure.
- `src/components/DataView/ViewModeToggle/index.tsx`, `Button/index.tsx`, `SearchBar/index.tsx`, `DataView/index.tsx`: control labels/state and results status.
- `src/app/globals.css`, `src/components/Footer/index.tsx`, directory/profile styles: text contrast.

## Recommended order and acceptance checks

1. Server-render usable directory content. With JavaScript disabled, the heading, public member names, and profile links must be readable.
2. Fix filter visibility, accordion buttons and table sorting. Navigate the full directory flow using Tab/Shift+Tab/Enter/Space; no focus may land on invisible controls.
3. Fix navigation focus lifecycle and profile list semantics. Escape must restore focus; rerun `dlitem` checks.
4. Adjust contrast and expose search, view and result state. Rerun axe across default, filters-open, table and navigation-open states on desktop and mobile.
5. Complete manual VoiceOver/NVDA, 200% zoom and 320px reflow checks, then authenticated flows and video alternatives before claiming site-wide WCAG conformance.

Public HTML structure is the priority for agent readability. A sitemap or structured data may be useful later, but would not repair empty main content or inaccessible controls.

Standards references: [W3C information and relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html), [WCAG 2.1](https://www.w3.org/TR/WCAG21/).
