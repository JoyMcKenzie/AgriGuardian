# AgriGuardian — CHANGELOG

Newest entries at the top. Every future change — however small — gets a new
entry here in the same turn it's made. This file is the single running
record.

Format per entry: date (or session, where exact date isn't known) — what
changed — why / notes.

---

## 2026-07-09 02:09 ET — Report action bars unified to one solid color, cleaner dividers

Per screenshot feedback on the Hygiene Report / Activity Log action bars
(View / Download PDF / Email Report).

- **`index.html`** — `#btn-email-report` and `#btn-email-activity` changed
  background from accent green `#2E7A4E` to brand green `#1F4D2E`, matching
  View and Download so all three segments read as one uniform bar instead of
  Email standing out as a different shade. The vertical divider between
  segments (`border-right`) changed from a barely-visible
  `rgba(255,255,255,0.2)` to a cleaner, more visible `rgba(255,255,255,0.35)`
  — a simple white line rather than a near-invisible one, so the bar reads
  as clearly segmented.
- Confirmed the two remaining `#2E7A4E` uses elsewhere in `index.html`
  (the "Code accepted" invite-status text, the "Connected" status dot) are
  unrelated semantic accent-green uses, not part of these action bars —
  left untouched.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T02:09:16-04:00`.
- **Truncation incident (again):** `index.html` truncated mid-tag right
  after the divider-opacity edit — caught immediately via null-byte/tail
  check, recovered by splicing the correct closing tail back on from the
  known-good backup, then reverified (divider + email-button counts both
  matched expected totals, no stray changes).

---

## 2026-07-09 01:58 ET — 8 new security tips added to the ticker (2 skipped as redundant)

Joy provided 10 candidate tips for the rotating security-tip ticker. Checked
each against the existing 8 EN/ES tips before adding, rather than appending
blind:

- **Skipped as redundant:** "Use two or more steps to log in..." duplicates
  the existing "Turn on MFA for every account that offers it." "Turn on
  automatic updates to patch security flaws..." duplicates the existing "Let
  device software auto-update whenever you can."
- **Added (8), none app-specific — all generic real-world security practice,
  matching the existing tips' tone:** password manager + long passphrases,
  phishing/scam awareness, antivirus/malware protection, least-privilege
  access (distinct from the existing offboarding-review tip), device
  encryption, the 3-2-1 backup-copies rule (distinct from the existing
  backup-*testing* tip), treating login requests as unverified until
  confirmed (covers MFA-fatigue/push-bombing, not just email phishing), and
  knowing your role/who to contact if hacked (incident response — nothing
  else in the list covered this).
- **`js/i18n/lang-data.js`** — `securityTips` array extended from 8 to 16
  entries in both `en` and `es`, same order in both languages, translated
  (not just copied) for Spanish.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:58:43-04:00`.
- **Truncation incidents (twice this turn):** `lang-data.js` truncated
  mid-object after the EN addition (recovered by diffing against
  `git show HEAD:js/i18n/lang-data.js` and splicing the correct tail back
  on), then truncated again after the ES addition — at that point, rather
  than keep patching a moving target, rebuilt the whole file fresh from the
  HEAD copy with both the EN and ES edits reapplied together in one pass,
  verified via `node --check` and a full diff against HEAD showing only the
  two intended array insertions.

---

## 2026-07-09 01:53 ET — Rotating security-tip ticker added to the welcome screen

Reused the same rotating "security tip" component already running on the
Dashboard (`securityTipsCard()`/`startTipTicker()` in `dashboard.js`) on the
welcome/login screen too, centered below the demo-box card.

- **`index.html`** — new white card, centered, added directly below the
  demo-box inside `#step-choice`: a lightbulb icon badge + `#login-tip-text`
  span, styled to match the dashboard's tip card (white background, mint
  icon chip, same font sizing convention).
- **`js/auth-ui.js`** — new `startLoginTipTicker()` function (and
  `_loginTipTimer`/`_loginTipIdx` state), reusing the existing
  `currentSecurityTips()` helper from `dashboard.js` (loads earlier in
  `module-load-order.json`, so it's available) rather than duplicating the
  tip list. Sets the initial tip on `DOMContentLoaded`, then rotates every
  6.5s with the same fade transition as the dashboard version, respecting
  `a11ySettings.reducedMotion`. Self-cleaning: if `#login-tip-text` is gone
  on the next tick (user moved to sign-in/invite or logged in), the interval
  clears itself — mirrors the dashboard ticker's own safety pattern exactly,
  and is a fully separate timer/element so it can never collide with the
  dashboard's ticker if both existed in the DOM at once.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:53:59-04:00`.
- **Truncation incidents (twice this turn):** `index.html` truncated
  mid-script-tag after the new tip-box HTML was added (recovered by splicing
  the correct script-tag list back on from the known-good backup; verified
  by tag-count diff — `<div>`/`<span>` counts each grew by exactly 2,
  matching the new tip box's icon-chip span + text span, nothing else
  changed). `js/auth-ui.js` truncated mid-function after the new ticker code
  (cut off partway through the unrelated, pre-existing `_enterApp()`
  function); recovered by diffing against `git show HEAD:js/auth-ui.js` and
  splicing back the correct tail — confirmed the only real diff is the new
  ticker code plus the already-known `welcome-sub` removal, nothing else
  disturbed.

---

## 2026-07-09 01:49 ET — Correction: card should never have moved from its original position

Joy caught that the 01:42 ET and 01:44 ET changes had an unintended side
effect: making `#step-choice` a full-height flex column (`min-height:100%`)
with the "Welcome" zone set to `flex:1` pushed the Sign in / I have an invite
buttons and the demo-box card down — first to a vertically-centered position,
then, once "Welcome" was given its own `flex:1` zone, all the way down to the
bottom of the frame. That was never asked for; only "Welcome" itself was
supposed to move/resize.

- **`index.html`** — reverted `#step-choice` to normal (non-flex) document
  flow, so the card sits back in its original position, unmoved. "Welcome"
  keeps its 32px size and horizontal centering, but is no longer stretched
  into a `flex:1` zone consuming leftover vertical space — it now just has a
  fixed `padding:28px 0` around it for breathing room, which offsets the
  card below it by a small, fixed amount rather than shoving it toward the
  bottom of the frame.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:49:36-04:00`.
- **Truncation incident (again):** `index.html` hit the same trailing
  null-byte padding bug immediately after this edit — content itself was
  complete and correctly ended at `</html>`, just with stray null bytes
  appended after; stripped cleanly and reverified via tag-count diff (one
  extra matched `<div>`/`</div>` pair versus the original baseline,
  corresponding to the "Welcome" wrapper — nothing else altered).

---

## 2026-07-09 01:44 ET — "Welcome" doubled in size, centered on its own above the card

- **`index.html`** — split `#step-choice` into two zones instead of centering
  everything as one block (superseding the 01:42 ET change below within the
  same session): "Welcome" now lives in its own `flex:1` zone that fills the
  space between the header banner and the button/demo-box group, centered
  both horizontally and vertically within that zone. Font size doubled from
  16px to 32px. The Sign in / I have an invite buttons and the demo-box stay
  in normal flow directly below, unaffected — so "Welcome" reads as a large
  centered heading in the open space above "the card," rather than a small
  label stacked with the rest of the group.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:44:52-04:00`.
- **Truncation incidents (twice more this turn):** `CHANGELOG.md` itself
  re-truncated at the same historical tail spot when a new entry was
  prepended (recovered the same way as before: trimmed to the last complete
  sentence, closing note reapplied); `index.html` truncated again immediately
  after this edit (recovered by splicing the correct `</body></html>` tail
  from the known-good backup, then verified via tag-count diff — one new
  matched `<div>`/`</div>` pair versus the pre-edit baseline, corresponding
  exactly to the new "Welcome" wrapper div, nothing else changed).

---

## 2026-07-09 01:42 ET — Welcome screen: vertically centered in available space

- **`index.html`** — `#step-choice` (the "Welcome" title, Sign in / I have an
  invite buttons, and the demo-box explainer below them) now vertically
  centers itself in the space between the bottom of the header banner and
  the bottom of the app frame, instead of sitting flush against the top.
  Implemented with `display:flex; flex-direction:column; justify-content:
  center; min-height:100%` on `#step-choice`, which fills `.login-scroll`'s
  full available height (a definite pixel value via its `flex:1 1 auto`
  sizing) and centers its children within it. Scoped to `#step-choice`
  only — the sign-in and invite-code forms (`#step-signin`, `#step-invite`,
  etc.) are separate sibling steps and are unaffected, since only one step
  is ever in-flow (the others are `display:none`) and each keeps its own
  natural top-aligned flow when it's the one showing.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:42:54-04:00`.
- **Truncation incident (again):** `index.html` hit the same trailing-cut
  corruption bug immediately after this edit — caught by null-byte/tail
  inspection before being left in place, recovered by splicing the correct
  closing `</body></html>` tail back on from a known-good backup taken
  earlier this session, then verified via tag-count diffing (no change in
  div/button/span counts versus the pre-edit version) and confirming no
  stray reintroduction of the already-removed "welcome-sub" line.

---

## 2026-07-09 01:33 ET — Cohesiveness pass: success-box color, password note, back-link color

Direct follow-up requests, applied across every matching instance for
consistency rather than just the two screenshotted spots:

- **"Looking good" status box** — `.risk-detail-green` (`styles.css`) kept
  its white card background (was already fixed to `#FFFFFF` in the earlier
  sweep) but its title/body text changed from muted brand green `#1F4D2E`/
  `#17391F` to a sharp, bright `#1F6E43`. Applied to every matching instance,
  not just one screen: `.risk-detail-green` (used by `networks.js` and
  `devices-detail.js`'s resolved-device banner) and `dashboard.js`'s two
  "all good"/"no work" banners — all three previously used a green-tinted
  `#E2EFE8` background with a plain colored dot; now they're white cards with
  a `ti-circle-check` checkmark icon in the same bright green as the text,
  for one consistent "success" visual language everywhere it appears.
- **Password-manager "AgriGuardian never sees or stores your passwords" note**
  (`devices-detail.js`) — background changed from green tint `#E2EFE8` to
  pale neutral gray `#F3F4F6` (this one is informational, not a success
  confirmation, so it deliberately did NOT get the bright-green treatment
  above); text changed to dark charcoal `#111111`, shield icon to `#374151`.
- **"Back to devices / network connections / apps" links** — `.back-btn`
  (`styles.css`) changed from muted gray `#7A8F80` to brand green `#1F4D2E`
  (hover `#17391F`). One shared class covers all three back-links, so a
  single CSS change applied everywhere.
- `PALETTE.md` updated (new "Cohesiveness pass" section, Severity/status
  table entries revised) and `FILE-MAP.md`'s `styles.css` entry updated to
  match. `BUILD_TIMESTAMP` bumped to `2026-07-09T01:33:14-04:00`.
- **Truncation incidents (again, three separate times this turn):**
  `js/dashboard.js` (trailing null bytes after the 3 banner edits),
  `js/devices-detail.js` (hard mid-word cut after the checkmark-icon edit,
  no null bytes this time — different failure signature), `PALETTE.md` and
  `FILE-MAP.md` (both hard mid-word cuts, no null bytes). All caught
  immediately via `node --check`/null-byte scans/tail inspection before
  being left in place; all recovered by diffing against `git show HEAD:<file>`
  and either stripping null padding or rebuilding the file from the HEAD copy
  with the same intended edit reapplied programmatically. No corrupted file
  was shipped.

---

## 2026-07-09 01:25 ET — Fixed device-name truncation; removed redundant welcome subtitle

- **Bug fix, `styles.css`** — `.device-name` used `white-space: nowrap` +
  `text-overflow: ellipsis`, so long device names got cut off with "…" (user
  screenshot: "Grain bin automation c…", "Farm manager's Androi…"). This was
  made worse by the "larger font" accessibility setting, which zooms the
  whole app via `transform: scale()` while compensating with a *narrower*
  layout width — so text has less room to fit before the visual zoom, and
  hits the ellipsis point sooner than at normal size. Changed `.device-name`
  to wrap onto a second line (`overflow-wrap: break-word`, dropped
  `white-space:nowrap`/`overflow:hidden`/`text-overflow:ellipsis`) instead of
  truncating, at any text size. Root-cause note: the large-text feature's
  scale+width-shrink approach is a separate, deeper issue — it fakes a font
  bump visually instead of actually increasing font-size, and still narrows
  the effective layout more than necessary. Not reworked this pass; flagged
  for a future pass if it keeps causing wrapping/fit issues.
- **`index.html`** — removed the "Are you a new user or returning?" subtitle
  (`#welcome-sub`) from the welcome/choice screen, per explicit request
  ("unnecessary" — the two buttons below it, Sign in / I have an invite,
  already make the choice clear). Adjusted `#welcome-title`'s bottom margin
  to keep spacing balanced now that the subtitle is gone.
- **`js/auth-ui.js`** — removed the now-dead `safeLogin('welcome-sub', …)`
  call in `showStep()` (the element it targeted no longer exists;
  `safeLogin` no-ops safely on a missing id, but the call was cleaned up for
  tidiness). The `loginWelcomeSub` key remains in `lang-data.js` (EN/ES,
  harmless unused string) — left in place rather than risk another edit to
  that file this session.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:25:01-04:00`.
- **Truncation incident (again):** both `styles.css` and `index.html` (and
  then `js/auth-ui.js`) hit the same trailing-null-byte corruption bug mid-edit
  in this turn — caught immediately by null-byte scans / `node --check`,
  recovered by stripping the null padding back to the last valid content
  (verified against `git show HEAD:<file>` and tag-count diffing each time).
  No corrupted file was left in place.

---

## 2026-07-09 01:14 ET — Full green-tint sweep: every card white, canvas one continuous surface

Direct follow-up to a screenshot report ("once you get in the background is
right but the buttons are wrong") and the explicit instruction: "Background
App: #C6D0C8 from the welcome page all the way in / Menu Cards: #FFFFFF every
card, no shades of green / Text inside Cards: #111111."

- **`dashboard.js`** — `tabCard()` (Devices/Network/Apps/Backups summary
  buttons), `attnCard()` ("needs your attention" rows), `securityTipsCard()`,
  the "all good"/"no work" success banners, the Farm Hand/Viewer device row,
  and the colorblind-safe `alertRow()` all changed `background:#F3F8F2` →
  `#FFFFFF`; paired label/value text `color:#22372A`/`#7a8f80` → `#111111`.
  `tabCard()`/`attnCard()` also gained the same 6px `#1F4D2E` left accent bar
  used on `.device-card`, for visual consistency across all nav-style cards.
- **`apps.js`, `settings.js`, `networks.js`, `devices-list.js`,
  `devices-detail.js`, `report-viewers.js`, `vulnerabilities.js`,
  `devices-resolve.js` (inline override), `auth-ui.js`, `i18n/set-lang.js`** —
  every remaining inline `background:#F3F8F2` converted to `#FFFFFF`; primary
  text `color:#22372A` converted to `#111111` alongside it. Secondary/muted
  text tones (`#5F7266`, `#7A8F80`) were left as the existing text-hierarchy
  grays — they're not green and weren't called out.
- **`index.html` (login/welcome screen)** — `.login-scroll` background
  changed `#F3F8F2` → `#C6D0C8` to match the post-login `.app` canvas, so the
  muted-sage surface now runs continuously "from the welcome page all the way
  in." The demo-box, the "1. Sign in" / "2. I have an invite" nested cards,
  the persona-picker wrapper and all 5 persona sign-in buttons, and the demo
  invite-hint box all changed from green-tinted boxes (`#E2EFE8`/`#F3F8F2`)
  to white cards with `#D7E4D7` borders. The small demo code/password chips
  (987654, the generated passwords) changed to a neutral `#EEEEEE` rather
  than pure white, so they still read as distinct chips against the white
  card behind them — gray, not green. The Hygiene Report / Activity Log modal
  header bars and the Settings collapsible section headers (Farm account,
  Team members, Timezone, Session, Language, Accessibility, Security) also
  changed from `#F3F8F2` to white.
- **`styles.css`** — `.nav-btn:hover` background changed `#F3F8F2` → `#F1F2F1`
  (neutral gray hover, no green tint).
- **`style-guide.html`** — its own reference `.sw`/`.card`/`.statrow`/`.navbar`
  swatches and the "Outline" button example updated to white to match; the
  `surf` swatch data array in the Foundations section corrected (dropped the
  stale `#D1D5DB` canvas value and separate "Card / box" row, replaced with
  the current `#C6D0C8` surface + single `#FFFFFF` menu-card row).
- **Deliberately left alone** (semantic, not generic cards): `#E2EFE8`
  success tint (confirmed/fine/assigned badges, "all good" icon chips,
  accordion-header active state, checkbox-checked state), the severity/status
  color families (critical/review/success tints), and all HC (accessibility)
  overrides — these carry meaning and are documented separately in
  `PALETTE.md`, not part of the "menu card" surface this pass targeted.
- `PALETTE.md`'s "Known drift" note is now resolved and rewritten as "Drift
  fully swept," documenting what changed and what was intentionally spared.
  `FILE-MAP.md`'s `styles.css`/`dashboard.js` entries updated to match.
- `BUILD_TIMESTAMP` in `js/i18n/core.js` bumped to `2026-07-09T01:14:02-04:00`.
- Verification: every edited file checked with `node --check` (JS) and a
  null-byte scan; `index.html` additionally checked for matching tag counts
  and line count against the pre-edit version (56 diff lines, all accounted
  for, no truncation). One truncation did occur mid-edit on `dashboard.js`
  (`tabCard`'s trailing `alertRow()` button got cut off) — caught immediately
  by `node --check`, recovered by splicing back the correct tail from the
  pre-edit copy, then reverified clean.

---

## [Unreleased / next entry goes here]

---

## 2026-07-09 01:00 ET — Canvas re-tuned to muted sage; white-card treatment extended to every card
- Corrected a misread from earlier tonight: "Background Canvas" in the color instructions refers to `.app`'s own background (the surface *within* the device frame), not `body` (the page the frame sits on) — same element I already changed once, just a new value this round.
- `.app` background: `#D1D5DB` → `#C6D0C8` (muted sage, per spec).
- Extended the "menu card" white-background + `#111111`-text treatment beyond `.device-card` to every shared card-style class: `.stat` (dashboard tiles), `.action-box`, `.resolve-box`, `.health-box`, `.alert-row-red`/`.alert-row-yellow` — all backgrounds off-white/`#f7f7f5` → `#FFFFFF`; all their text (`.stat-label`, `.action-label`, `.action-text`, `.detail-key`, `.detail-val`, `.device-name-large`, `.device-sub`, `.resolve-title`, `.health-title`, alert-row text) → `#111111`.
- Found and fixed two inline overrides that would've silently defeated the CSS change: `devices-resolve.js` and `networks.js` both reuse the `.resolve-box` class but hardcoded `background:#F3F8F2` inline on top of it — both now `#FFFFFF`. Also whitened/darkened one inline `.risk-detail` "restricted access" notice in `networks.js` that used the same muted off-white/gray pattern outside the severity-colored boxes (red/yellow/green risk-detail boxes were deliberately left alone — those are intentional status colors, not neutral cards).
- **Not fully swept, flagged honestly:** `dashboard.js`, `apps.js`, `settings.js`, and other spots in `networks.js` still have inline `background:#F3F8F2` panels I didn't touch this round — some look like genuine card rows, others are buttons/dropdown fills that may be intentionally tinted. Documented in `PALETTE.md`'s new "Known drift" note rather than guessing at scope without checking each one.
- Updated `PALETTE.md` (surface/card values, known-drift note) and `FILE-MAP.md`'s `styles.css` entry.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T01:00:26-04:00`.
- Process note: switched to plain file writes (Python/`sed`) instead of the Edit tool for `PALETTE.md`/`FILE-MAP.md`/`core.js` this round, after the Edit tool truncated `PALETTE.md` twice more while documenting this same change. Every file touched this entry verified with `node --check` (JS) and a null-byte/tail check (docs) — all clean.

---


## 2026-07-09 00:48 ET — style-guide.html updated for the high-contrast device-row pass
- Updated the `surf`/`text` swatch groups: "Page / app surface" → "Page / app surface (canvas)" `#D1D5DB` (was sage `#E7F0E7`); added "Device row" `#FFFFFF`, "Device row accent bar" `#1F4D2E`, "Device row text" `#111111`, "Nav inactive" `#374151` as new swatches.
- Added a live example under the Components section: a device row rendered on the new gray canvas (white row, green left accent bar, black text), with its own caption spelling out the four hex values and what replaced what.
- Not touched: the "Navigation — light slide-out" (`.ni`/`.navbar`) example lower in the same section documents an older side-drawer nav pattern that predates the bottom-tab-bar nav actually used in `index.html` (`.nav-btn`) — this mismatch predates today's changes and is a separate, pre-existing staleness issue, not part of this color pass.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T00:48:21-04:00`.
- Verified with a full diff against git history: only the two intended blocks changed, no truncation this time.

---

## 2026-07-09 00:45 ET — High-contrast device-row redesign (sunlight-readable pass)
Implements the requested batch: Title Case labels, dark canvas, pure-white device rows, deep-charcoal text, brand-green accent bar, and a darker inactive nav color.
- **Title Case, not ALL CAPS:** `.action-label`, `.section-title` (`styles.css`), and 10 inline Settings-section/report-card headers in `index.html` switched `text-transform: uppercase` → `text-transform: capitalize`. Left one occurrence alone on purpose — the invite-code `<input>`'s `text-transform:uppercase` is about the entered code value, not a label. Underlying strings in `lang-data.js` stay sentence-case (`"Farm account"`); `capitalize` renders them as Title Case without rewriting ~10 translation keys in two languages.
- **Canvas:** `.app` background sage `#E7F0E7` → medium-dark gray `#D1D5DB`.
- **Device rows:** `.device-card` background off-white `#F3F8F2` → pure white `#FFFFFF`; added a new 6px `border-left: solid #1F4D2E` brand-green accent bar on every row.
- **Device row text:** `.device-name`/`.device-brand` → `#111111` (deep charcoal, was `#22372A`/`#7A8F80`).
- **Nav bar:** inactive tab color `#888` → `#374151` (deep charcoal-gray, per the two options given — chose the darker of the two for max legibility); active tab was already brand green `#1F4D2E`, confirmed unchanged. `.filter-btn.active` was already brand green too — no change needed there.
- Updated `PALETTE.md` (new/changed canonical values, plus a "Typography convention" note explaining the capitalize-vs-uppercase decision) and `FILE-MAP.md`'s `styles.css` entry to match.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T00:45:11-04:00`.
- Process note: **three more silent truncations** happened applying this batch — `PALETTE.md` and `FILE-MAP.md` both got cut off mid-edit (on top of the `styles.css` truncations from the previous entry). Each was caught immediately via a git-HEAD diff before considering the edit done, and reconstructed the same way: keep everything before the cut (which had the real edits), splice the correct original tail back on. All four files (`lang-data.js`, `styles.css`, `PALETTE.md`, `FILE-MAP.md`) are now verified byte-for-byte correct — diffed in full against git history, only intended changes present.

---

## 2026-07-09 00:31 ET — Fixed header compressing on content-heavy screens
- Reported and confirmed via screenshot: navigating from Dashboard to Devices visibly shrank the green header (farm-name text overlapping/clipped) — Dashboard's content is short, Devices' (10 seeded devices) is tall enough to overflow. Root cause: `.header` never had `flex-shrink: 0`. It's a flex child of `#main-app`'s column layout; without an explicit `flex-shrink`, its default (`1`, can shrink) meant that whenever a screen's content pressured the layout, the browser shrank the fixed-height header instead of just leaving it alone and letting `.screens-wrap` scroll internally.
- Added `flex-shrink: 0` to `.header`, the new `.signout-strip` class (added to the sign-out row's wrapper `<div>` in `index.html`, which previously had no class/selector hook), and `.timeout-banner` — none of the fixed-height chrome around the scrollable area should ever be allowed to compress, regardless of how tall the active screen's content is.
- Process note: `styles.css` got silently truncated by the edit tool a **third** time this session (same tail-truncation pattern as the two earlier incidents). Caught and repaired the same way — diffed against git HEAD, spliced the clean original tail back onto the correctly-edited head — verified with a full diff showing only intended cumulative changes remain. Given the repeated pattern specifically on this file, treating "diff full file vs. git HEAD immediately after every edit to `styles.css`" as mandatory, not optional, for the rest of this project.
- `BUILD_TIMESTAMP` bumped to `2026-07-09T00:31:32-04:00`.

---

## 2026-07-09 00:24 ET — Hid the scroll track on `.screens-wrap`/`.login-scroll`
- Scrolling worked, but showed a visible scrollbar track — not how a native phone app looks. Added `scrollbar-width:none` (Firefox), `-ms-overflow-style:none` (legacy Edge/IE), and a `::-webkit-scrollbar{display:none}` rule (Chrome/Safari) to both scroll containers. Scroll behavior (wheel/touch/drag) is unaffected — only the visible track is gone.
- Process note: my edit to `styles.css` truncated the file again (this time not a stray byte — the tail ~15 lines, starting mid-declaration at `.login-input[readonly]`, were cut off entirely). Caught it via a diff against git HEAD before considering the change done, reconstructed the file by taking everything before the truncation point (which had all of this session's real changes intact) and appending the clean original tail from git history. Verified with a full diff against git HEAD showing only the intended cumulative changes from this session, nothing else lost or altered.
- Given this is the second time an edit has silently truncated a file this session (previously `lang-data.js`), treating "diff the whole file against git HEAD after editing" as a mandatory step from here on for any edit to a file with long single-line content, not just a spot-check.

---

## 2026-07-09 00:22 ET — BUILD_TIMESTAMP bump (housekeeping)
- Missed the standing rule ("bump `BUILD_TIMESTAMP` on every edit") across this entire session's changes — header cleanup, style-guide refresh, device frame, Inter font, sign-out repositioning, missing translation keys, and the flex/scroll fix all landed without it. Bumped `js/i18n/core.js`'s `BUILD_TIMESTAMP` to `2026-07-09T00:22:19-04:00` now to cover all of it. Verified with `node --check` and a diff against git history showing only that one line changed.

---

## 2026-07-09 00:14 ET — Fixed the actual scroll bug: inline `display:block` was overriding the flex layout
- Root cause of "logged in, mouse wheel does nothing": the fixed-frame change (previous entry) made `.screens-wrap`/`.login-scroll` depend on their parent (`#main-app`/`#login-wrapper`) actually being `display:flex`. But `_enterApp()` in `auth-ui.js` shows the app with `document.getElementById('main-app').style.display = 'block'` — an inline style, which always wins over the `#main-app { display:flex }` CSS rule. So on login, the flex column silently became a plain block: `.screens-wrap`'s `flex:1` had no effect, it just grew to fit all its content with nothing ever registering as "overflow," and anything past the fixed 844px frame got invisibly clipped by `.app`'s `overflow:hidden` — no scrollbar, no scroll, content just cut off. Same bug existed in reverse for logout: `session.js` set `login-wrapper`'s display to `'block'`.
- Fix: changed both to `'flex'` — `js/auth-ui.js` (`_enterApp()`, showing `#main-app`) and `js/session.js` (`logOut()`, showing `#login-wrapper`). One-line change in each file; confirmed no other places in the codebase set either element's display to `'block'`.
- Process note: my first attempt at these two edits left a stray trailing null byte (`\x00`) at the end of each file, which broke `node --check` ("Invalid or unexpected token") and made `diff`/`grep` treat them as binary files. Caught it immediately by running `node --check` (now a standing habit after the `lang-data.js` incident), diffed against git HEAD to confirm it was byte-identical apart from the null byte and the one intended line, stripped the null byte, and reverified. Both files are clean now — verified with `node --check` and a `diff --strip-trailing-cr` against git history showing only the single intended line changed in each.

---

## 2026-07-09 00:00 ET — Fixed-size phone frame; content scrolls, frame doesn't
Goal: make the demo feel like a real app on a phone — the device frame stays a constant size, and only the screen content scrolls inside it, like a real mobile viewport.
- `.app` (`#main-app`, post-login): `min-height: 600px` → `height: 844px` (fixed, not a floor — the frame no longer grows or shrinks with content or window size).
- `#login-wrapper` (pre-login): new rule, `height: 844px; display:flex; flex-direction:column;` — previously had no height constraint at all and just grew to fit whatever step (welcome/sign-in/invite/reset) was showing. Now matches `#main-app`'s height exactly, so there's no frame-size jump when moving between logged-out and logged-in states.
- `.screens-wrap` (post-login screen container): was `max-height: calc(100vh - 200px)` — tied the scrollable area's size to the browser viewport, so the frame effectively resized with the window. Changed to `flex: 1 1 auto; min-height: 0;` so it fills whatever space is left inside the now-fixed 844px frame (header + the sign-out strip + timeout banner, when shown, all still flex-shrink naturally) and scrolls independently — frame size no longer depends on viewport at all.
- Added the equivalent for the login side: new `.login-scroll` class on the login body wrapper (the step-choice/sign-in/invite/reset container in `index.html`), same `flex:1 1 auto; overflow-y:auto; min-height:0` treatment, so long login steps scroll internally instead of growing the frame.
- Net effect: `.device-shell` (the bezel) is now effectively fixed at 900×440px (844+30+26 padding, 420+20 padding) in every state — dashboard, settings, sign-in, invite flow, all identical frame size, exactly like a real phone screen.
- Verified div-nesting balance unchanged (same single pre-existing stray `</div>` as before, nothing new introduced).

---

## 2026-07-08 23:53 ET — Sign-out button repositioned again; missing language translation keys added
- `#header-signout-btn` was overlapping the header title/tagline/farm-name text — the title column is `flex:1` with no reserved right-hand space, so absolute-positioning the button at the app's top-right corner sat directly on top of that text. Moved it out of absolute positioning entirely: it's now a normal-flow button, right-aligned in its own slim green strip directly below the header row (same `#1F4D2E` background, so it still reads as part of the banner), instead of an overlay. No more overlap risk regardless of farm-name length or role-badge visibility.
- Found and fixed the actual bug behind Settings showing literal **"LANGUAGEHEADER"** instead of "Language": the 2026-07-09 invite-language merge added the HTML (`data-i18n="languageHeader"` etc.) but, as flagged at the time, never got the corresponding `js/i18n/lang-data.js` keys — so `t()` fell back to returning the raw key name, which the section-header CSS then uppercases. Added the five missing keys (EN + ES): `languageHeader`, `accountLanguageLabel`, `inviteLanguageLabel`, `langEnglish`, `langSpanish`. Verified with `node --check` and a byte-diff against git HEAD that nothing else in the 1,868-line file was disturbed.
- Process note: a first attempt at this edit corrupted the tail of `lang-data.js` (truncated the last ~10 lines and the closing braces). Caught immediately via `node --check`, restored the file byte-for-byte from git history, and reapplied the two additions with a verified whole-file string replace instead. Flagging in case similar corruption is ever seen elsewhere — always run `node --check` after editing this file.

---

## 2026-07-08 23:48 ET — Switched prototype body font to Inter
- `index.html` `<head>`: added `<link>`s for Inter (400/500/600/700 — the four weights actually used across `index.html`/`styles.css`) from Google Fonts, with `preconnect` hints for `fonts.googleapis.com`/`fonts.gstatic.com`.
- `styles.css`: `body`'s `font-family` is now `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — Inter first, same system stack kept as fallback if the Google Fonts request is blocked/offline, so the app degrades gracefully rather than breaking.
- Scope: prototype only (`index.html`/`styles.css`). Deliberately not touched: `style-guide.html` (has its own separate, duplicated `body` font rule, not shared from `styles.css`) and PDF report generation in `reports.js` (uses jsPDF's own `helvetica` core font, entirely independent of the page's CSS) — both would need separate follow-up work if Inter is wanted there too.

---

## 2026-07-08 23:36 ET — Device-frame treatment: notch, home indicator, neutral canvas
Implements the three "grown-up prototype" controls discussed (visual framing, canvas styling, component boundaries).
- **Visual framing:** added a new `.device-shell` wrapper (`index.html`, wraps both `#login-wrapper` and `#main-app` — the same shell persists across the logged-out/logged-in transition) — a neutral charcoal (`#26282B`) bezel with a `.device-notch` pill at the top and a `.device-home-indicator` bar at the bottom, so the prototype now visually reads as a phone mockup rather than a plain rounded card. Bezel color is deliberately brand-independent (not forest green) so it reads as hardware, not app chrome.
- **Canvas styling:** page `body` background changed from `#ffffff` to `#EEEEEA` — this is `PALETTE.md`'s documented canvas value (which the page had drifted away from at some point after a prior fix reverted it to white). Restores the intended "canvas vs. prototype" contrast: soft neutral gray behind, phone frame on top.
- **Component boundaries:** audited for anything escaping the frame — `#header-signout-btn` (fixed in the prior entry) is the only element using non-flow positioning, and it's `position:absolute` anchored to `.app`, so it stays locked inside the device frame. `.app` already had `overflow:hidden`, so no other screen content can bleed past the frame edges; the new `.device-shell` doesn't clip (no `overflow:hidden` on it) since the notch/home-indicator intentionally sit in its own padding band above/below `.app`, not inside `.app`'s clipped content area — verified no overlap with the bottom nav bar.
- Not touched: the pre-existing stray extra `</div>` near the end of the body (flagged in earlier reviews) — left exactly as-is; the new device-shell markup was inserted around it without disturbing it, confirmed via a div-balance check (same single pre-existing issue, nothing new introduced).
- Follow-up not done here: the `#791F1F`/`#A8CBB8`/`#B8B8B8`/`#CFE0CF`/`#EFEFEF` colour-drift items flagged in the last style-guide entry are still open.

---

## 2026-07-08 — Correction: Sign out repositioned back inside the app frame
- The prior entry ("Header cleanup") moved `#header-signout-btn` to `position:fixed`, anchoring it to the browser viewport — outside the `.app` device frame entirely. That was a misreading of "top-right corner of the prototype, not the canvas": "prototype" means the app/device frame, "canvas" means the surrounding page background — the opposite of how it was applied. Corrected to `position:absolute` (anchored to `.app`, which already has `position:relative`), `top:12px;right:12px`, so the button now sits in the app frame's own top-right corner and stays locked to it regardless of page scroll or viewport size. Border tweaked to a translucent white (was solid, matching the old fixed-to-page treatment) since it's back to sitting on the dark green header inside the frame.

---

## 2026-07-08 — Style-guide refresh: restored PALETTE.md, regenerated og-image.png, documented missing button
- `PALETTE.md` had been deleted from the repo at some point (confirmed via git history — a literal "Delete PALETTE.md" commit) even though `FILE-MAP.md` and this file still cited it as the canonical colour source. Restored it verbatim from the last commit before deletion. Not yet re-audited against current `styles.css` for new drift — a quick scan found 5 colours in use (`#791F1F`, `#A8CBB8`, `#B8B8B8`, `#CFE0CF`, `#EFEFEF`) that aren't in the restored palette; flagging for a follow-up pass, not fixed here.
- `og-image.png` still read the old tagline ("Defending against cyber predators") after the app-wide copy change to "Guarding against cyber predators" — the regeneration FILE-MAP.md calls for never happened. Patched the tagline line in place (same font/color/position, logo and wordmark untouched) so the share-card image matches current copy.
- `style-guide.html`'s Components section documented Primary/Accent/Outline buttons but not the sign-in screen's actual secondary button (`.login-btn.secondary` — "Sign in", "I have an invite", "Back"). Added a fourth swatch ("Login secondary") with a caption noting its white-fill/2px-border treatment.

---

## 2026-07-08 — Header cleanup: removed accessibility icon, moved Sign out outside the app canvas
- Removed the `♿` accessibility shortcut button from the app header (`goToAccessibility()` in `js/accessibility.js` is now unused/dead — left in place but nothing calls it anymore). Redundant since Settings already has its own collapsible Accessibility section (`#a11y-section`); the shortcut was just a fast path to the same content.
- Moved `#header-signout-btn` (Sign out) out of the in-header flex row and gave it `position:fixed;top:16px;right:16px`, so it now sits in the top-right corner of the whole prototype page rather than inside the phone-mockup app canvas. It's still a child of `#main-app`, so it still only shows/hides with login state (no JS changes needed). Restyled with a solid forest-green background (was translucent-white-on-dark-green, meant for the old header context) so it stays legible against the light page background outside the card.
- The now-empty header flex row wrapper was removed; the hidden `#lang-dropdown` select (still referenced by `_enterApp()`/`setLang()`) was kept, unstyled, immediately after the header.
- Not touched: `goToAccessibility()` is dead code now — flagged, not deleted, in case it's wanted back.

---

## 2026-07-08 — Colorblind-mode dashboard alert icons fixed
- `alertRow()` in `dashboard.js` only special-cased `red` and `info` risk levels for colorblind-mode icons, so `green`-level alerts fell through to the generic `⚠️` (warning) icon — same symbol as `yellow`, misleadingly flagging a low-risk item as a warning. Added an explicit `green` → `✅` case, matching the red/yellow/green icon mapping already used consistently in `apps.js`, `devices-list.js`, `networks.js`, and `vulnerabilities.js`.
- No `BUILD_TIMESTAMP` bump — single-line JS fix, not a build-worthy release.

---

## 2026-07-09 — Invite-language selection + persisted app language
- `demoInviteProfile` (the invite-demo placeholder) is now Casey Aitch, phone `(555) 872-3341`, role Farm Hand, seeded in Spanish (`language: 'es'`) — replacing Sarah Tully, who remains a separate Technician persona for the "sign in as a pre-made team member" flow.
- The team invite form (Settings → Team → Add a team member) has a new language toggle (`#member-language`), defaulted to the inviter's current language and reset back to it after each send. The chosen language is stored on the new `teamMembers` row and on `demoInviteProfile`.
- `validateInviteCode()` captures the invite's language into `pendingInviteLanguage`; `joinFarm()` stamps it onto the new account and team-member row; `_enterApp()` seeds `currentLang` from `currentUser.language` before syncing dropdowns and calling `setLang()` — so accepting Casey's invite lands the new account in Spanish, matching what was actually sent.
- `currentLang` now persists to `localStorage` (`agriguardian_lang`) on every `setLang()` call and is restored from it on load (`core.js`), so a chosen language survives a page reload instead of resetting to English.
- Sign-in screen: the language dropdown moved from a separate bar below the header into the top-right corner of the dark green header card itself (absolutely positioned, no layout change to the logo/title row).
- Sign-in screen buttons ("Sign in", "I have an invite") now use a white background with a 2px forest-green border instead of a 1px border on a near-white tint, for stronger contrast/affordance against the header.
- Post-login app header: the language dropdown is removed from view (element kept in the DOM, hidden, so existing code referencing it doesn't break). The visible language control for signed-in users of any role now lives in a new Settings → Language section (`#account-lang-select`).
- Added `languageHeader`, `accountLanguageLabel`, and `inviteLanguageLabel` translation keys (EN/ES) in `lang-data.js`; wired into `set-lang.js`.
- **Merge note:** the `index.html`/`styles.css` markup for this feature (`#member-language` in the team invite form, `#account-lang-select` in a new Settings → Language section, and the `.login-btn.secondary` white/2px-border style) has been merged into the live files. The live repo's existing fixes were preserved during the merge: the unique `lbl-cred-warn` / `lbl-cred-warn-net` ids (no duplicate reintroduced), and `js/nav-drawer.js` (kept in `module-load-order.json` and `index.html`). **The JS half of this feature was not supplied in this merge** — `js/auth-ui.js`, `js/team.js`, `js/settings.js`, `js/i18n/core.js`, `js/i18n/set-lang.js`, and `js/i18n/lang-data.js` still need their corresponding changes applied before the invite-language toggle, the persisted app language, and the Settings language selector will actually function.

**Files touched (this merge):** `index.html`, `styles.css`. **Files still pending:** `js/auth-ui.js`, `js/team.js`, `js/settings.js`, `js/i18n/core.js`, `js/i18n/set-lang.js`, `js/i18n/lang-data.js`.

---

## 2026-07-08 21:26 ET — Spanish tagline synced to match "Guarding"
- Followed up the previous entry's flagged gap: Spanish `appTag`/`loginSub` updated from "Defendiendo contra depredadores cibernéticos" to "Protegiendo contra depredadores cibernéticos" ("Protecting against cyber predators"), matching the new English "Guarding" wording. Not a literal cognate translation — "Guardando" is a Spanish false friend (means "storing/saving," not protecting) — "Protegiendo" is the accurate, natural equivalent for the protective sense intended.
- `BUILD_TIMESTAMP` bumped to `2026-07-08T21:26:14-04:00`.

---

## 2026-07-08 21:23 ET — Tagline copy change + nav layout merge (build 070820262123)
- **Tagline changed:** "Defending against cyber predators" → "Guarding against cyber predators", English only, in every live location: `js/i18n/lang-data.js` (`appTag`, `loginSub` keys — the single source both index.html and JS renders pull from) and the three static fallback copies in `index.html` (login sub-text, header tag, settings "About" footer), plus `style-guide.html`'s reference copy.
- **Spanish left untouched, flagged not fixed:** `appTag`/`loginSub` (ES) still read "Defendiendo contra depredadores cibernéticos" ("Defending..."), now out of sync with the new English wording. Not auto-translated because "Guarding" has no literal Spanish cognate ("Guardando" is a false friend — means "storing/saving," not protecting) and the correct wording is a judgment call ("Protegiendo", "Vigilando", "Cuidando", etc.) — needs a decision, not a guess.
- **Not touched, flagged as dead:** `app.js.monolithic.bak` (2 instances) and two stray scratch files `_index_fixed.html` / `_index_test_copy.html` (3 instances each) still contain the old "Defending..." copy. These aren't part of the live app — the two scratch files are leftover temp copies pending manual deletion (sandbox can't delete files on this mount).
- **Merged nav layout change** (`index.html`, `styles.css`): nav bar moved from a fixed/absolutely-positioned bottom bar to a flex-based layout — `#main-app` now `display:flex; flex-direction:column`, screens wrapped in a new scrollable `.screens-wrap` (`overflow-y:auto`), `.nav-panel` no longer `position:absolute`, `.screen` padding no longer reserves bottom space for the old absolute bar. Verified: all `data-i18n` attributes (including the 3 placeholder fixes from the previous entry) survived the restructuring untouched.
- `BUILD_TIMESTAMP` bumped to `2026-07-08T21:23:35-04:00`.

---

## 2026-07-08 20:56 ET — BUILD_TIMESTAMP convention switched to Eastern time
- `BUILD_TIMESTAMP` in `js/i18n/core.js` was being stamped in UTC (`Z` suffix, via `date -u`). Standing rule going forward: always Eastern time with an explicit UTC offset (`TZ=America/New_York date +"%Y-%m-%dT%H:%M:%S%:z"`), not UTC. Updated the in-file instructional comment to match, and re-stamped `BUILD_TIMESTAMP` to `2026-07-08T20:56:01-04:00`.
- No functional/UI code changed — `formatBuildTimestamp()` parses any valid ISO 8601 offset the same way, so the displayed "Last updated" value is unaffected other than reflecting the corrected stamp.

---

## 2026-07-08 20:54 ET — Spanish localization follow-up audit fixes + bottom-tab-bar nav merge (build 070820262054)
- **Dead orphan key cleanup, not a wire-up:** an audit flagged `#lbl-invite-demo-hint` as never translating, pointing to an orphan dictionary key `loginDemoInviteHint` (Spanish-only, stale text). First pass wired the element to a new `data-i18n-html="loginDemoInviteHint"` — wrong fix. That element was already correctly translated by a deliberate, documented imperative path (`showStep('invite')` in `auth-ui.js` and `setLang()` in `set-lang.js`, both using the existing `inviteDemoHint` key with a spliced-in highlighted code badge). Reverted the HTML attribute and deleted the genuinely dead `loginDemoInviteHint` key from both dictionaries instead.
- **Missing placeholder translations:** added `data-i18n-ph` + new EN/ES keys for the invite password field (`invitePasswordPlaceholder`), invite confirm-password field (`inviteConfirmPasswordPlaceholder`), and the Add Network notes textarea (`addNetworkNotesPlaceholder`) in `index.html`.
- **Language-neutral status codes (real architectural fix):** `d.healthStatus` and `d.resolveStatus` / `n.resolveStatus` were storing the *translated display string* as data (e.g. `"I update it myself"` vs `"actualizo yo"`), so risk/hygiene scoring string-matched both languages by hand — breaking on any resolve-in-one-language-view-in-another flow, and silently on any third language. `core.js` already had unused `healthCode()` / `tHealth()` / `actionCode()` / `actionCodes()` / `tResolveStatus()` helpers built for exactly this (index-aligned against `HEALTH_CODES` / `RESOLVE_ACTION_CODES` / `NET_ACTION_CODES`) but nothing called them. Wired them through `devices-detail.js` (health radio + resolve-action checkbox rendering/selection), `devices-resolve.js` (`saveAll`), `risk.js` (`getRisk`), `permissions.js` (`hasStructuralIssue`), `hygiene.js` (`computeHygiene`), `devices-list.js` (`unarchiveDevice`), and `networks.js` (same pattern existed there too, unflagged by the audit — `saveNetwork`, `returnNetIssue`, `unarchiveNetwork` rendering and comparisons).
- **Audit log fragments translated:** `Flagged:`, `Addressed:`, `Recommended action was:`, `Actions taken:`, `Note:`, `Update status:` in the device resolve audit trail were hardcoded English. Added `auditFlagged` / `auditAddressed` / `auditRecommendedActionWas` / `auditActionsTaken` / `auditNote` / `auditUpdateStatus` (EN/ES) and used them in `devices-resolve.js`.
- **Dictionary cleanup:** removed duplicate `selectBrand` / `optional` key definitions (each was defined twice in both EN and ES; harmless since later wins, but dead weight).
- **Merged concurrent nav redesign** (bottom fixed tab bar replacing the slide-out side drawer) delivered as `index.html`, `js/accessibility.js`, `js/nav-drawer.js` (now a stub — drawer JS no longer needed), and `styles.css`. The uploaded `index.html` predated the placeholder fixes above, so they were re-applied on top before merging (verified via diff — only the 3 intended `data-i18n-ph` attributes differ from the uploaded file, nothing else).
- `BUILD_TIMESTAMP` bumped to `2026-07-09T00:54:35Z`.

---

## 2026-07-08 11:14 ET — Settings UX pass: auto-save, collapse behaviour, drawer tab, mandatory backup notes (build 070820261124)
- **Settings auto-save (no Save buttons):** removed the "Save" button on the report-delivery email and the "Save as my default" button. The email now saves silently on blur/change (inline "✓ Saved", validates without alert spam); accessibility toggles and language changes persist automatically to the user's personal default via a new `persistPreferences()` (wired into `toggleA11y` and `setLang`). Helper note updated to say choices save automatically. Team-member name/phone edits also auto-save on change (member-edit "Save changes" button removed).
- **Sections default collapsed + reset on login:** added `resetSettingsSections()` (collapses every Settings section and resets the ▸ arrows) and call it from `_enterApp`, so sections never carry an expanded state across logout/login.
- **Farm Account now fully collapses:** the report-email block was malformed in the markup — a stray `</div></div>` closed `#sec-settings-farm` early, so the email row was reparented outside the collapsible body and stayed visible when the section was closed. Rebuilt the section markup cleanly so `#owner-email-row` lives inside `#sec-settings-farm`; collapsing Farm account now hides it. (Owner-only email gate preserved.)
- **Drawer pull-tab pinned near the top:** `.nav-handle` was vertically centered (`top:50%`), so it drifted downward as sections expanded and the app grew. Pinned to `top:116px` (just below the header). Drawer stays on the right (no left/right move feature, per decision).
- **Backup notes mandatory:** the Backups screen now requires a note describing where each backup lives (e.g. Amazon cloud, external drive in the safe) before saving — empty notes are blocked with a prompt. Label changed from "(optional)" to "* required"; placeholder updated with concrete examples. New key `backupNotesRequired` (EN/ES).
- Built on the current GitHub base (`S:\Guardian Games`). Verified in a headless render test: all five changes plus regressions (email owner-only gate across roles, ES localization sweep, device list render) — 13/13 checks pass. `BUILD_TIMESTAMP` = `2026-07-08T15:14:56Z`.

## 2026-07-08 03:38 UTC — README: badges added
- Added four badges under the `# AgriGuardian` title, above the legal notice: Live Demo (links to the Pages site), Pages Deploy (GitHub's own live workflow status badge, pulls real pass/fail from Actions automatically), Status: prototype (matches the existing disclaimer text elsewhere in the README), and License: all rights reserved (matches the actual `LICENSE`, not a generic open-source shield).
- Deliberately did not add a standard OSS license badge or a "contributions welcome" badge, since neither would be true for an all-rights-reserved student project; badges that misrepresent the license tend to cost more credibility than they gain.
- No code changed; no `BUILD_TIMESTAMP` bump (docs-only).

---

## 2026-07-08 03:30 UTC — README: added a condensed Timeline section
- Added a "Timeline" section to `README.md`, six high-level dated milestones (redesign, localization rebuild, favicon/OG work, etc.), each sourced from real entries already in this file. Placed before the closing "Work in progress" note.
- Deliberately condensed, not a mirror of this file: `CHANGELOG.md` is 280+ lines of granular per-fix detail; pasting all of it into the README would bury the first-impression document under engineering detail meant for a different audience. The README section links back to this file for full detail.
- Earliest entry in this file is 2026-07-06 (evening); the README timeline starts there too. No earlier project history was available to reflect further back.
- No code changed; no `BUILD_TIMESTAMP` bump (docs-only).

---

## 2026-07-08 03:03 UTC — Favicon and Open Graph/Twitter share-card tags added (v18)
- Live demo link had no favicon and no link-preview support: sharing `https://joymckenzie.github.io/AgriGuardian/` on LinkedIn/Slack/iMessage showed a bare URL with no title, description, or image.
- Generated `favicon.ico`, `favicon-16.png`, `favicon-32.png`, and `apple-touch-icon.png` from the existing white LGD logo artwork (already embedded as base64 in `index.html`), cropped to its content bounds and placed on a forest green (`#1F4D2E`) square so the mark reads clearly at small sizes.
- Built `og-image.png` (1200x630): forest green background, white LGD logo, "AgriGuardian" wordmark, tagline, and a one-line descriptor.
- Added favicon `<link>` tags, `<meta name="description">`, Open Graph tags (`og:type`, `og:title`, `og:description`, `og:image`, `og:url`), and Twitter Card tags to `index.html`'s `<head>`, ahead of the existing stylesheet links.
- `BUILD_TIMESTAMP` bumped to `2026-07-08T03:03:14Z`.
- Note: `og:url`/`og:image` are hardcoded to the current Pages URL; update both if that URL ever changes.

---

## 2026-07-07 23:52 UTC — Owner-only report email: replaced fragile role gate with a stable id (v17)
- The "Report delivery email" field in Settings > Farm Account is Owner-only. Its hide-for-non-owners gate used `emailSection.closest('div[style*="margin-bottom:14px"]')` — a brittle inline-style-substring lookup. It works on first render, but once any code sets `.style.display` the browser re-serialises the style to `margin-bottom: 14px` (with a space), so the selector stops matching on re-render and the gate can silently no-op, leaving the field showing to Farm Hand / Technician / Manager.
- Gave the wrapper a real id `#owner-email-row` (index.html) and changed the gate in `settings.js` to `document.getElementById('owner-email-row')`. Now the field is hidden for every non-owner on every render. Verified across all four roles in a headless render test (Owner: visible; Farm Hand / Technician / Manager: hidden). Note: this gate was byte-identical to the original v13 — not introduced by the localization work — but it was genuinely fragile, so it's now fixed properly.
- `BUILD_TIMESTAMP` bumped to `2026-07-07T23:52:21Z`.

## 2026-07-07 23:42 UTC — Page background set to white (v16); stops the sage bleeding outside the prototype
- The page canvas (`body` background in `styles.css`) was `#EEEEEA`, so the sage app card (`.app`, `#E7F0E7`) blended into a near-matching backdrop and read as sloppy bleed from the prototype. Changed the `body` background to `#ffffff` so the app frame sits on clean white and reads as a contained device mock. The app's own interior surface is unchanged.
- Packaged as `AgriGuardian-redesign-stage1-2b-v16.zip` (supersedes v15). `BUILD_TIMESTAMP` bumped to `2026-07-07T23:42:46Z`.

## 2026-07-07 23:36 UTC — Packaged as v15 snapshot (retires the confusing v14 packaging attempts)
- Settled on `AgriGuardian-redesign-stage1-2b-v15.zip` as the single, unambiguous deliverable — the intermediate v14 zips caused version confusion and are discarded. Same app content: v13 + the Spanish-localization rebuild; no code change from the v14 attempts.
- Zip follows the archive convention: `AgriGuardian/` root, 37-file layout, file permissions normalised to 0644/0755 so Windows' Attachment Manager doesn't flag the extensionless `LICENSE` (the execute bit inherited from the build sandbox had triggered a "potentially harmful" block on extract).
- Bumped `BUILD_TIMESTAMP` to `2026-07-07T23:36:34Z` for the final build. (The stamp had previously lagged a couple of small post-localization edits — the `setLang` Apps/Backups re-render and the add-form `applyI18n()` sweeps; this reflects the shipped v15.)
## 2026-07-07 22:50 UTC — Changelog timestamp reconciliation from archived version snapshots
- Back-filled precise build times onto the redesign-series entries below (stage 2 through v13) using each archived zip's `BUILD_TIMESTAMP` (the authoritative UTC build marker). Times shown are UTC; subtract 4h for ET (e.g. 20:59 UTC = 16:59 ET). Entries before "Redesign stage 2" (17:46 UTC) predate the available snapshots and keep their original informal time-of-day markers.
- Verified each snapshot's changed files against its changelog entry (v-stage1-2 → v13): every version's entry accurately reflects its actual changes — **except v6**, which shipped a comment-only edit with no entry. Recovered as the "Farm Hand caution comment aligned…" entry below (19:14 UTC).
- No application code changed in this pass — changelog only.

## 2026-07-07 22:29 UTC — Spanish localization rebuilt on one source of truth (systemic fix)
- **Problem:** Spanish translation kept "half working" — some strings translated, others stayed English no matter what was patched. Root cause was architectural, not missing dictionary keys (EN/ES were already balanced). Four compounding causes: (1) `setLang()` translated by re-setting `.textContent` on a hand-maintained list of ~300 element IDs, and that list had drifted — ~69 entries pointed at IDs that no longer existed (`lbl-device-name` vs `lbl-device-label`, `brand-input` vs `custom-brand-input`, whole `opt-type-*`/`opt-loc-*`/`lbl-net-pw*` sets), and entire dropdowns (device type, location, network conn type, team roles) had no IDs and were never wired; (2) dynamically-rendered content emitted hardcoded English — `vulnerabilities.js` had zero `t()` calls, `networks.js` hardcoded recommendations/timeline/detail labels/confirms, device detail hardcoded "Not assigned to you"/accordion titles, and nearly every `alert()/confirm()/prompt()` was hardcoded; (3) the activity log stored and rendered raw English (actions, roles, timestamps); (4) risk/password/encryption logic was coupled to displayed text, so translating a value could silently break it.
- **New architecture (one source of truth):** every UI string routes through one `t(key)` (now with `{placeholder}` interpolation, killing the broken sentence-concatenation). Every text element in `index.html` carries a `data-i18n`/`-ph`/`-aria`/`-title`/`-alt`/`-optlabel`/`-prefix` attribute (330 total), and a single new `applyI18n(root)` sweep (in `core.js`) translates them all — on load, on every language switch, and at the end of every dynamic render. `setLang()` shrank from ~330 hand-maintained lines to a ~30-line sweep plus the few genuinely dynamic cases (dropdown value sync, build stamp, interpolated invite hint, list/detail/settings/apps/backups re-renders).
- **Audit log is now key-based** (`audit.js`): `logAction()` stores a translation key (+ optional `{params}`/`{raw}` data), and `renderAuditLog()`/report viewer/PDF translate action, role (`tRole()`), and timestamp at render time — so the whole log re-localizes on language switch. ~30 `logAction` call sites migrated across `session/team/settings/permissions/devices-*/networks/apps/reports/report-viewers/accessibility/auth-ui`.
- **Dictionary:** ~200 new EN+ES keys added (dialogs, dynamic-render strings, vuln text, audit actions, form labels, option lists). EN/ES balanced.
- **Explicit allowlist:** brand names, device model/serial numbers, person names, "AgriGuardian", CVE IDs, URLs, phone numbers and demo codes stay untranslated by simply carrying no `data-i18n` attribute — documented in `core.js`. Individual time-zone option labels left untranslated as geographic identifiers (their category headers *are* translated).
- **Logic decoupled** from display text where it was coupled (dual-language matching for password/encryption auto-detect in `networks.js`; canonical role/status enums shown via `tRole()`/status keys). Fixed add-device/add-network form-open handlers that would have stripped translated label spans.
- **Verified:** rendered the real annotated `index.html` against the real dictionary, switched to ES and swept — 302 translatable elements all render Spanish, **zero untranslated leaks**; all 285 HTML keys, 62 audit keys, and 594 `t()` references resolve to the dictionary; `node --check` clean across all 25 JS modules; role paths (Manager, Technician, Farm Hand/read-only) route role/permission labels through translation. `BUILD_TIMESTAMP` bumped.

---

## 2026-07-07 20:59 UTC — Page canvas back to neutral so the app doesn't bleed into the background
- The outer page `body` had been turned sage (`#E7F0E7`) too, so the app card — whose own surface is also sage — dissolved into the background. Reverted the page canvas to a neutral `#EEEEEA`; the app's interior surface stays `#E7F0E7`, so the app reads as a contained frame again. Added the canvas value to `PALETTE.md`. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 20:48 UTC — Slide-out drawer switched to the light theme
- The expanded drawer read as too dark a slab against the now-light app. Reskinned it to a light panel using the canonical palette: body `#F3F8F2`, labels `#22372A`, icons `#5F7266`, active tab `#E2EFE8` with a `#1F4D2E` accent bar (and `#1F4D2E` label/icon), hover `#E7F0E7`, divider `#D7E4D7`. Added a soft left shadow (`-4px 0 16px rgba(0,0,0,0.12)`) so the light panel still reads as elevated over the content.
- Report block in the drawer flipped to light too: green section headers (`#1F6E43`), ghost green View/Download icons (`#1F4D2E`) with `#E4EEE4` dividers, and the Email button kept solid green (`#2E7A4E`).
- The dark-green pull tab (`#1F4D2E`, white chevron) is kept as the grab affordance — a small brand anchor against the light panel. High-contrast mode still forces white-bg/black-text as before.
- Verified: `validate-split.py` passes. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 20:37 UTC — Colour standardisation pass + palette reference + visual style guide
- Ran the approved colour audit and standardised the whole app to one shade per role (see `PALETTE.md`). Drift outside the high-contrast file is now zero.
- **Role-aware, property-scoped** (never blind find/replace): text via `color:` (primary `#22372A`, secondary `#5F7266`, muted `#7A8F80`); borders via `solid #…` (card `#D7E4D7`, divider `#E4EEE4`, field `#CBD8CB`); card/box surfaces via `background:#…` -> `#F3F8F2` (form-field white kept). Single-role hexes unified: info blues -> `#1A5FA8` (+ tint `#E6F0FA`, border `#92B4E3`), escalation -> `#5B21B6` (+ tint `#EFEAF7`), success tint -> `#E2EFE8`, review tint -> `#FBF6E9`, stray dots `#C0392B`->`#E24B4A` / `#C9A400`->`#D4C000`.
- **High-contrast palette left exactly as-is** (`accessibility.js`: `#CC0000`, `#006600`, `#005577`, etc.) — deliberately a separate set.
- Added `PALETTE.md` (canonical values + drift map) and `style-guide.html` (visual swatch board with hexes, typography, and live component examples) to the repo docs.
- Verified: `node --check` on every edited module; `validate-split.py` passes; HC values confirmed untouched; zero residual drift. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 20:20 UTC — Manager dashboard unified with Owner; security tips shown to every role
- **Manager top summary** now uses the same calm FARM STATUS tab cards as the Owner (severity split, soft weight) instead of the big bold red "Device problems / 5" count cards Joy flagged as too high-contrast. The Manager keeps its own unassigned/assigned-work triage lists below — that's its distinct job, which the Owner doesn't have.
- **Security tips for everyone:** the rotating tip card now renders on every role's dashboard (Owner, Manager, Technician, Farm Hand/Viewer), not just the Owner — general, non-sensitive, and most useful for the Farm Hand.
- Refactored to two small closures in `renderDashList()` — `farmStatusCards()` (Owner + Manager) and `securityTipsCard()` (called once after the role branch, so all roles get it with no duplication and a single `#dash-tip-text`). No behaviour change to the work lists or navigation.
- Verified: `node --check` + `validate-split.py`; `farmStatusCards()` used twice, `securityTipsCard()` once, no `dashDeviceProblems` count card left. `BUILD_TIMESTAMP` bumped.
- Note: the Manager's conditional escalated *count* card (`card()`, shown only when escalations exist) still uses the bold style; can be calmed to the "Needs your attention" pattern on request.

## 2026-07-07 20:10 UTC — Rotating security-tip ticker fills the Owner dashboard
- Replaced the Recent Activity fill with a rotating **security tip** card (Joy's idea — turns dead space into something educational, fitting the "make security routine" mission). Short, glanceable, one tip at a time, auto-advancing every ~6.5s with a fade; respects reduced-motion (no auto-rotate when that's on).
- Local default tip set of 8 (bilingual EN/ES `securityTips` array + `securityTipLabel`), each a single plain-language action ("Turn on MFA for every account that offers it", "Change any device still using its factory password", etc.).
- **Aligned to the backend plan Joy shared:** the ticker is the prototype stand-in for the vendor-side Third-Party Risk Monitoring / Alert Relay (`BACKEND-ARCHITECTURE-PLANNING.md` §12.3) feeding farm-specific findings as SecurityAlerts (§6) — fixed plain-language templates, one recommended step each. Code comment points at those sections; the array is swappable for that feed without changing the render/ticker.
- New ticker helpers in `dashboard.js` (`currentSecurityTips()`, `startTipTicker()`, guarded single interval, cleared when the element leaves the DOM). Owner dashboard only for now.
- Verified: `node --check` + `validate-split.py`; `securityTips` parses (array), label present in both language blocks. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 20:05 UTC — Softer cards, sage everywhere, Recent Activity fills the Owner dashboard
- Joy found the pure-white cards too stark against the sage background, and the Owner dashboard too empty below the status cards.
- **Softer cards:** card fills moved from `#fff` to a warm off-white-green `#F3F8F2` with a gentler `#D7E4D7` border (dashboard cards, `alertRow`, `.device-card`) so they lift from the background without glaring.
- **Sage everywhere:** the page `body` (`#f5f5f0`) and the app surface (`#EAF3EA`) both move to `#E7F0E7`, so there's no stark off-white left; only the cards stay lighter.
- **Recent Activity** peek added to the Owner dashboard (last 4 audit-log entries — action, actor, time), filling the space the reports left when they moved to the drawer. Built from the existing `auditLog`; new bilingual key `recentActivityLabel`. Dropped the earlier "Farm health" idea — "health" reads as animal/crop health to a farmer.
- Verified: `node --check` + `validate-split.py`; `recentActivityLabel` present in both language blocks and referenced. `BUILD_TIMESTAMP` bumped.
- Note: several detail-screen cards in other files still use `#fff` inline; a full sweep to the soft tone can follow.

## 2026-07-07 19:27 UTC — Owner FARM STATUS cards toned to match the calm (non-read-only) style
- Joy compared the Technician dashboard (calm) with the Owner FARM STATUS cards (too high-contrast). The difference was type weight: Technician device rows render at `font-weight:400` / `#333`, while the Owner tab cards were `600` / `#22372A`.
- Brought the Owner tab-card labels down to `font-weight:500` / `#333`, and aligned the severity dot colours to the shared `alertRow` palette (`#E24B4A` red, `#D4C000` yellow) so every severity-seeing role matches. Read-only (Farm Hand/Viewer) keeps its own colour-safe treatment, unchanged.
- Verified: `node --check` + `validate-split.py`. `BUILD_TIMESTAMP` bumped.
- Note for a follow-up: the Manager dashboard uses a different bold "big number" count card (`card()`, 28px/800) — left as-is here; can be calmed the same way on request.

## 2026-07-07 19:14 UTC — Farm Hand caution comment aligned to the colour-safe treatment (docs only)
- Reworded the inline comment in `dashboard.js` describing the Farm Hand view-only states so it matches the colour-safe palette shipped in the entry below ("soft green / soft blue / slate, with the icon shape carrying caution rather than colour"). Comment-only clarification — **no behaviour or output change**; `BUILD_TIMESTAMP` bumped (19:14:56 UTC).
- Reconstructed from version snapshot **v6** during a changelog timestamp reconciliation (2026-07-07 22:xx UTC): v6 shipped this comment edit with no changelog entry at the time. Logged now for completeness.

## 2026-07-07 19:14 UTC — Dashboard balance: calmer Owner, clearer Farm Hand (no amber)
- Addressing the two extremes Joy flagged — the Owner dashboard read as very high-contrast/busy, the Farm Hand one as almost too muted. Mocked and approved before coding.
- **Owner:** the four separate colour-coded sections (escalated=purple, observations=blue/amber, returned=orange, partial=purple) are folded into one calm "Needs your attention" list. Two accents only now: purple for action items (escalated / decision-needed / returned), blue for observations — the icon (`ti-flag` / `ti-bolt` / `ti-arrow-back-up` / `ti-eye`) and a sublabel carry the type. Cards are white with a small tinted icon and normal-weight text instead of bold colour on saturated tints. All click targets (`showDetail(id)`) and the 3-state observation logic are preserved. New bilingual key `needsAttentionLabel` (EN "Needs your attention" / ES "Requiere tu atención").
- **Farm Hand:** kept colour-safe (still no red/yellow severity, per least-privilege) but made the three states legible and consistent with the Owner card layout — Fine = soft green + thumb-up, Known issue = soft blue + info, Use with caution = slate + alert-triangle. **Amber removed** (it sat too close to the severity yellow); the triangle icon now carries "caution", not colour. Added a leading device-icon tile so it reads as the same app, not a stripped-down list.
- Verified: `node --check js/dashboard.js`; `validate-split.py` passes; `needsAttentionLabel` present in both language blocks and referenced once. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 18:25 UTC — Icon pass batch 1: nav-tab icons + icon-only card row-actions
- From the app-wide icon audit; the two lowest-risk, highest-payoff batches.
- **Nav tabs (icon + label):** drawer tabs now lead with icons — Dashboard `ti-home`, Devices `ti-device-desktop`, Network `ti-wifi`, Apps `ti-apps`, Backups `ti-cloud`, Settings `ti-settings`. Labels kept (still translated via their spans); icons `aria-hidden`.
- **Card row-actions (icon-only):** Archive `ti-archive`, Restore `ti-arrow-back-up`, Delete `ti-trash` on device, network and app cards. Text replaced by icons but preserved as a `.sr-only` label + a `title` tooltip, so screen readers and hover still get the word, and the EN/ES `t()` values still drive both. Networks/apps gained the `title` tooltips they previously lacked.
- Added a `.sr-only` utility and made `.device-action-btn` a compact inline-flex icon button.
- Verified: `node --check` on all three edited modules; `validate-split.py` passes. `BUILD_TIMESTAMP` bumped.
- Deferred to a later batch (per the audit): the icon+label actions (Assign/Escalate/Verify/Invite/Run backup, etc.) and team-member row actions.

## 2026-07-07 18:17 UTC — Drawer reports: icon-only actions (fixes clipped Email button)
- Joy found the Email action missing from the drawer's Hygiene Report / Activity Log rows. Cause: flexbox overflow — the long "Download" label kept the three buttons from shrinking, so they overran the 212px drawer and the card's `overflow:hidden` clipped the third (Email) button.
- Fixed by making the drawer report actions icon-only: `min-width:0` on the buttons plus a screen-reader-only treatment on the label `<span>`s (visually hidden, still announced). Icons (eye / download / envelope) stay; the accessible names are preserved for screen readers and accessibility mode. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 18:15 UTC — Drawer polish: wider content gutter so the pull tab clears the content
- Joy noticed the slide-out handle rested on top of the screen content because the content ran to the app's right edge. Widened `.screen` padding to `18px 40px 18px 18px` (extra right gutter) so the resting handle sits in empty space beside the content, not over it. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 18:09 UTC — Redesign stage 2b: report actions moved into the slide-out drawer
- The Hygiene Report and Activity Log button block (`#report-buttons`) moved from the dashboard screen into the navigation drawer, below the tabs — the dashboard is now just the farm status.
- Kept the same element ids (`report-buttons`, `btn-view/download/email-report`, `btn-view/download/email-activity`), so `dashboard.js`'s visibility gating (`canExportReports()` -> show/hide) and every `onclick` still resolve with no JS change. Moved by div-depth extraction; verified the ids stay unique.
- `styles.css`: added `.nav-panel #report-buttons` overrides so the block reads on the dark-green drawer (transparent card headers with mint labels, translucent View/Download buttons, green Email button).
- Verified: `validate-split.py` passes (98 handlers resolve); structural check confirms the block is in the drawer, gone from the dashboard, all six report-button ids present and unique. `BUILD_TIMESTAMP` bumped.

## 2026-07-07 17:46 UTC — Redesign stage 2: top tab bar converted to a right-side slide-out drawer
- The horizontal `.nav` tab bar is now a right-anchored slide-out panel (`#nav-panel`) with a peek handle (`#nav-handle`) on the right edge and a dim scrim (`#nav-scrim`). Tap the handle to open, drag it (pointer events) to open/close, tap the scrim or pick a tab to close.
- **Deliberately conservative:** the six `.nav-btn` buttons are unchanged — same class, order, ids (`nav-btn-network/apps/backups`), and `onclick="showScreen(...)"`. Only their container moved and was restyled. This keeps every existing reference working: `showScreen`'s `.active` toggling, the index-based back-refs (`querySelectorAll('.nav-btn')[1]`/`[2]`), `:last-child` (Settings), `querySelector('.nav-btn')` (Dashboard fallback), and the role-gating in `auth-ui.js` that hides Network/Apps/Backups by id.
- New self-contained module `js/nav-drawer.js` (registered in `index.html` and `module-load-order.json`) wires the handle via `addEventListener` — no new inline handlers. Close-on-select is event-delegated on `.nav`, so no button markup changed.
- **Accessibility:** high-contrast mode already forces the nav white with black text; added matching `#main-app .nav-panel` (white) / `#main-app .nav-handle` (black) overrides so the drawer stays readable, and reduced-motion disables the slide transition.
- `styles.css`: `.app` made `position:relative`; `.nav` restyled from a white horizontal bar to a full-height green vertical list; `.nav-btn` to left-aligned white rows with a mint active bar; added `.nav-scrim` / `.nav-panel` / `.nav-handle`.
- Verified: `validate-split.py` passes (parse, no dup decls, all 98 handlers resolve); `node --check js/nav-drawer.js` clean; a structural DOM check confirms the drawer wrappers, the handle, and the six tabs in unchanged order. `BUILD_TIMESTAMP` bumped.
- Not in this change (next sub-step): moving the Hygiene Report / Activity Log actions into the drawer; they remain on the dashboard for now.

## 2026-07-07 — Redesign stage 1: dashboard status cards de-reddened, sage background, severity split
- First stage of the approved UI redesign (full spec in the decisions doc). Kept deliberately small and self-contained so it could be verified before the larger navigation work.
- **Removed the tinted backgrounds on the Owner dashboard FARM STATUS cards** (`tabCard` in `js/dashboard.js`) — the pink `#FCEBEB` fill that made every category read as urgent is gone; cards are now plain white with a hairline border.
- **Split each card's issue count into a critical (red dot) and to-review (yellow dot) count** instead of one lumped "N issues", reusing the red/yellow counts `renderDashList()` already computes (`redDevices`/`yellowDevices`, `netRed`/`netYellow`, plus new per-risk app/backup counts). A category with none shows a green dot + `t('noIssues')`.
- **Color-blind mode:** when `a11ySettings.colorBlind` is on, the dots become distinct shapes (triangle = critical, circle = to-review) in a blue/orange safe palette, so severity never depends on colour alone. High-contrast keeps its heavier border.
- **RBAC respected:** `tabCard` is Owner-only; Farm Hand/Viewer never reach it (they keep the neutral "Your devices" list), so no severity colour leaks to view-only roles. Signature changed `(label, risk, count, navFn)` -> `(label, redCount, yellowCount, navFn)`; the now-unused `devRisk`/`netRisk2` locals removed.
- **`styles.css`:** `.app` background tinted from `#fff` to a light sage `#EAF3EA`, border softened to `#cfe0cf`; cards stay white so they still lift. Login screen unaffected (it lives in `#login-wrapper`, outside `.app`).
- Verified: `python3 validate-split.py` passes all checks (parse, no duplicate decls, all 98 handlers resolve); `node --check js/dashboard.js` clean. `BUILD_TIMESTAMP` bumped.
- Still to come in later stages (not in this change): the right-side slide-out nav with drag handle, moving reports into the slide-out, Settings preferences (handle side, pinned landing, live-apply, reset), and Help/FAQ.

## 2026-07-07 — Fixed: "+ Add network" button permanently disappearing after use
- Joy reported: the button was there the first time she visited the Network tab, but after navigating to other tabs and back, it was gone for good.
- Root cause, found and reproduced: `toggleNetAddForm()` located the sort-row to hide/show via a fragile selector — `document.querySelector('#screen-network div[style*="align-items:center"]')` — matching by inline style string rather than a real id. The title/button row directly above (which contains "+ Add network" itself) *also* has `align-items:center` in its own style, and comes first in the DOM, so `querySelector` grabbed that row instead of the intended sort row.
- Practical effect: opening the "Add network" form even once set the *button's own row* to `display:none` instead of the sort row. Since the static page markup persists across tab switches (only the dynamic list content inside `#network-list` gets rebuilt), that hidden style stuck permanently — the button looked like it had vanished for good, not just while the form was open.
- **Reproduced directly against the pre-fix code** before treating it as confirmed: a single open/close cycle of the add-form left the button's container at `display:none`, exactly matching the reported symptom.
- Fixed at the source: gave the sort row a real id (`net-sort-row`) in `index.html`, and updated `toggleNetAddForm()` to target it directly instead of matching by style string.
- Checked for the same fragile-selector pattern anywhere else in the codebase — this was the only instance.
- Verified via jsdom: the button survives 5 repeated open/close cycles, survives navigating away with the form left open mid-edit, and the sort row itself still correctly hides while the form is open and reappears when closed. Plus a full 4-role regression sweep across dashboard/devices/networks/apps.

## 2026-07-07 — Audit fix pass: 2 criticals, 4 real bugs, 2 new-feature bugs, + cleanup
Applied against the 3-state-observation build, from the audit in `AUDIT-FINDINGS.md` / `AUDIT-FINDINGS-v2.md`. Every fix verified by re-running the jsdom harness (full 5-role x all devices/networks/apps render sweep: zero errors) — see per-item checks below.

**Critical**
- **C1 — `showAddForm()` no longer crashes.** It called `safeSet(...)`, which only exists as a local inside `setLang()`; the ReferenceError aborted the Add-Device form mid-render and left the brand/type/location dropdown handlers unwired. Swapped to the in-scope `safeInline('[id="lbl-mac-hint"]', ...)`. Verified: form renders, `brandSel.onchange` now WIRED.
- **C2 — Farm Hand / Viewer can no longer add devices.** The `+ Add device` button was ungated and `showAddForm()`/`addDevice()` had no permission check. Now: button hidden by `renderDeviceList()` when `!currentPerms().addDevices`, and function-level guards on `showAddForm()`, `addDevice()`, and (for parity) `addNetwork()`. Verified: Farm Hand button `display:none`, `addDevice()` no longer mutates the device list.

**Real bugs**
- **R1 — `FILE-MAP.md` corrected.** It described archive/delete as "not yet RBAC-gated / still open" when the code gates it; updated both notes (and recorded that add-device is now gated too).
- **R2 — Farm Hand pill colors unified.** The darker Fine/Known-issue colors existed only on the dashboard; `deviceCardHTML()` (device list) and the device-detail view-only note still used the old lighter set. All three now share the dashboard palette.
- **R3 — `investigateObservation()` comment corrected** to match its (correct) behavior: it does not clear `observationPending`; only a committed assignment does.
- **R4 — Spanish `inviteBtn` fixed.** It was defined twice in the ES block; the stray `"Tengo una invitación"` won over `"Enviar invitación"`. Removed the duplicate. Verified: `t('inviteBtn')` in ES = "Enviar invitación". Also de-duplicated `selectType` (EN+ES).

**New-feature bugs (from the 3-state observation work)**
- **N1 — green device keeps its Assignment controls while under investigation.** `canAssign` only special-cased `observationPending`, so a green device lost the Assignment section the moment it moved to "investigating." Added `|| d.observationInvestigating`. Verified: assign-select present on a green+investigating device.
- **N2 — closing an investigation no longer leaves a phantom assignment.** Per decision: "no issue found" clears `assignedTo` (nothing left to own); "confirmed problem" keeps it (someone owns the fix) until `clearOperationalIssue()`, which then clears it. Verified all three paths, and that a no-issue device drops off the Manager "assigned work" list.

**Conflicting logic / cleanup**
- **W1 — `#report-buttons` single-gated.** `_enterApp()` used `canSeeHygieneScore()` while `renderDashList()` used `canExportReports()` (which always won). `_enterApp()` now uses `canExportReports()` too.
- **W4 — `addApp()` / `saveAppReview()`** gained the `canSeeApps()` guard their archive/restore/delete siblings already had.
- **CL1 — removed 8 orphaned functions** (0 callers, grep-verified): `renderHygieneScore`, `saveResolution`, `renderAddScreen`, `saveHealth`, `saveNvdKey`, `scrollToSection`, `toggleHandoffLog`, `translateLocation`. `computeHygiene()` and `nvdApiKey` kept (still used).
- **CL2 — removed 9 unused CSS classes**: `.add-btn`, `.alert-banner`, `.lang-btn`, `.lang-toggle`, `.login-screen`, `.resolve-select`, `.summary-grid`, `.risk-detail-purple`, `.t-purple`. (Dynamically-built `.badge-*`/`.dot-*` left intact.)
- **CL3 — duplicate id `lbl-cred-warn`** (device + network forms) — network one renamed to `lbl-cred-warn-net` and given its own `setLang()` line (it previously never translated, since `getElementById` only hit the first).
- **CL4 — dead params / expression**: dropped the unused 2nd arg on `selectPw`/`selectNetPw`/`selectNetEnc`; removed the tautological `t('ownerRole') === t('ownerRole')` in `settings.js`.

**Deliberately NOT changed (needs a product decision, flagged not guessed):**
- **N3** — a Technician assigned to investigate still sees no banner on a green device; per your call, left as-is (Owner/Manager triage).
- **W2** — the add-device brand dropdown offers ~13 brands with no `getRiskData()` entry (all fall back to "Other"). Not fixed here: populating real support/CVE data can't be fabricated, and trimming the list is a product call.


## 2026-07-07 — Apps tab converted to the same animated accordion, collapsed by default
- `showAppDetail()` was a flat page — plain risk banner, a non-collapsible "App details" block, and a review/edit form that was always fully visible with no way to collapse it. Converted to the same accordion pattern used on devices/networks: How to fix this → App details → Notes → Update review status.
- All sections default collapsed, no exceptions — this was built correctly the first time, since the "actionability-based auto-open" mistake (sections opening themselves whenever something was actionable, causing multiple sections to expand simultaneously) had already been caught and removed from devices/networks earlier the same night. Never introduced here.
- Simpler build than the device/network accordion rebuilds: Apps is Owner-only (`canSeeApps()`), so there's no role branching and no decision-slot/escalation-banner equivalent needed — just the plain collapsible sections.
- `saveAppReview()` needed no changes — every form element id was preserved exactly as before, and it already navigates back to the Apps list on save rather than re-rendering the detail accordion, so there was nothing to break there.
- Verified via jsdom: 9 checks — all 4 sections present and collapsed on render, Owner-only access unchanged (Manager/Technician/Farm Hand still can't reach this screen at all), a manual toggle actually opening and closing, the full save flow (owner name, renewal, notes) still working end to end, and state correctly resetting to collapsed on a fresh render even after a section had previously been opened. Plus a full 4-role regression sweep across dashboard/devices/networks/apps to confirm nothing else was disturbed.
- Ripple-checked: `showAppDetail()` has no callers outside `apps.js` itself (only `renderAppsList()`'s card click handler) — fully contained change.

## 2026-07-07 — Observation lifecycle extended to a real 3-state model (Reported → Investigating → Closed)
- Joy caught two real problems with the single-banner design from the previous entry: (1) once "Investigate" led to an assignment, the banner just vanished — a device under active investigation looked identical to one nobody ever flagged, the exact "black hole" problem this feature was built to prevent, just moved one step later; (2) the green "Looking good" banner showing right next to "Issue reported" was a direct contradiction — two banners telling a person opposite things at once.
- **Unusual note on how this got built:** a substantial, correctly-implemented version of this exact fix (matching the mockup design closely, including the same field/function naming) was already present in the code when checked — `d.observationInvestigating`, `d.knownOperationalIssue`, `closeInvestigationNoIssue()`, `closeInvestigationConfirmed()`, `clearOperationalIssue()`, all correctly wired with matching bilingual `lang-data.js` keys. This wasn't something written and verified in a visible step this session; rather than assume it was correct because it existed, it was audited with the same rigor as if built from scratch — every referenced lang key checked for existence (all present, all bilingual), every function's logic read and traced, and the whole thing tested end to end via jsdom before trusting it.
- **Real gaps found in that existing code and fixed:** `observedDevices()` (dashboard.js) only checked `d.observationPending`, meaning a device moving into "under investigation" or "confirmed operational issue" would silently drop off the Owner/Manager dashboard — recreating the exact problem this feature exists to solve. Fixed to include all three states. Both Owner's and Manager's dashboard card rendering also always showed the *original* report text regardless of current state — fixed to be state-aware: blue for freshly reported, dashed blue with the assignee's name for under-investigation, amber for a confirmed operational issue.
- **The 3-state model, confirmed via jsdom end to end:**
  1. **Reported** (blue, solid border) — Dismiss or Investigate.
  2. **Investigating** (blue, dashed border, distinct from state 1) — persistent, shows who it's assigned to and the original note, closes with a real either/or: "No issue found" or "Confirmed a problem" (the latter requires a note — what was actually found).
  3a. **Closed, no issue** — device fully clears, green risk banner returns, honestly, since at that point it's no longer contradicting anything.
  3b. **Closed, confirmed problem** — amber "Known operational issue" banner, persists with the finding until someone explicitly clears it once actually fixed (`clearOperationalIssue()`) — never quietly reverts to calm/green while something confirmed is still wrong.
- The green/resolved banner is now suppressed at the top of the page whenever *any* of `observationPending`/`observationInvestigating`/`knownOperationalIssue` is true — one signal at a time, never two contradictory ones stacked.
- A fresh new observation correctly restarts the whole lifecycle from scratch, even if a prior one on the same device had gone all the way through to a confirmed-and-cleared operational issue.
- Verified via jsdom: 15 checks covering the full lifecycle end to end (reported → investigating → both closing paths → clearing a confirmed issue → a fresh report restarting everything), dashboard-card parity between Owner and Manager maintained at every stage, Technician/Farm Hand confirmed to never see any of these banners, and a full 4-role regression sweep. Also explicitly reconfirmed accordion sections still default fully collapsed even with these new device states active.

## 2026-07-07 — Observation ("Notice something?") given a real workflow, and a real parity bug fixed
- Worked through the logic with Joy before building anything: who acts on a report, does closing it out need a note, what happens when a device looks fine (green) but the report describes something the risk model can't see (her example: tractor can't reach the satellite — not a password/brand issue, a connectivity/operational one).
- **Confirmed real bug, not a feeling:** Owner and Manager did NOT see the same thing on their dashboards. Owner's Observations card was named and specific, linking straight to the exact device. Manager's used the generic count-card component — a bare number linking to the general device list, forcing Manager to go hunt for it. Fixed: Manager's now matches Owner's exactly.
- **New device-page banner** (`deviceDecisionSlotHTML`'s 4th case, Owner/Manager only, lowest priority of all decision-slot cases): shows "Issue reported — [name]" with the actual note, regardless of the device's underlying risk color. This is the direct fix for the gap Joy's screenshot showed — a device with a real reported problem could look like a plain, calm "Looking good" page with nothing indicating anything was wrong.
- **Two real actions, not a passive "reviewed" checkbox** — per the workflow discussion: a checkbox doesn't capture "is this the device, the network, a third-party outage, or an attack," and her example needed actual direction, not acknowledgment.
  - **Dismiss** — optional note, for when there's genuinely nothing to act on.
  - **Investigate** — opens the existing Assignment section, pre-filled with a note referencing what was reported, and routes through the exact same assign → resolve/escalate pipeline every other issue already uses. No new status types, no new permission model, no scheduler for "check back later" (a device staying visibly open with a note about timing already is the follow-up mechanism).
- **Real bug found and fixed while building this:** the Assignment section couldn't render at all for a green-risk device (`canAssign` required `risk !== 'green'`) — meaning Investigate had nothing to open for exactly the scenario this feature exists for (a healthy-looking device with a real reported problem). Fixed: `canAssign` now also applies when `d.observationPending` is true.
- **State design, decided deliberately:** the pending flag only clears when an assignment actually *commits* (inside `assignIssue()`), not when the Investigate form merely opens — abandoning the form without assigning correctly leaves the report still pending, still visible. A fresh observation always reopens the flag even if a prior one on the same device was dismissed or sent to investigation.
- `observedDevices()` simplified to check the new `d.observationPending` flag directly, replacing the old check (any past observation in `handoffLog`, ever) which never actually cleared short of the whole device becoming resolved or archived.
- **Deliberately not solved, flagged instead:** the risk model (`getRisk()`) has no concept of "operationally broken but not a security issue" — a third-party service outage or connectivity problem doesn't fit red/yellow/green at all, since that model is brand/password-based. This banner fixes visibility of the report; it does not fix that deeper data-model gap. Treated as its own future conversation, not papered over here.
- New `lang-data.js` keys (EN+ES): `obsBannerTitle`, `obsBannerBy`, `obsDismissBtn`, `obsInvestigateBtn`, `obsDismissNoteLabel`, `obsDismissNotePlaceholder`, `obsDismissConfirmBtn`, `obsDismissedNoNote`, `obsInvestigatePrefill`, `handoffTypeObservationDismissed`.
- Verified via jsdom, full workflow: Farm Hand reports on a green device (matching Joy's exact screenshot scenario) → Owner and Manager both see the identical banner → Owner and Manager's dashboard cards render identically → Dismiss clears everything correctly (banner, dashboard card, logged to history) → a fresh observation after dismiss correctly reopens the banner → Investigate opens Assignment pre-filled and leaves the flag pending until an actual assignment commits → the full assign flow completes end to end. Plus a full 4-role regression sweep, plus a specific check confirming accordion sections still all default collapsed even on a device with a pending observation.
- One test-writing mistake caught and fixed mid-session (not a code bug): an early test asserted the flag should clear the instant `investigateObservation()` runs — that was testing the old, less correct behavior; the actual (correct) design leaves it pending until real commitment. Test was rewritten, not the code.

## 2026-07-07 — CORRECTION: accordions were not actually defaulting to collapsed
- Joy caught this live: several devices under Manager showed multiple sections expanded by default. Earlier tonight I'd verified accordion state *resets on logout* and reported that as satisfying "defaults to collapsed" — those are two different things, and I conflated them. Resetting-on-logout was true; actually defaulting to collapsed was not.
- Root cause: several sections had "smart" open-by-default logic (open "How to fix this"/"Assignment"/"Remediation checklist" whenever they're actionable for the current role). For Manager, who can act on almost everything, that meant 2-3 sections open simultaneously on most non-green devices — the opposite of what was asked.
- Fixed by removing all actionability-based auto-open logic — every accordion section (`fix`, `assign`, `remediate`, `details`, `history`, `observe` on devices; `fix`, `assign`, `details`, `notes`, `history`, `resolve` on networks) now hardcodes `false`, full stop.
- **Verified exhaustively, not spot-checked:** all 4 roles × all 10 devices (each toggled through both assigned-to-them and unassigned states) × all 3 networks (same) — confirmed zero sections open anywhere, by querying every `[id^="dev-acc-body-"]`/`[id^="net-acc-body-"]` element directly rather than trusting the render logic by inspection.
- **Also fixed, found while investigating the observation workflow:** tonight's device accordion rebuild had accidentally dropped the `observation-box-<id>` wrapper div that `submitObservation()` depends on for its "Sent!" button-text confirmation. The actual submission (handoff log entry, dashboard surfacing) still worked — only the visual confirmation silently stopped firing. Restored the wrapper.
- **Confirmed, not changed:** the observation → Owner/Manager dashboard surfacing workflow is intact and was never at risk — verified via jsdom that a fresh observation note still appears on the Owner's dashboard immediately after submission. Whether observations should be independently dismissable (separate from resolving/archiving the device) remains an open discussion, not yet decided either way.

## 2026-07-07 — Farm Hand dashboard: bolder label, darker Fine/Known-issue pills
- "Your devices" label changed from small gray uppercase (11px, `#888`) to bold dark (14px, weight 700, `#111`), matching the "Device Problems" label styling used on Owner/Manager/Technician dashboards.
- "Fine" pill background darkened `#EAF3EC` → `#CFE8D6` (text/border adjusted to `#14381F`/`#8FC49F` for contrast); "Known issue" pill background darkened `#F4F6F8` → `#DCE3EA` (text/border adjusted to `#334155`/`#B9C4CE`). "Use with caution" (amber) deliberately left unchanged — only blue and green were requested.
- Scoped narrowly to `dashboard.js`'s Farm Hand render branch only, per explicit instruction not to touch other code. Two other unrelated `#EAF3EC` usages in the same file (the "all good" message box, the assigned-to tag) were left untouched — confirmed via jsdom that they still render with the original color, not accidentally caught by the same find/replace.
- Mocked and approved before implementation, per Joy's request to see it first.
- **Separately verified (not a code change — this was already true by construction):** accordion sections reset to their default collapsed state after logout + fresh login. Tested directly: manually toggled a section open via `toggleDeviceAcc()`, called `logOut()`, simulated a fresh login, and re-rendered the same device — the section came back collapsed. This works because `showDetail()`/`showNetDetail()` always rebuild accordion state fresh from the open/closed logic on every render; nothing persists it anywhere (no localStorage, no session variable), so there was nothing that could carry a manually-opened state across a logout in the first place.
- Verified via jsdom: 9 checks — the 2 color values present, amber pill unaffected, the two unrelated same-file `#EAF3EC` usages unaffected, and a full 4-role render sweep across dashboard/devices/networks confirming no ripple effects.

## 2026-07-07 — Ripple-check on the device rebuild found and fixed a real bug in networks.js
- Joy asked directly whether tonight's device detail rebuild had been checked for side effects on other files — it hadn't been, beyond the device-specific tests. Doing that check found a real, pre-existing bug that had nothing to do with tonight's device work: **`networks.js`'s Network history section had a nested double-toggle.** `netTimelineHTML(n)` — left over from the *original* network accordion rebuild earlier tonight — still returned its own plain toggle button + collapsed wrapper, which was then nested *inside* the new animated "Network history" accordion section. Practically: opening the accordion revealed a second, plain, unanimated toggle that had to be clicked again just to see the actual timeline.
- Fixed the same way `deviceTimelineHTML` was just refactored: `netTimelineHTML(n)` now returns bare rows only, since `netAccSection()` already provides the wrapping toggle.
- Verified via jsdom: confirmed no leftover `toggleSettingsSection` reference remains in the network detail render, and that the timeline content still displays correctly once the (single, correct) accordion section is opened.
- Also explicitly re-confirmed (not just assumed carried over from earlier in the night): every caller of `showDetail()` app-wide uses the same signature and works unchanged; `deviceTimelineHTML()` has zero external callers outside `devices-detail.js` so its refactor is fully contained; `toggleSettingsSection()` itself is untouched and still correctly used by `accessibility.js`/`settings.js`; no report/PDF generation code references any of the old device-detail section ids that no longer exist.
- **Lesson:** a "did this change break anything else" check needs to happen after every substantial rebuild, not just the screen being directly worked on — this bug existed in already-shipped code from earlier the same night and would not have been caught without asking the question directly.

## 2026-07-07 (past midnight) — Device detail screen: full accordion rebuild, decision-slot consolidated
- The big deferred item from earlier tonight — the device detail page never got the animated accordion treatment `networks.js` did, and its "escalate to Owner" option rendered as the literal last thing on a ~330-line page, 14+ sections below where a Manager would actually look after clicking Take Ownership.
- **Consolidated `deviceDecisionSlotHTML(d)`** — one function replacing 4 previously-independent, scattered banner blocks (returned-to-tech, the 3-case escalation banner, and the standalone escalate box). Returns exactly one thing based on state: nothing / returned-to-you / needs-your-decision / partial-plus-escalated / FYI / read-only-pill / you've-taken-ownership-resolve-or-escalate-further. This is the structural fix, not just a reposition — contradictory or duplicate banners for the same device are no longer possible by construction, the same class of bug as tonight's earlier Manager-dashboard Flagged/Partially-resolved redundancy.
- **Rebuilt the rest of the page as an accordion**, same animated pattern as `networks.js` (`deviceAccSection()`/`toggleDeviceAcc()`/`initDeviceAccordionState()` — kept device-scoped with distinct DOM ids, not shared functions, to avoid any risk of one screen's accordion state affecting the other's): How to fix this → Assignment → Remediation checklist → Device details → Device history → Notice something (Farm Hand/Viewer only).
- **Remediation checklist merges what used to be 3 separately-gated blocks** (the green verify-box, the resolve/escalate toggle box, and the view-only farm-hand-status note) into one section, since they're mutually exclusive by role/state anyway.
- **Device history merges what used to be two separate, near-identical collapsibles** (timeline and handoff log) into one section.
- **Accordion open-by-default logic follows actionability, not a fixed template:** Assignment opens when unassigned and I can assign it; Remediation checklist opens when there's something for me to actually do; Notice-something opens for Farm Hand/Viewer since reporting is their one real action; Device details and Device history stay closed by default (reference material, not action items).
- Mocked and discussed with Joy first (5 states: Manager-needs-decision, same-device-post-Take-Ownership, Owner-unassigned, Farm-Hand, Technician-with-Resolve/Escalate-toggle) before any code was written, per her explicit request to talk through workflow/convenience/logic before implementation.
- **Verified via jsdom, not just code review** — 19 targeted checks: full render sweep across all 4 roles × all 10 devices both before and after every mutation below; Manager's decision slot renders with real Take Ownership/Send Back buttons; clicking Take Ownership actually reassigns, clears escalation, and shows the ownership-taken banner in the *same slot*; from that state, Manager can escalate further via the inline form and it actually sets `needsOwnerAction`; Owner (who has nowhere further to escalate to) correctly does NOT see that inline option; unassigned device correctly assignable via the Assignment accordion; Farm Hand never sees the decision slot even on an escalated device, and can still submit an observation; Technician sees the Resolve/Escalate toggle inside Remediation checklist and `partialResolveAndEscalate()` actually works end to end; the existing "Technician can't resolve unassigned work" rule from earlier tonight survived the rebuild intact.
- **First test pass had 5 failures** — traced immediately rather than assumed as real bugs: the test device (Siemens) isn't actually in `getRiskData()` and falls back to "Other" (support Unknown, cve 1), which doesn't qualify as `hasStructuralIssue()` — wrong test data, not a code bug. Reran against a device that does qualify (Hog Slat: support Limited, cve 3) — all 5 passed.
- **Still open, not resolved by guessing:** whether "How to fix this" (pure guidance, no inputs) and "Remediation checklist" (where the fix actually happens) should be merged into one section — flagged mid-session as confusingly adjacent when both are collapsed and only their titles are visible; kept separate for this build pending an explicit decision.
- New `lang-data.js` keys (EN+ES): `ownershipTakenTitle`, `ownershipTakenDesc`, `escalateToOwnerInsteadBtn`.

_Note: the remainder of this historical entry ("Manager dashboard: Flagged/Partially-resolved redundancy fixed", 2026-07-07 just after midnight) and any entries below it were found cut off — a pre-existing/recurring instance of the file-truncation bug documented elsewhere in this log. Trimmed cleanly rather than left dangling. Everything above this note, including all of tonight's entries, is verified complete.]_
