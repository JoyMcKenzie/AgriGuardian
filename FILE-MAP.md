# AgriGuardian — FILE-MAP.md

**Purpose:** dev-only reference, not shipped with the app. Lets you point at
a screen/feature and know which file(s) to name, and lets Claude jump
straight to the right file instead of cold-reading the project.

**Rule:** any turn that changes a file's purpose or exported functions must
update that file's entry below in the same turn, as part of the normal
validate-and-deliver pipeline. A stale map is worse than no map.

**Rule:** `index.html` must always include the GoatCounter tracking script
right before `</body>`, on every delivered version:
`<script data-goatcounter="https://agriguardian.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`

Load order (bottom-line dependency order) is in `module-load-order.json` —
this doc is about *what things do*, that one is about *what loads first*.

---

## Quick lookup — "I want to change X"

| You want to change... | Go to |
|---|---|
| Login / demo sign-in / invite join | `auth-flow.js`, `auth-ui.js` |
| Session timeout / logout / password reset | `session.js` |
| Dashboard cards / alerts | `dashboard.js` |
| Device list, archive/delete devices | `devices-list.js` |
| Device detail screen, add device, assign/unassign issue | `devices-detail.js` |
| Technician resolve/escalate workflow | `devices-resolve.js` |
| Network list, add/edit/delete network | `networks.js` |
| Network risk logic (non-UI) | `networks-data.js` |
| Apps inventory, backup tracker screen | `apps.js` |
| Who can do what (RBAC) | `permissions.js` |
| Team roster, invite/edit/archive member | `team.js` |
| Roles, permission checkboxes, farm settings | `settings.js` |
| Accessibility toggles | `accessibility.js` |
| Audit log entries | `audit.js` |
| Hygiene score calculation | `hygiene.js` |
| Device/brand risk scoring | `risk.js` |
| CISA/NVD vulnerability lookups | `vulnerabilities.js` |
| PDF report generation (download/email) | `reports.js` |
| In-app report viewer modal | `report-viewers.js` |
| Translations / adding a language string | `lang-data.js` (strings), `set-lang.js` (apply-on-switch logic), `core.js` (`t()` lookup) |
| Invite-language toggle, invite→account language handoff, Settings language control | `team.js` (`inviteMember`), `auth-ui.js` (`validateInviteCode`, `joinFarm`, `_enterApp`), `settings.js` (`renderSettings` sync), `index.html` (`#member-language`, `#account-lang-select`) |
| Screen navigation (`showScreen`) | defined in `devices-detail.js`, called everywhere |
| Navigation slide-out (drawer open/drag/close) | `js/nav-drawer.js` |
| Build timestamp | `core.js` |
| HTML structure / screen containers / forms | `index.html` |
| Visual styling | `styles.css` |
| Canonical colour palette (one shade per role) | `PALETTE.md` |
| Visual style guide (swatches, type, components) | `style-guide.html` |
| PDF library (third-party, do not edit) | `jspdf_min.js` |

---

## File entries

### `core.js` (43 lines)
**Purpose:** Global state variables and the two most-used helpers in the app.
**Key exports:** `currentLang`, `currentDetailView`, `currentUser` (global state), `t(key)` (translation lookup), `formatBuildTimestamp()`, `applyBuildTimestamp()`, `localTimestamp()`.
**Depends on:** `LANG` (from `lang-data.js`).
**Used by:** every file that calls `t()` or reads `currentUser` — effectively all of them.
**Notes:** `BUILD_TIMESTAMP` constant lives here — must be bumped by hand on every edit (see standing workflow rule). Never reintroduce `fetch`/`HEAD` timestamp detection — fails silently under `file://`. **Pending (not yet applied — HTML/CSS-only merge so far):** `currentLang` should initialize from `localStorage.getItem('agriguardian_lang')` (falling back to `'en'`) and persist there on every `setLang()` call, so a chosen language survives a page reload.

### `audit.js` (27 lines)
**Purpose:** Audit log storage and rendering.
**Key exports:** `auditLog` (array), `renderAuditLog()`, `logAction(action, detail)`.
**Depends on:** `currentUser`, `t()`.
**Used by:** any file that performs a loggable action (device/network/app/team changes call `logAction`).

### `permissions.js` (380 lines)
**Purpose:** Single source of truth for role-based access control — what the current user can see/do.
**Key exports:** `canManage()`, `currentPerms()`, `defaultPermsForRole()`, `farmHandNoteKey()`, `canHardDelete()`, `canArchiveDevices()`, `canActOnMember()`, `canResolveIssues()`, `canAssignIssues()`, `canExportReports()`, `hasStructuralIssue()`, `shouldShowPartialResolveBox()`, `canSeeIssue()`, `canSeeDetailedRisk()`, `canSeeNetworkIssue()`, `canSeeHygieneScore()`, `canSeeApps()`, `assignableMembers()`, `canEscalateIssue()`, `escalationTarget()`, `escalationTargetName()`, `canClearEscalation()`, `isEscalationPrimaryActor()`, `submitObservation()`, `dismissObservation()`, `investigateObservation()`, `closeInvestigationNoIssue()`, `closeInvestigationConfirmed()`, `clearOperationalIssue()`, `canReturnNetIssue()`, `canActOnReturnedNet()`.
**Depends on:** `currentUser`, `getRisk()` (`risk.js`).
**Fixed — Manager can now escalate a self-assigned structural issue, not just resolve it directly:** `shouldShowPartialResolveBox()` and `canEscalateIssue()` both hardcoded `if (r === 'Owner' || r === 'Manager') return false` — blocking Manager from ever seeing an Escalate option, for the same reason as Owner (nobody above them). But Manager and Owner aren't actually the same case: Manager has an Owner above them. Removed the Manager half of both exclusions, so Manager now follows the identical assigned-to-self + structural-issue rule Technician already did; Owner alone stays excluded. Also fixed `escalationTarget()`/`escalationTargetName()`, which picked the first active Manager with zero awareness of who was doing the escalating — meaning a Manager escalating would have incorrectly targeted themselves. Both now exclude the current user from consideration, so a lone Manager correctly escalates to Owner, and if a second Manager exists, escalates to them instead. Verified all of this with direct execution: a self-assigning Manager gets the Escalate tab and resolves to Owner as the target; adding a second Manager correctly redirects the target to them instead; Technician and Owner are both unaffected by the change.
**Notes:** Farm Hand/Viewer least-privilege model, corrected: **every** device is visible to them now — hiding a device's existence was never the actual protection; hiding its technical severity is. `farmHandNoteKey()` returns which note applies (generic "known issue" until reviewed, specific once Management sets a status) — but the note is **never color-coded by severity**. A colored badge is itself a cue about how serious something is, and that judgment isn't a view-only role's to make; red and yellow devices both render identically as a neutral gray "Known issue" until reviewed. Applied consistently in `devices-list.js` (badge), `devices-detail.js` (the view-only note box), and `dashboard.js` ("Your devices" list, which now also dropped the separate colored "N problems" count card for the same reason — it's redundant now that every device shows its own neutral note, and the count itself was colored red/green by severity). `submitObservation()` is the one thing view-only roles can still do regardless of current status — genuinely "observe and report," logged to the device's handoff log. `observedDevices()` (`dashboard.js`) is what makes that report actually surface to Owner/Manager instead of only existing if someone happens to open that exact device's page.
**Manager can now escalate too, mirroring Technician:** `shouldShowPartialResolveBox()` and `canEscalateIssue()` used to hard-exclude Manager (`if (r === 'Owner' || r === 'Manager') return false`) alongside Owner — but Manager has the same real gap Technician does: a self-assigned structural issue (e.g. hardware needing a replacement purchase) may need Owner's authority, not just Manager's. Both now only exclude Owner (nobody above the Owner to escalate to); Manager follows the identical assigned-to-self + structural-issue rule Technician already used. `escalationTarget()`/`escalationTargetName()` now exclude the current user from the Manager search, so a Manager escalating doesn't try to target themselves — falls through to Owner (or a different Manager, if a second one exists and is available). `sendBackToTech()` was hardcoded `if (currentUser.role !== 'Manager') return` even though its actual logic was already fully generic — changed to `canClearEscalation()` so Owner can send a Manager's escalation back too, not just take it over. The "Send Back" button/form visibility in the escalation-received banner had the identical hardcoded check and needed the same fix — otherwise Owner, newly reachable as primary actor via this feature, would only ever see "Take Ownership" with no way to hand it back. Verified the complete loop end-to-end: Carlos (Manager) self-assigns and gets both Resolve and Escalate; escalating correctly targets Owner, not himself; Angus becomes primary actor and gets both actions; Carlos revisiting his own escalation is correctly NOT shown as primary actor.
**Fixed (found via direct code review, not a reported bug):** A Manager could previously invite or attempt to invite another Manager — a lateral privilege move `canActOnMember()` already blocked for editing/archiving, but the invite path (`team.js`'s `refreshRoleDropdowns()`/`inviteMember()`) had no equivalent guard. Fixed with both a UI filter (Manager option hidden from the dropdown unless the inviter is Owner) and a function-level check, matching the defense-in-depth pattern used elsewhere in this app.
**Used by:** `devices-detail.js`, `devices-resolve.js`, `devices-list.js`, `apps.js`, `networks.js`, `team.js`, `settings.js`, `dashboard.js`, `auth-ui.js` (`defaultPermsForRole()` is shared by `inviteMember()` and `joinFarm()` so a role gets the same real permissions whether it was assigned by an Owner invite or accepted via the invite-code flow) — this is the RBAC gate; any "who can click this button" question starts here.
**RBAC status (2026-07-07):** archive/delete for devices *and* networks ARE gated (`canArchiveDevices()` / `canHardDelete()` at the button and function level). Add-device is now gated too (audit C2): `add-device-btn` hidden by `renderDeviceList()` and `showAddForm()`/`addDevice()`/`addNetwork()` guarded by `currentPerms().addDevices`. (The old note here claimed archive/delete was ungated — that was stale; audit R1.)

### `risk.js` (66 lines)
**Purpose:** Device risk scoring and messaging based on brand/password/health.
**Key exports:** `getRiskData()`, `getRisk()`, `translateDeviceType()`, `getRiskLabel()`, `getRiskWhy()`, `getRiskAction()`. *(`translateLocation()` removed 2026-07-07 — dead code, audit CL1.)*
**Depends on:** `t()`.
**Used by:** `devices-list.js`, `devices-detail.js`, `dashboard.js`.
**Notes:** Also holds the seed `devices` array. 2 devices (Tractor guidance unit, Office network router) are genuinely green at the brand/data level, so Farm Hand/Viewer see them on a fresh load with zero setup. The other 4 are genuinely unreviewed — no `farmHandStatus` is hardcoded in seed data on purpose, so a demo walkthrough has to actually exercise the real feature (Owner/Manager assigns a device and sets its status through `assignBoxHTML()`) rather than a pre-baked end state. `canFarmHandSeeDevice()` (`permissions.js`) is what a device needs to pass to appear in their list at all.
**Notes:** `getRiskData()` must remain a function (not a static object) so brand-specific notes stay translatable via `t()`.

### `networks-data.js` (145 lines)
**Purpose:** Non-UI risk/status logic for networks, backups, and apps (the data-layer counterpart to `networks.js`/`apps.js`).
**Key exports:** `getNetRisk()`, `getNetRiskLabel()`, `getNetRiskWhy()`, `isBackupVerifyStale()`, `getBackupRisk()`, `getBackupRiskLabel()`, `getBackupRiskWhy()`, `getBackupRecAction()`, `canSeeBackups()`, `isAppReviewStale()`, `getAppRisk()`, `getAppRiskLabel()`, `getAppRiskWhy()`.
**Used by:** `networks.js`, `apps.js`, `dashboard.js`.

### `hygiene.js` (97 lines)
**Purpose:** Computes and (was intended to) render the overall farm hygiene score.
**Key exports:** `computeHygiene()`. *(`renderHygieneScore()` removed 2026-07-07 — it was dead: no `#hygiene-score-card` element exists and nothing called it. `computeHygiene()` stays; it feeds `reports.js`/`report-viewers.js`. Audit CL1.)*

### `dashboard.js` (250 lines)
**Purpose:** Renders the main dashboard screen — summary cards, alerts, nav shortcuts into other screens.
**Key exports:** `renderDashList()`, `alertRow()`, `observedDevices()`.
**Depends on:** `risk.js`, `networks-data.js`, `permissions.js`, `t()`.
**Used by:** entry screen after login (`auth-ui.js` routes here on successful sign-in).
**Notes:** Escalated-devices card recolored to purple (was amber) — escalation now uses one consistent color across the app; "returned to tech" stays its own amber/orange, a distinct concept (Manager sending work back, not escalating). Farm Hand/Viewer: the "Network problems" card is removed entirely (no network access at all now, matching `nav-btn-network` being hidden in `auth-ui.js`) — showing a clickable card that just bounces them back was worse than not showing it. `deviceProblems` count now matches what actually appears in the device list for every role, no separate/inconsistent filtering. Added a "Your devices" list to their dashboard branch — previously they only saw a problem count and an "all good" message, with no way to see their actual visible devices without navigating to the Devices tab.
**Fixed (2026-07-07):** Manager's Observations card used the generic count-card component (`card()`, bare number, links to the general device list) while Owner's used named, specific cards linking straight to `showDetail(d.id)` — real asymmetry, found live by Joy. Manager's now matches Owner's exactly. `observedDevices()` also simplified to check `d.observationPending` directly (a real state flag now, set/cleared by `submitObservation()`/`dismissObservation()`/`investigateObservation()` in `permissions.js`) instead of scanning `handoffLog` for any past observation ever — the old check never actually cleared once a device had been observed once, short of the whole device becoming resolved/archived.

**Redesign stage 1 (2026-07-07):** `tabCard()` no longer tints its background by risk (the old red `#FCEBEB` etc. are gone) — cards are white with a hairline border. It now takes `(label, redCount, yellowCount, navFn)` and renders a split critical/to-review count (red + yellow dots, or a green dot + no-issues when clear). Color-blind mode swaps the dots for triangle/circle shapes in a blue/orange safe palette. Owner-only, so no severity colour reaches Farm Hand/Viewer.
**Dashboard balance (2026-07-07):** Owner branch folds escalated/decision/returned/observation into one calm "Needs your attention" list (two accents: purple actions, blue observations; icon+sublabel per type). Farm Hand branch recoloured to soft green / soft blue / slate (no amber, still colour-safe) on the shared card layout. New lang key `needsAttentionLabel`.
**Extended (2026-07-07):** `observedDevices()` now also surfaces devices in the `observationInvestigating` and `knownOperationalIssue` states, not just freshly-`observationPending` ones — otherwise a device would silently drop off the dashboard the moment someone started investigating it, the same "vanishes into a black hole" problem the original feature was built to prevent, just moved one step later in the lifecycle. Both Owner's and Manager's card rendering also made state-aware (three distinct visual treatments: blue for freshly reported, dashed blue for under investigation with the assignee's name, amber for a confirmed operational issue) instead of always showing the original report text regardless of current state.
**Fixed (2026-07-06, this session — CORRECTING A PRIOR DOC/CODE MISMATCH):** the note directly above (previously in this file) claimed `canFarmHandSeeDevice()` had already been renamed to `farmHandNoteKey()` and the crash fixed — but the actual code in this file, verified by execution (not just reading), showed `redDevices`/`yellowDevices` used only `canSeeIssue(d)` with no severity gate at all. That's not a crash, but it does leak a colored red/yellow count to Farm Hand, contradicting this file's own documented design intent (see the "DEFAULT (Farm Hand, Viewer)" render branch comment: no count card, because it "would color its number by severity"). Fixed directly: both filters now also require `canSeeDetailedRisk()`, which is already `false` for Farm Hand/Viewer — no new function needed. Verified via jsdom: Farm Hand's dashboard renders with zero `badge-red`/`badge-yellow` classes present. **Lesson repeated from earlier today: a confident claim in this file that something was "fixed" must not be trusted without independent execution verification — this file itself is proof that claim and code can drift apart even within a single delivered zip.**

### `devices-list.js` (145 lines)
**Purpose:** Renders the device list screen; list-level actions (filter, archive, unarchive, delete).
**Key exports:** `renderDeviceList()`, `deviceCardHTML()`, `setUserFilter()`, `archiveDevice()`, `unarchiveDevice()`, `deleteDevice()`.
**Depends on:** `risk.js`, `permissions.js`.
**RBAC status (2026-07-07):** archive/delete ARE gated (`canArchiveDevices()`/`canHardDelete()`); add-device now gated too (audit C2). The prior "still open" note was stale (audit R1).
**Notes:** Escalated-only filter notice and the escalated pill badge recolored to purple (were amber), matching the app-wide escalation color unification. Note: the escalated pill and the existing partially-resolved pill can now appear together on the same card looking near-identical (both purple) — distinguishable only by icon/text, not color, since both concepts now share the purple family. Farm Hand/Viewer least-privilege (superseded by the later "show everything, neutral notes" redesign — see `permissions.js`'s `farmHandNoteKey()`): `deviceCardHTML()`'s coarse indicator uses one icon (thumb-up / hand-stop / alert-triangle depending on status) in one consistent color, regardless of the underlying severity — was gray, now a distinct blue (`#1A3A6B`, reused from the existing Owner-FYI banner color rather than introducing a new one) per a "replace gray with a distinct color" request; the icon shape carries the meaning, the color doesn't vary by how serious the issue actually is. Archived/All filter buttons hidden for view-only roles too, same pattern as the team-members filter — device history/inventory management isn't relevant to them.

### `devices-detail.js` (~950 lines — largest UI file)
**Purpose:** Device detail screen: full device view, add-device form, issue assignment, and `showScreen()` — the shared screen-navigation function used app-wide.
**Key exports:** `findDefaultLoginHTML()`, `pwManagerCardHTML()`, `deviceTimelineHTML()`, `handoffLogRowsHTML()`, `deviceDecisionSlotHTML()`, `deviceAccSection()`, `initDeviceAccordionState()`, `toggleDeviceAcc()`, `showDetail()`, `addressIssueBoxHTML()`, `assignBoxHTML()`, `assignIssue()`, `unassignIssue()`, `showScreen()`, `showAddForm()`, `hideAddForm()`, `selectPw()`, `addDevice()`.
**Depends on:** `risk.js`, `permissions.js`, `audit.js`.
**Used by:** effectively every screen-switch in the app calls `showScreen()` from here.
**Rebuilt (2026-07-07):** `showDetail()` was previously a single ~330-line conditional block where 4+ mutually-exclusive banner cases (returned-to-tech, 3-case escalation banner, and a standalone "escalate to Owner" box) were scattered independently, with the escalate box literally the last thing rendered — 14+ sections below where a Manager would actually need it after clicking Take Ownership. Consolidated into `deviceDecisionSlotHTML(d)` — one function, one return value, so contradictory/duplicate banners for the same device are structurally impossible rather than merely avoided by careful conditionals. Rest of the page rebuilt as an animated accordion (`deviceAccSection()`/`toggleDeviceAcc()`, same pattern as `networks.js`'s `netAccSection()` but kept device-scoped with distinct DOM id prefixes to avoid any cross-screen bleed): How to fix this → Assignment → Remediation checklist (verify-box / resolve-escalate toggle / view-only status note, whichever applies — merged into one section since they're mutually exclusive by role/state) → Device details → Device history (merges what used to be two separate near-identical collapsibles — timeline and handoff log — into one). "Notice something?" stays its own section for Farm Hand/Viewer. All sections default collapsed (an earlier version had actionability-based auto-open logic that was removed after Joy caught it live — see `CHANGELOG.md`). Verified via jsdom: 19 targeted checks covering every role, the Take-Ownership → escalate-further transition happening in the same visual slot, Technician's Resolve/Escalate toggle, and a full render sweep across all 10 devices × 4 roles both before and after all state mutations.
**Observation workflow added (2026-07-07):** `deviceDecisionSlotHTML(d)` gained a 4th case — an unaddressed observation now shows a blue banner directly on the device page (Owner/Manager only), regardless of the underlying risk color, fixing a real gap where a device with a reported problem could still show a plain green "Looking good" banner. Two real actions, not a passive checkbox: `dismissObservation()` (optional note, closes it out when there's genuinely nothing to act on) or `investigateObservation()` (opens the existing Assignment section pre-filled with a note referencing the report — routes through the exact same assign/resolve/escalate pipeline every other issue uses, no new status types). `canAssign` was fixed to also apply when `d.observationPending` is true, even on a green-risk device — previously the Assignment section couldn't render at all for a healthy-looking device, which is exactly the scenario this feature exists for. The pending flag only clears when an assignment actually commits (`assignIssue()`), not when the Investigate form merely opens — abandoning the form without assigning correctly leaves the report still pending. A fresh observation always reopens the flag even if a prior one on the same device was dismissed/investigated.
**Known open item, not resolved by guessing:** whether "How to fix this" (pure guidance) and "Remediation checklist" (where the actual fix happens) should be merged into one section — flagged as confusingly adjacent when collapsed, kept separate for this rebuild pending a decision. Also open: the risk model (`getRisk()`) has no way to represent "operationally broken but not a security issue" (e.g. a device that can't reach a third-party service) — the observation banner fixes *visibility* of such a report, not the underlying data-model gap.
**Notes:** Largest single file — if a fix only touches one function, grep for it rather than viewing the whole file.
**Fixed:** (1) An assigned Technician on a structural-issue device used to see *only* the partial-resolve+escalate box (or, briefly, both stacked with the full form buried below Device Details — easy to miss/scroll past). Rebuilt as a single unified box (`setIssueMode()`) with a Resolve/Escalate tab toggle, Resolve selected by default — the assigned person picks, and it can't be scrolled past unnoticed. (2) The message shown to view-only roles (Farm Hand/Viewer) on an open issue was a single fixed string with zero device-specific context — `assignBoxHTML()` now includes a status dropdown (`d.farmHandStatus`: keep-using / use-caution / do-not-use, or a sensible default) that the assigner sets and view-only roles actually see. (3) Found and fixed a pre-existing unclosed-paren bug: `(canSeeIssue(d) ? (...)` (wrapping the recommended-action/assignment-badge section) was never closed — harmless until this turn's restructuring changed what followed it and finally triggered a syntax error. Closed at its correct semantic boundary, right before the assign box (which already has its own independent permission gate). (4) The device timeline (`deviceTimelineHTML()`) was still gated only by `canSeeIssue(d)` — always true for Farm Hand — so it leaked the same kind of history the risk-detail box and handoff log were already correctly hidden for. Now requires `canSeeDetailedRisk()` too, consistent with the rest of the least-privilege model. (5) Device Details and Device Timeline are now genuinely collapsible (collapsed by default), reusing `toggleSettingsSection()` from `accessibility.js` rather than a new helper — this was called "labeled collapsible sections" in earlier session notes and reported done more than once, but was never actually in the code until now. (6) Removed the redundant "Device software updated" resolve-checkbox — it duplicated what the health-status question above it already asks more precisely. (7) **The real content leak, found via systematic cross-check after a "least privilege isn't working" report:** Device Details showed "Manufacturer support," "Known vulnerabilities" (CVE count), "Default password changed," the vulnerability-check button, auto-update status, and firmware date **unconditionally** — completely undermining the risk-detail box hiding done earlier, since the identical information was duplicated here with zero gating. Confirmed by rendering real HTML and checking for the actual leaked strings, not just assuming the earlier fix covered it. Split into two tiers: brand/model/serial/MAC/type stay visible to everyone; everything else now requires `canSeeDetailedRisk()`.
**Notes:** Escalation color unified to purple app-wide (Escalate tab, standalone escalate box, escalated pill, Manager's receiving banner) — was previously split between purple (the escalate action) and amber (the "needs attention" state), now one consistent identity. "Send Back" and "Returned to tech" are a distinct concept and correctly remain amber/orange. The Owner's "FYI" banner (Case C) stays blue — different icon (eye, not flag), different meaning (passive observation vs the escalate action), not part of this unification.
**Fixed (previously mocked up but never actually coded — corrected):** (1) Resolve tab now has the intro paragraph + "Step 1" callout matching the approved mockup, instead of the bare old `.health-box` with no framing. (2) The risk-detail box and action-box (recommended action, partial-fix banner, pw-guidance cards, assignment badge) are now gated behind `canSeeDetailedRisk()`, not just `canSeeIssue(d)` — Farm Hand/Viewer see neither; they rely entirely on the `farmHandStatus` box further down the page. Verified directly: Farm Hand sees nothing from these two sections, Technician/Manager/Owner still see full detail.

### `devices-resolve.js` (238 lines)
**Purpose:** Technician-facing resolve/escalate workflow and device verification.
**Key exports:** `verifyIsStale()`, `verifyBoxHTML()`, `markVerified()`, `saveAll()`, `promptReplacementDevice()`. *(`renderAddScreen()` [no-op] and `saveResolution()` [superseded by `saveAll()`] removed 2026-07-07 — dead code, audit CL1.)*
**Depends on:** `permissions.js` (`canResolveIssues`, `canEscalateIssue`), `devices-detail.js` (`showScreen`).
**Relevant to locked spec:** this is the file for "technician resolve-vs-escalate workflow" and "technician escalation offered on any assigned issue."
**Fixed — two real bugs in `saveAll()`, found from a "resolve sometimes doesn't work" report and confirmed by executing the actual function, not just reading it:** (A) With zero resolve-action checkboxes checked, the code set `d.resolved = false` silently — no warning, the form just reset as if something happened. Now requires at least one action, same as the already-required health-status field; simplified out the old "Device software updated alone doesn't count" special case in the process, since that checkbox itself was removed earlier this session and the distinction it existed for no longer applies. (B) Right before the final re-render, the code was wiping `d.resolveStatus`/`d.healthStatus`/`d.healthNote`/`d.healthDate` back to empty — *after* they'd already been correctly used to set `d.resolved` and write the audit log. That corrupted the permanent record: the resolved-badge would show "Marked resolved:" with nothing after it, and `getRisk()` would recompute using a blanked health status. Removed — the record now correctly persists.

### `networks.js` (~490 lines)
**Purpose:** Network list/detail screens — UI layer for networks.
**Key exports:** `renderNetworkList()`, `netTimelineHTML()`, `getNetRecAction()`, `showNetDetail()`, `checkNetVulnerabilities()`, `archiveNetwork()`, `unarchiveNetwork()`, `deleteNetwork()`, `saveNetwork()`, `selectNetPw()`, `selectNetEnc()`, `handleNetBrandSelect()`, `setNetFilter()`, `toggleNetAddForm()`, `addNetwork()`, `netAccSection()`, `initNetAccordionState()`, `toggleNetAcc()`, `netAssignBoxHTML()`, `assignNetIssue()`, `unassignNetIssue()`, `returnNetIssue()`.
**Depends on:** `networks-data.js`, `permissions.js`, `vulnerabilities.js`.
**Rebuilt (2026-07-06):** The network detail screen was redesigned into an animated accordion (How to fix this / Assignment / Network details / Notes / Network history / Remediation checklist — renamed from "What was done?" for this screen only). Also added: networks previously had **no assignment concept at all** — any role with resolve permission could act on any network regardless of who (if anyone) was assigned. Added `assignedTo`/`assignedBy` fields and a full assign/reassign/return-to-assigner workflow, mirroring (but simpler than) the device escalation system since networks have no brand/CVE data to gate a structural-issue check on. Return-to-assigner is purple-styled per an explicit decision to treat it as escalation-equivalent. Verified via jsdom execution testing across all 4 roles and a full assign→return→banner→resolve cycle.
**Relevant to locked spec:** "farm hand least-privilege access (Network tab hidden)" — already implemented: `nav-btn-network` hidden in `_enterApp()` (`auth-ui.js`), plus a defense-in-depth guard in `showScreen()` (`devices-detail.js`) that bounces any direct `network` navigation back to dashboard for roles that can't see it.
**Fixed:** Network details and Network history are now collapsible (collapsed by default), matching the same fix in `devices-detail.js` — reuses the same `toggleSettingsSection()` helper, same reasoning: reference info shouldn't be open by default, only what's actionable should be. **Also fixed as defense-in-depth:** "Default password changed," "Encrypted," and the vulnerability-check button were unconditional, same leak class as the device-side one — confirmed currently unreachable by Farm Hand (no path bypasses the Network-tab guard), but the device-side leak proved "the outer gate should be enough" is exactly the assumption that fails. Gated behind `canSeeDetailedRisk()` now too.

### `apps.js` (~470 lines)
**Purpose:** Apps inventory screen AND the 3-2-1 backup tracker screen (both live in this one file).
**Key exports:** `setAppFilter()`, `renderBackupScreen()`, `saveBackup()`, `renderAppsList()`, `getAppRecAction()`, `showAppDetail()`, `appAccSection()`, `initAppAccordionState()`, `toggleAppAcc()`, `selectAppReviewed()`, `selectAppMfa()`, `selectAppPwManager()`, `saveAppReview()`, `populateAppPicker()`, `toggleAppAddForm()`, `handleAppPickerSelect()`, `addApp()`, `selectAppPwManagerNew()`, `archiveApp()`, `restoreApp()`, `deleteApp()`.
**Depends on:** `networks-data.js` (app risk logic), `permissions.js`.
**Notes:** prior audit flagged the Apps inventory and 3-2-1 Backup tabs as possibly-lost work — this file is where both currently live, worth double-checking against `index.html` screen IDs `screen-apps` / `screen-backups` if either seems incomplete.
**Rebuilt (2026-07-07):** `showAppDetail()` converted from a flat page (plain risk banner, non-collapsible "App details," a review form always fully visible) into the same animated accordion pattern as devices/networks — How to fix this → App details → Notes → Update review status, all collapsed by default, no exceptions (matches the standing rule established earlier the same night after Joy caught actionability-based auto-open logic causing multiple sections to expand simultaneously on devices/networks — never introduced here in the first place). Simpler than the device/network rebuilds since Apps is Owner-only — no role branching, no escalation banners, no decision-slot equivalent needed. `saveAppReview()` unaffected — all form element ids preserved exactly, it already navigates back to the list on save rather than re-rendering the detail accordion. Verified via jsdom: 9 checks including Owner-only access unchanged, a manual toggle actually opening/closing, the full save flow still working end to end, and confirmation that state resets to collapsed on every fresh render even after a section was previously opened. `showAppDetail()` has no external callers — confirmed contained entirely within this file (only called from `renderAppsList()`'s card click handler).

### `vulnerabilities.js` (140 lines)
**Purpose:** CISA/NVD vulnerability lookups for devices (conceptual/demo data source, not live network calls).
**Key exports:** `getRiskBadgeLabel()`, `checkVulnerabilities()`, `checkCISA()`, `checkNVD()`, `renderVulnResults()`, `setDeviceFilter()`. *(`saveNvdKey()` removed 2026-07-07 — dead code; `nvdApiKey` var retained. Audit CL1.)*
**Used by:** `networks.js` (`checkNetVulnerabilities`), `devices-detail.js`.

### `team.js` (197 lines)
**Purpose:** Team roster screen — invite, edit, archive/restore members; custom brand/type/role handling.
**Key exports:** `handleLocationSelect()`, `handleBrandSelect()`, `handleTypeSelect()`, `resolveCustomBrand()`, `resolveCustomType()`, `refreshRoleDropdowns()`, `inviteMember()`, `saveMemberEdits()`, `archiveMember()`, `restoreMember()`, `updateFarmTimezone()`, `updateTimeout()`.
**Depends on:** `permissions.js`, `settings.js` (role list), `defaultPermsForRole()` (`permissions.js`).
**Fixed (was a known issue):** `inviteMember()` used to create a duplicate/disconnected record when the invited person later completed "I have an invite" — `joinFarm()` (`auth-ui.js`) now updates the pending `'Invited'` record in place by phone number instead of pushing a second one. The demo invite placeholder (`demoInviteProfile`, `auth-ui.js`) is "Casey Aitch," distinct from every real team member, specifically to avoid recreating this collision.
**Relevant to locked spec:** "team member section cleanup" and "phone numbers visible to all employees" land here.
**Pending (not yet applied — HTML/CSS-only merge so far):** a new `#member-language` toggle exists in `index.html`'s invite form, defaulted to the inviter's current language and reset after each send; `inviteMember()` needs to read it and stamp the chosen language onto the new `teamMembers` row and `demoInviteProfile`.

### `settings.js` (273 lines)
**Purpose:** Settings screen — owner email, per-role permission matrix, member detail view, custom role creation.
**Key exports:** `saveOwnerEmail()`, `renderSettings()`, `showMemberDetail()`, `permCheckbox()`, `permSummary()`, `togglePermission()`, `handleRoleSelect()`, `normalizeRole()`, `getAllRoleNames()`, `addCustomRoleIfNew()`, `normalizeName()`.
**Depends on:** `permissions.js`.
**Relevant to locked spec:** "Manager-to-Owner escalation toggles (Manager default on, Technician default off)" — the default values and the checkbox UI both live here.
**Fixed:** `togglePermission()` enforced its two access guards (`canActOnMember()`, the self-escalation cap) correctly, but never actually recorded a permission change anywhere — no audit trail of who granted or revoked what, for whom. Least privilege is prevention *and* accountability; only having the first half was a real gap. Now logs every change via `logAction()`, and grants (not revokes — narrowing access is always the safe direction) require an explicit confirm() before taking effect. **Found in a later cross-check:** canceling that confirmation left the checkbox visually stuck in its new (clicked) state without updating the underlying data, since a checkbox's `.checked` flips natively before `onchange` even fires — the cancel path now re-renders from the real data, matching the pattern the other two guards in this function already used.
**Pending (not yet applied — HTML/CSS-only merge so far):** a new Settings → Language section (`#account-lang-select` in `index.html`) needs `renderSettings()` to keep it synced with `currentLang`, mirroring the (now-hidden) post-login header `#lang-dropdown`.

### `accessibility.js` (~165 lines)
**Purpose:** Accessibility settings (text size, contrast, etc.), the collapsible-section toggle helper, and per-user default preferences (accessibility + language).
**Key exports:** `toggleSettingsSection()`, `goToAccessibility()`, `toggleA11y()`, `applyA11yUI()`, `loadMyPreferences()`, `saveMyPreferences()`. *(`scrollToSection()` removed 2026-07-07 — dead code, audit CL1.)* **Key data:** `userPreferences` (accessibility + language, keyed by phone number, covers all five demo people including Owner).
**Used by:** `auth-ui.js` (`_enterApp()` calls `loadMyPreferences()` on every sign-in), `session.js` (`logOut()` resets to universal default).
**Relevant to locked spec:** `toggleSettingsSection()` is the likely shared helper for "labeled collapsible sections across all screens" — check here before writing a new toggle function. Per-person accessibility/language preferences were previously a single global (`a11ySettings`/`currentLang` had no concept of "whose") — now loaded/reset on sign-in/sign-out, saved explicitly via a "Save as my default" button rather than a prompt-per-change.

### `auth-flow.js` (~50 lines)
**Purpose:** Sign-in verification-code send logic (registration flow removed — Farm accounts are provisioned externally before the app is ever opened; Owner only ever signs in). Also holds the single source of truth for demo account credentials.
**Key exports:** `sendCode()`, `resolveDemoAccount()`, `normalizePhone()`. **Key data:** `DEMO_CREDENTIALS` (phone → password map, one distinct password per demo account — deliberately not reused, since password reuse is exactly what this app teaches against), `pendingLogin` (staged sign-in result — see the critical fix below).
**Used by:** `auth-ui.js` (`signInAsDemoMember()` shares `resolveDemoAccount()` so the one-tap buttons and manual phone+password sign-in can never drift out of sync with each other).
**Fixed — a genuinely serious bug:** `sendCode()` used to write directly to `currentUser`, and `verifyCode()` (`session.js`) only ever checked the 6-digit code — it never confirmed a fresh, successful `sendCode()` had actually run. If the code screen was ever reached without that, verification would silently succeed using **whatever `currentUser` already contained** — i.e., whoever was signed in before. Reported symptom: signing out and back in as a different role would sometimes show the previous session's role instead. Fixed by staging the resolved account in `pendingLogin`, touched only by `sendCode()`; `verifyCode()` now requires it to exist and consumes it exactly once — if it's missing, verification is rejected outright and bounces back to sign-in, rather than falling back to old data. Verified directly: simulated reaching the verify step with no `pendingLogin` present, confirmed it's rejected rather than silently reusing the prior session.

### `auth-ui.js` (~185 lines)
**Purpose:** Sign-in screen flow — step navigation, invite code validation, demo persona sign-in. No account-creation UI (removed — see `auth-flow.js` note).
**Key exports:** `togglePwVisibility()`, `copyDemoPassword()`, `showStep()`, `validateInviteCode()`, `joinFarm()`, `signInAsDemoMember()`, `_enterApp()`. *(`saveHealth()` removed 2026-07-07 — dead code, audit CL1.)*
**Depends on:** `auth-flow.js` (`resolveDemoAccount()`), `session.js`.
**Notes:** `signInAsDemoMember()` pre-fills the real sign-in form with a demo account's credentials — it no longer bypasses MFA directly; the person still sends the code and verifies through the normal `sendCode()`/`verifyCode()` path. `joinFarm()` updates an existing pending ('Invited') `teamMembers` record in place if one exists (created by `inviteMember()` in `team.js`), rather than pushing a duplicate entry.
**Pending (not yet applied — HTML/CSS-only merge so far):** `validateInviteCode()` needs to capture the invite's language into `pendingInviteLanguage`; `joinFarm()` needs to stamp it onto the new account and team-member row; `_enterApp()` needs to seed `currentLang` from `currentUser.language` before syncing dropdowns and calling `setLang()`.

### `session.js` (140 lines)
**Purpose:** Session timeout, logout, password reset flow.
**Key exports:** `startSessionTimeout()`, `resetTimeout()`, `logOut()`, `sendResetCode()`, `confirmReset()`, `verifyCode()`.
**Depends on:** `auth-flow.js` (`normalizePhone()`, `DEMO_CREDENTIALS`, `pendingLogin`) — `confirmReset()` actually updates the matched account's demo password now, rather than just claiming success. `verifyCode()` now requires and consumes `pendingLogin` rather than trusting `currentUser` directly — see the critical fix noted in `auth-flow.js`. `logOut()` clears `pendingLogin` too, for complete hygiene.
**Relevant to locked spec:** "session hygiene" principle demo lives here.

### `report-viewers.js` (95 lines)
**Purpose:** In-app modal viewer for reports (as opposed to PDF download — see `reports.js`).
**Key exports:** `_openReportViewer()`, `closeReportViewer()`, `viewHygieneReport()`, `viewActivityReport()`.
**On the horizon:** new report types (project scope, assessments — technical/non-technical) will need matching `view*Report()` functions here.

### `reports.js` (252 lines)
**Purpose:** PDF generation and email/download actions for reports.
**Key exports:** `downloadHygieneReport()`, `emailHygieneReport()`, `emailActivityReport()`, `reportFileStamp()`, `pdfNew()`, `downloadActivityReport()`.
**Depends on:** `jspdf_min.js` (third-party PDF library — do not edit).
**On the horizon:** new report types (project scope, assessments) will need matching `download*Report()`/`email*Report()` pairs here, following the existing Hygiene/Activity pattern.

### `lang-data.js` (1,290 lines — largest file overall)
**Purpose:** All translation strings (EN/ES) as the `LANG` object.
**Key exports:** `LANG`.
**Known issues (from prior audit):** duplicate keys (must dedupe keeping last occurrence after any addition), ~110 orphaned EN keys, some hardcoded English strings elsewhere in the app that bypass this file entirely.
**Notes:** because this file is huge, when adding/editing a handful of keys, grep for the key name and edit around it rather than viewing the whole file.

### `set-lang.js` (479 lines)
**Purpose:** Applies a language switch at runtime — re-renders visible text, including cloned form elements.
**Key exports:** `setLang()`.
**Depends on:** `lang-data.js` (`LANG`), `core.js` (`currentLang`).
**Notes:** cloned forms (via `innerHTML`) don't auto-inherit `setLang()` updates to hidden originals — translations must be reapplied to cloned elements via `querySelector` on the container immediately after cloning, not `getElementById`.

### `jspdf_min.js` (400 lines, minified, third-party)
**Purpose:** Third-party PDF generation library. Do not edit directly.
**Used by:** `reports.js`.

### `index.html` (1003 lines)
**Purpose:** All screen markup/containers (`screen-dashboard`, `screen-devices`, `screen-detail`, `screen-add`, `screen-network`, `screen-net-detail`, `screen-apps`, `screen-app-detail`, `screen-backups`, `screen-settings`), plus static forms that get cloned by JS. `<head>` also carries favicon links and Open Graph/Twitter meta tags for link-preview sharing (2026-07-08).
**Notes:** known prior defects — duplicate element IDs, malformed div nesting in the Settings section (a stray extra `</div>` right after `#main-app` closes — confirmed still present 2026-07-08, left alone across recent edits, verify with a div-balance script before assuming it's fixed). Verify structure with a linter/grep before assuming a given `id` is unique. `og:url`/`og:image` are hardcoded to `https://joymckenzie.github.io/AgriGuardian/` — update both if the Pages URL ever changes. **2026-07-09 merge:** added `#member-language` (invite form, Team section) and a new Settings → Language section (`#account-lang-select`); the post-login header `#lang-dropdown` is now hidden (`display:none`, element kept in the DOM for existing code) since `#account-lang-select` is its replacement for signed-in users. HTML/CSS only — see `core.js`/`team.js`/`auth-ui.js`/`settings.js` "Pending" notes for the JS half. **2026-07-08 23:36 ET, device frame:** `#main-app`/`#login-wrapper` are now both nested inside a new `#device-shell` wrapper (persists across logged-out/logged-in state) with `.device-notch`/`.device-home-indicator` decorative children — see `styles.css` entry below. `#header-signout-btn` is `position:absolute` anchored to `.app`, top-right corner, so it stays inside the device frame regardless of scroll.
**Redesign stage 2 (2026-07-07):** the nav is no longer a top bar — the `.nav` list is wrapped in `#nav-panel` (right-side slide-out) with `#nav-handle` and `#nav-scrim`, controlled by `js/nav-drawer.js`. The six `.nav-btn` buttons themselves are unchanged (class/order/ids/onclick), so every `showScreen`/index-based reference still resolves. **Stage 2b:** the `#report-buttons` block (Hygiene Report / Activity Log actions) now lives inside the drawer under the tabs, not on the dashboard screen — same ids, so `dashboard.js` gating is unchanged.

### `nav-drawer.js`
**Purpose:** Controller for the right-side navigation slide-out (redesign stage 2). Wires the peek handle's tap/drag to open/close the `#nav-panel`, the scrim to close, and close-on-select via event delegation on `.nav`. Pure `addEventListener` (no inline handlers, no new globals) so it needs no `validate-split` handler wiring.
**Key exports:** none (IIFE).
**Depends on:** DOM ids `nav-panel` / `nav-handle` / `nav-handle-icon` / `nav-scrim` in `index.html`; the `.nav-btn` buttons it closes on. Does not touch `showScreen` — navigation itself is still those buttons' own `onclick`.
**Notes:** load order is last; it only reads the DOM after `DOMContentLoaded`, so position is not critical.

### `styles.css` (125 lines)
**Icon audit batch 1 (2026-07-07):** added `.sr-only` (visually-hidden but screen-reader-readable) and compact icon styling for `.device-action-btn`; drawer nav tabs gained leading icons; device/network/app card actions are icon-only with `.sr-only` labels + `title` tooltips.
**Purpose:** All visual styling — brand colors (forest green `#1F4D2E`, risk red/yellow/green variants, off-white `#f5f5f0`), layout, component styles. **2026-07-09, high-contrast device-row pass (updated same day):** `.app` background (within the app frame, not the outer page canvas) is now muted sage `#C6D0C8` (briefly `#D1D5DB`, originally sage `#E7F0E7`). Every shared card-style class — `.device-card`, `.stat`, `.action-box`, `.resolve-box`, `.health-box`, `.alert-row-red`/`.alert-row-yellow` — background changed off-white/`#f7f7f5` → pure white `#FFFFFF`; their text (`.device-name`, `.device-brand`, `.stat-label`, `.action-label`, `.action-text`, `.detail-key`, `.detail-val`, `.device-name-large`, `.device-sub`, `.resolve-title`, `.health-title`, alert-row text) → `#111111`. `.device-card` also got a new 6px `border-left:#1F4D2E` brand-green accent bar. Two inline `.resolve-box` instances (`devices-resolve.js`, `networks.js`) and one inline `.risk-detail` restricted-access notice (`networks.js`) had hardcoded `background:#F3F8F2`/muted text overriding the shared class — fixed those too. `.nav-btn` inactive color `#888` → `#374151` (active tab stays brand green, unchanged). `.action-label`/`.section-title` and 10 inline Settings/report-card headers switched `text-transform` from `uppercase` to `capitalize`. **2026-07-09, full sweep completed:** every remaining inline `background:#F3F8F2` panel across the whole app — `dashboard.js`, `apps.js`, `settings.js`, `networks.js`, `devices-list.js`, `devices-detail.js`, `report-viewers.js`, `vulnerabilities.js`, plus the login/welcome screen (`.login-scroll`, demo-box, persona picker + 5 persona buttons, demo-hint box) — is now `#FFFFFF`, with paired primary text switched to `#111111`. `.login-scroll` background specifically changed `#F3F8F2` → `#C6D0C8` to match `.app`'s canvas ("welcome page all the way in"). Login-screen code/password chips use a neutral `#EEEEEE`, not green. `.nav-btn:hover` background changed `#F3F8F2` → `#F1F2F1` (neutral gray, no green tint). See `PALETTE.md` for full canonical values and what was deliberately left alone (semantic success/status tints). **2026-07-09 merge:** `.login-btn.secondary` changed to a white background with a 2px forest-green border (was a light-green `#E2EFE8` background with a 1px border), for stronger contrast against the dark green header. **2026-07-08 23:36 ET, device frame:** page `body` background changed to `#EEEEEA` (the canonical canvas value in `PALETTE.md`, restoring it after prior drift to `#ffffff`). Added `.device-shell` (charcoal bezel wrapper, brand-independent color, no `overflow:hidden` so its own padding band can hold the chrome), `.device-notch`, `.device-home-indicator`. `.app`'s own `overflow:hidden`/`border-radius:16px` are unchanged — it's the inner "screen," nested inside the new outer shell.
**Redesign stage 1 (2026-07-07):** the post-login app surface (`.app`) is tinted light sage `#EAF3EA` (was `#fff`) with a softer `#cfe0cf` border, so the whitespace reads as one theme with the green header; cards stay white. Body page bg (`#f5f5f0`) and the login screen are unchanged.

### `module-load-order.json`
**Purpose:** Defines the script tag load order in `index.html`. Not a functional/purpose map — see this file only when load-order/dependency-timing bugs are suspected.

### `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (2026-07-08)
**Purpose:** Browser tab icon and mobile home-screen icon. Generated from the white LGD logo artwork already embedded (as base64) in `index.html`, cropped to its content bounds and placed on a forest green (`#1F4D2E`) square so it reads clearly at small sizes.
**Notes:** static binary assets, not edited directly — regenerate from the logo source if the logo art ever changes.

### `og-image.png` (1200x630, 2026-07-08)
**Purpose:** Link-preview image shown when the live demo URL is shared on LinkedIn, Slack, iMessage, etc. Forest green background, white LGD logo, "AgriGuardian" wordmark, and tagline.
**Notes:** static asset, not edited directly — regenerate if wordmark, tagline, or brand color ever change. Referenced by absolute URL in `index.html`'s `og:image`/`twitter:image` tags.

---

## Locked-in redesign spec → file mapping (for quick reference)

| Spec item | Primary file(s) |
|---|---|
| Team member section cleanup | `team.js` |
| Labeled collapsible sections (all screens) | `accessibility.js` (`toggleSettingsSection`), applied per-screen in `settings.js`, `team.js`, `devices-detail.js` |
| Device detail streamlining | `devices-detail.js` |
| Technician resolve-vs-escalate workflow | `devices-resolve.js`, gated by `permissions.js` |
| Manager→Owner escalation toggles (defaults) | `settings.js` (permission matrix), `permissions.js` (`canEscalateIssue`, `escalationTarget`) |
| Farm hand least-privilege (Network tab hidden) | `networks.js` entry point, gated by `permissions.js` |
| Phone numbers visible to all employees | `team.js`, `settings.js` (`showMemberDetail`) |
| Required assignment notes with quick presets | `devices-detail.js` (`assignIssue`, `assignBoxHTML`) |
| Technician escalation on any assigned issue | `devices-resolve.js`, `permissions.js` (`canEscalateIssue`) |
