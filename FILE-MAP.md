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
| Screen navigation (`showScreen`) | defined in `devices-detail.js`, called everywhere |
| Build timestamp | `core.js` |
| HTML structure / screen containers / forms | `index.html` |
| Visual styling | `styles.css` |
| PDF library (third-party, do not edit) | `jspdf_min.js` |

---

## File entries

### `core.js` (43 lines)
**Purpose:** Global state variables and the two most-used helpers in the app.
**Key exports:** `currentLang`, `currentDetailView`, `currentUser` (global state), `t(key)` (translation lookup), `formatBuildTimestamp()`, `applyBuildTimestamp()`, `localTimestamp()`.
**Depends on:** `LANG` (from `lang-data.js`).
**Used by:** every file that calls `t()` or reads `currentUser` — effectively all of them.
**Notes:** `BUILD_TIMESTAMP` constant lives here — must be bumped by hand on every edit (see standing workflow rule). Never reintroduce `fetch`/`HEAD` timestamp detection — fails silently under `file://`.

### `audit.js` (27 lines)
**Purpose:** Audit log storage and rendering.
**Key exports:** `auditLog` (array), `renderAuditLog()`, `logAction(action, detail)`.
**Depends on:** `currentUser`, `t()`.
**Used by:** any file that performs a loggable action (device/network/app/team changes call `logAction`).

### `permissions.js` (380 lines)
**Purpose:** Single source of truth for role-based access control — what the current user can see/do.
**Key exports:** `canManage()`, `currentPerms()`, `defaultPermsForRole()`, `farmHandNoteKey()`, `canHardDelete()`, `canArchiveDevices()`, `canActOnMember()`, `canResolveIssues()`, `canAssignIssues()`, `canExportReports()`, `hasStructuralIssue()`, `shouldShowPartialResolveBox()`, `canSeeIssue()`, `canSeeDetailedRisk()`, `canSeeNetworkIssue()`, `canSeeHygieneScore()`, `canSeeApps()`, `assignableMembers()`, `canEscalateIssue()`, `escalationTarget()`, `escalationTargetName()`, `canClearEscalation()`, `isEscalationPrimaryActor()`, `submitObservation()`, `canReturnNetIssue()`, `canActOnReturnedNet()`.
**Depends on:** `currentUser`, `getRisk()` (`risk.js`).
**Fixed — Manager can now escalate a self-assigned structural issue, not just resolve it directly:** `shouldShowPartialResolveBox()` and `canEscalateIssue()` both hardcoded `if (r === 'Owner' || r === 'Manager') return false` — blocking Manager from ever seeing an Escalate option, for the same reason as Owner (nobody above them). But Manager and Owner aren't actually the same case: Manager has an Owner above them. Removed the Manager half of both exclusions, so Manager now follows the identical assigned-to-self + structural-issue rule Technician already did; Owner alone stays excluded. Also fixed `escalationTarget()`/`escalationTargetName()`, which picked the first active Manager with zero awareness of who was doing the escalating — meaning a Manager escalating would have incorrectly targeted themselves. Both now exclude the current user from consideration, so a lone Manager correctly escalates to Owner, and if a second Manager exists, escalates to them instead. Verified all of this with direct execution: a self-assigning Manager gets the Escalate tab and resolves to Owner as the target; adding a second Manager correctly redirects the target to them instead; Technician and Owner are both unaffected by the change.
**Notes:** Farm Hand/Viewer least-privilege model, corrected: **every** device is visible to them now — hiding a device's existence was never the actual protection; hiding its technical severity is. `farmHandNoteKey()` returns which note applies (generic "known issue" until reviewed, specific once Management sets a status) — but the note is **never color-coded by severity**. A colored badge is itself a cue about how serious something is, and that judgment isn't a view-only role's to make; red and yellow devices both render identically as a neutral gray "Known issue" until reviewed. Applied consistently in `devices-list.js` (badge), `devices-detail.js` (the view-only note box), and `dashboard.js` ("Your devices" list, which now also dropped the separate colored "N problems" count card for the same reason — it's redundant now that every device shows its own neutral note, and the count itself was colored red/green by severity). `submitObservation()` is the one thing view-only roles can still do regardless of current status — genuinely "observe and report," logged to the device's handoff log. `observedDevices()` (`dashboard.js`) is what makes that report actually surface to Owner/Manager instead of only existing if someone happens to open that exact device's page.
**Manager can now escalate too, mirroring Technician:** `shouldShowPartialResolveBox()` and `canEscalateIssue()` used to hard-exclude Manager (`if (r === 'Owner' || r === 'Manager') return false`) alongside Owner — but Manager has the same real gap Technician does: a self-assigned structural issue (e.g. hardware needing a replacement purchase) may need Owner's authority, not just Manager's. Both now only exclude Owner (nobody above the Owner to escalate to); Manager follows the identical assigned-to-self + structural-issue rule Technician already used. `escalationTarget()`/`escalationTargetName()` now exclude the current user from the Manager search, so a Manager escalating doesn't try to target themselves — falls through to Owner (or a different Manager, if a second one exists and is available). `sendBackToTech()` was hardcoded `if (currentUser.role !== 'Manager') return` even though its actual logic was already fully generic — changed to `canClearEscalation()` so Owner can send a Manager's escalation back too, not just take it over. The "Send Back" button/form visibility in the escalation-received banner had the identical hardcoded check and needed the same fix — otherwise Owner, newly reachable as primary actor via this feature, would only ever see "Take Ownership" with no way to hand it back. Verified the complete loop end-to-end: Carlos (Manager) self-assigns and gets both Resolve and Escalate; escalating correctly targets Owner, not himself; Angus becomes primary actor and gets both actions; Carlos revisiting his own escalation is correctly NOT shown as primary actor.
**Fixed (found via direct code review, not a reported bug):** A Manager could previously invite or attempt to invite another Manager — a lateral privilege move `canActOnMember()` already blocked for editing/archiving, but the invite path (`team.js`'s `refreshRoleDropdowns()`/`inviteMember()`) had no equivalent guard. Fixed with both a UI filter (Manager option hidden from the dropdown unless the inviter is Owner) and a function-level check, matching the defense-in-depth pattern used elsewhere in this app.
**Used by:** `devices-detail.js`, `devices-resolve.js`, `devices-list.js`, `apps.js`, `networks.js`, `team.js`, `settings.js`, `dashboard.js`, `auth-ui.js` (`defaultPermsForRole()` is shared by `inviteMember()` and `joinFarm()` so a role gets the same real permissions whether it was assigned by an Owner invite or accepted via the invite-code flow) — this is the RBAC gate; any "who can click this button" question starts here.
**Known issue (from prior audit):** archive/delete/add-device actions in `devices-list.js`/`devices-detail.js` are not yet gated through this file — RBAC enforcement gap.

### `risk.js` (66 lines)
**Purpose:** Device risk scoring and messaging based on brand/password/health.
**Key exports:** `getRiskData()`, `getRisk()`, `translateLocation()`, `translateDeviceType()`, `getRiskLabel()`, `getRiskWhy()`, `getRiskAction()`.
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
**Key exports:** `computeHygiene()`, `renderHygieneScore()`.
**Known issue (from prior audit):** `renderHygieneScore()` is disconnected/dead code — not currently wired into any screen. Check before assuming the hygiene score UI works end-to-end.

### `dashboard.js` (250 lines)
**Purpose:** Renders the main dashboard screen — summary cards, alerts, nav shortcuts into other screens.
**Key exports:** `renderDashList()`, `alertRow()`.
**Depends on:** `risk.js`, `networks-data.js`, `permissions.js`, `t()`.
**Used by:** entry screen after login (`auth-ui.js` routes here on successful sign-in).
**Notes:** Escalated-devices card recolored to purple (was amber) — escalation now uses one consistent color across the app; "returned to tech" stays its own amber/orange, a distinct concept (Manager sending work back, not escalating). Farm Hand/Viewer: the "Network problems" card is removed entirely (no network access at all now, matching `nav-btn-network` being hidden in `auth-ui.js`) — showing a clickable card that just bounces them back was worse than not showing it. `deviceProblems` count now matches what actually appears in the device list for every role, no separate/inconsistent filtering. Added a "Your devices" list to their dashboard branch — previously they only saw a problem count and an "all good" message, with no way to see their actual visible devices without navigating to the Devices tab.
**Fixed (2026-07-06, this session — CORRECTING A PRIOR DOC/CODE MISMATCH):** the note directly above (previously in this file) claimed `canFarmHandSeeDevice()` had already been renamed to `farmHandNoteKey()` and the crash fixed — but the actual code in this file, verified by execution (not just reading), showed `redDevices`/`yellowDevices` used only `canSeeIssue(d)` with no severity gate at all. That's not a crash, but it does leak a colored red/yellow count to Farm Hand, contradicting this file's own documented design intent (see the "DEFAULT (Farm Hand, Viewer)" render branch comment: no count card, because it "would color its number by severity"). Fixed directly: both filters now also require `canSeeDetailedRisk()`, which is already `false` for Farm Hand/Viewer — no new function needed. Verified via jsdom: Farm Hand's dashboard renders with zero `badge-red`/`badge-yellow` classes present. **Lesson repeated from earlier today: a confident claim in this file that something was "fixed" must not be trusted without independent execution verification — this file itself is proof that claim and code can drift apart even within a single delivered zip.**

### `devices-list.js` (145 lines)
**Purpose:** Renders the device list screen; list-level actions (filter, archive, unarchive, delete).
**Key exports:** `renderDeviceList()`, `deviceCardHTML()`, `setUserFilter()`, `archiveDevice()`, `unarchiveDevice()`, `deleteDevice()`.
**Depends on:** `risk.js`, `permissions.js`.
**Known issue:** archive/delete not yet RBAC-gated (see `permissions.js` note) — confirmed still open, not fixed by this session's other changes.
**Notes:** Escalated-only filter notice and the escalated pill badge recolored to purple (were amber), matching the app-wide escalation color unification. Note: the escalated pill and the existing partially-resolved pill can now appear together on the same card looking near-identical (both purple) — distinguishable only by icon/text, not color, since both concepts now share the purple family. Farm Hand/Viewer least-privilege (superseded by the later "show everything, neutral notes" redesign — see `permissions.js`'s `farmHandNoteKey()`): `deviceCardHTML()`'s coarse indicator uses one icon (thumb-up / hand-stop / alert-triangle depending on status) in one consistent color, regardless of the underlying severity — was gray, now a distinct blue (`#1A3A6B`, reused from the existing Owner-FYI banner color rather than introducing a new one) per a "replace gray with a distinct color" request; the icon shape carries the meaning, the color doesn't vary by how serious the issue actually is. Archived/All filter buttons hidden for view-only roles too, same pattern as the team-members filter — device history/inventory management isn't relevant to them.

### `devices-detail.js` (~715 lines — largest UI file)
**Purpose:** Device detail screen: full device view, add-device form, issue assignment, and `showScreen()` — the shared screen-navigation function used app-wide.
**Key exports:** `findDefaultLoginHTML()`, `pwManagerCardHTML()`, `deviceTimelineHTML()`, `showDetail()`, `assignBoxHTML()`, `assignIssue()`, `unassignIssue()`, `showScreen()`, `showAddForm()`, `hideAddForm()`, `selectPw()`, `addDevice()`.
**Depends on:** `risk.js`, `permissions.js`, `audit.js`.
**Used by:** effectively every screen-switch in the app calls `showScreen()` from here.
**Notes:** Largest single file — if a fix only touches one function, grep for it rather than viewing the whole file.
**Fixed:** (1) An assigned Technician on a structural-issue device used to see *only* the partial-resolve+escalate box (or, briefly, both stacked with the full form buried below Device Details — easy to miss/scroll past). Rebuilt as a single unified box (`setIssueMode()`) with a Resolve/Escalate tab toggle, Resolve selected by default — the assigned person picks, and it can't be scrolled past unnoticed. (2) The message shown to view-only roles (Farm Hand/Viewer) on an open issue was a single fixed string with zero device-specific context — `assignBoxHTML()` now includes a status dropdown (`d.farmHandStatus`: keep-using / use-caution / do-not-use, or a sensible default) that the assigner sets and view-only roles actually see. (3) Found and fixed a pre-existing unclosed-paren bug: `(canSeeIssue(d) ? (...)` (wrapping the recommended-action/assignment-badge section) was never closed — harmless until this turn's restructuring changed what followed it and finally triggered a syntax error. Closed at its correct semantic boundary, right before the assign box (which already has its own independent permission gate). (4) The device timeline (`deviceTimelineHTML()`) was still gated only by `canSeeIssue(d)` — always true for Farm Hand — so it leaked the same kind of history the risk-detail box and handoff log were already correctly hidden for. Now requires `canSeeDetailedRisk()` too, consistent with the rest of the least-privilege model. (5) Device Details and Device Timeline are now genuinely collapsible (collapsed by default), reusing `toggleSettingsSection()` from `accessibility.js` rather than a new helper — this was called "labeled collapsible sections" in earlier session notes and reported done more than once, but was never actually in the code until now. (6) Removed the redundant "Device software updated" resolve-checkbox — it duplicated what the health-status question above it already asks more precisely. (7) **The real content leak, found via systematic cross-check after a "least privilege isn't working" report:** Device Details showed "Manufacturer support," "Known vulnerabilities" (CVE count), "Default password changed," the vulnerability-check button, auto-update status, and firmware date **unconditionally** — completely undermining the risk-detail box hiding done earlier, since the identical information was duplicated here with zero gating. Confirmed by rendering real HTML and checking for the actual leaked strings, not just assuming the earlier fix covered it. Split into two tiers: brand/model/serial/MAC/type stay visible to everyone; everything else now requires `canSeeDetailedRisk()`.
**Notes:** Escalation color unified to purple app-wide (Escalate tab, standalone escalate box, escalated pill, Manager's receiving banner) — was previously split between purple (the escalate action) and amber (the "needs attention" state), now one consistent identity. "Send Back" and "Returned to tech" are a distinct concept and correctly remain amber/orange. The Owner's "FYI" banner (Case C) stays blue — different icon (eye, not flag), different meaning (passive observation vs the escalate action), not part of this unification.
**Fixed (previously mocked up but never actually coded — corrected):** (1) Resolve tab now has the intro paragraph + "Step 1" callout matching the approved mockup, instead of the bare old `.health-box` with no framing. (2) The risk-detail box and action-box (recommended action, partial-fix banner, pw-guidance cards, assignment badge) are now gated behind `canSeeDetailedRisk()`, not just `canSeeIssue(d)` — Farm Hand/Viewer see neither; they rely entirely on the `farmHandStatus` box further down the page. Verified directly: Farm Hand sees nothing from these two sections, Technician/Manager/Owner still see full detail.

### `devices-resolve.js` (238 lines)
**Purpose:** Technician-facing resolve/escalate workflow and device verification.
**Key exports:** `renderAddScreen()`, `verifyIsStale()`, `verifyBoxHTML()`, `markVerified()`, `saveAll()`, `promptReplacementDevice()`, `saveResolution()`.
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

### `apps.js` (417 lines)
**Purpose:** Apps inventory screen AND the 3-2-1 backup tracker screen (both live in this one file).
**Key exports:** `setAppFilter()`, `renderBackupScreen()`, `saveBackup()`, `renderAppsList()`, `getAppRecAction()`, `showAppDetail()`, `selectAppReviewed()`, `selectAppMfa()`, `selectAppPwManager()`, `saveAppReview()`, `populateAppPicker()`, `toggleAppAddForm()`, `handleAppPickerSelect()`, `addApp()`, `selectAppPwManagerNew()`, `archiveApp()`, `restoreApp()`, `deleteApp()`.
**Depends on:** `networks-data.js` (app risk logic), `permissions.js`.
**Notes:** prior audit flagged the Apps inventory and 3-2-1 Backup tabs as possibly-lost work — this file is where both currently live, worth double-checking against `index.html` screen IDs `screen-apps` / `screen-backups` if either seems incomplete.

### `vulnerabilities.js` (140 lines)
**Purpose:** CISA/NVD vulnerability lookups for devices (conceptual/demo data source, not live network calls).
**Key exports:** `getRiskBadgeLabel()`, `saveNvdKey()`, `checkVulnerabilities()`, `checkCISA()`, `checkNVD()`, `renderVulnResults()`, `setDeviceFilter()`.
**Used by:** `networks.js` (`checkNetVulnerabilities`), `devices-detail.js`.

### `team.js` (197 lines)
**Purpose:** Team roster screen — invite, edit, archive/restore members; custom brand/type/role handling.
**Key exports:** `handleLocationSelect()`, `handleBrandSelect()`, `handleTypeSelect()`, `resolveCustomBrand()`, `resolveCustomType()`, `refreshRoleDropdowns()`, `inviteMember()`, `saveMemberEdits()`, `archiveMember()`, `restoreMember()`, `updateFarmTimezone()`, `updateTimeout()`.
**Depends on:** `permissions.js`, `settings.js` (role list), `defaultPermsForRole()` (`permissions.js`).
**Fixed (was a known issue):** `inviteMember()` used to create a duplicate/disconnected record when the invited person later completed "I have an invite" — `joinFarm()` (`auth-ui.js`) now updates the pending `'Invited'` record in place by phone number instead of pushing a second one. The demo invite placeholder (`demoInviteProfile`, `auth-ui.js`) is "Casey Aitch," distinct from every real team member, specifically to avoid recreating this collision.
**Relevant to locked spec:** "team member section cleanup" and "phone numbers visible to all employees" land here.

### `settings.js` (273 lines)
**Purpose:** Settings screen — owner email, per-role permission matrix, member detail view, custom role creation.
**Key exports:** `saveOwnerEmail()`, `renderSettings()`, `showMemberDetail()`, `permCheckbox()`, `permSummary()`, `togglePermission()`, `handleRoleSelect()`, `normalizeRole()`, `getAllRoleNames()`, `addCustomRoleIfNew()`, `normalizeName()`.
**Depends on:** `permissions.js`.
**Relevant to locked spec:** "Manager-to-Owner escalation toggles (Manager default on, Technician default off)" — the default values and the checkbox UI both live here.
**Fixed:** `togglePermission()` enforced its two access guards (`canActOnMember()`, the self-escalation cap) correctly, but never actually recorded a permission change anywhere — no audit trail of who granted or revoked what, for whom. Least privilege is prevention *and* accountability; only having the first half was a real gap. Now logs every change via `logAction()`, and grants (not revokes — narrowing access is always the safe direction) require an explicit confirm() before taking effect. **Found in a later cross-check:** canceling that confirmation left the checkbox visually stuck in its new (clicked) state without updating the underlying data, since a checkbox's `.checked` flips natively before `onchange` even fires — the cancel path now re-renders from the real data, matching the pattern the other two guards in this function already used.

### `accessibility.js` (~165 lines)
**Purpose:** Accessibility settings (text size, contrast, etc.), the collapsible-section toggle helper, and per-user default preferences (accessibility + language).
**Key exports:** `toggleSettingsSection()`, `scrollToSection()`, `goToAccessibility()`, `toggleA11y()`, `applyA11yUI()`, `loadMyPreferences()`, `saveMyPreferences()`. **Key data:** `userPreferences` (accessibility + language, keyed by phone number, covers all five demo people including Owner).
**Used by:** `auth-ui.js` (`_enterApp()` calls `loadMyPreferences()` on every sign-in), `session.js` (`logOut()` resets to universal default).
**Relevant to locked spec:** `toggleSettingsSection()` is the likely shared helper for "labeled collapsible sections across all screens" — check here before writing a new toggle function. Per-person accessibility/language preferences were previously a single global (`a11ySettings`/`currentLang` had no concept of "whose") — now loaded/reset on sign-in/sign-out, saved explicitly via a "Save as my default" button rather than a prompt-per-change.

### `auth-flow.js` (~50 lines)
**Purpose:** Sign-in verification-code send logic (registration flow removed — Farm accounts are provisioned externally before the app is ever opened; Owner only ever signs in). Also holds the single source of truth for demo account credentials.
**Key exports:** `sendCode()`, `resolveDemoAccount()`, `normalizePhone()`. **Key data:** `DEMO_CREDENTIALS` (phone → password map, one distinct password per demo account — deliberately not reused, since password reuse is exactly what this app teaches against), `pendingLogin` (staged sign-in result — see the critical fix below).
**Used by:** `auth-ui.js` (`signInAsDemoMember()` shares `resolveDemoAccount()` so the one-tap buttons and manual phone+password sign-in can never drift out of sync with each other).
**Fixed — a genuinely serious bug:** `sendCode()` used to write directly to `currentUser`, and `verifyCode()` (`session.js`) only ever checked the 6-digit code — it never confirmed a fresh, successful `sendCode()` had actually run. If the code screen was ever reached without that, verification would silently succeed using **whatever `currentUser` already contained** — i.e., whoever was signed in before. Reported symptom: signing out and back in as a different role would sometimes show the previous session's role instead. Fixed by staging the resolved account in `pendingLogin`, touched only by `sendCode()`; `verifyCode()` now requires it to exist and consumes it exactly once — if it's missing, verification is rejected outright and bounces back to sign-in, rather than falling back to old data. Verified directly: simulated reaching the verify step with no `pendingLogin` present, confirmed it's rejected rather than silently reusing the prior session.

### `auth-ui.js` (~185 lines)
**Purpose:** Sign-in screen flow — step navigation, invite code validation, demo persona sign-in. No account-creation UI (removed — see `auth-flow.js` note).
**Key exports:** `togglePwVisibility()`, `copyDemoPassword()`, `saveHealth()`, `showStep()`, `validateInviteCode()`, `joinFarm()`, `signInAsDemoMember()`, `_enterApp()`.
**Depends on:** `auth-flow.js` (`resolveDemoAccount()`), `session.js`.
**Notes:** `signInAsDemoMember()` pre-fills the real sign-in form with a demo account's credentials — it no longer bypasses MFA directly; the person still sends the code and verifies through the normal `sendCode()`/`verifyCode()` path. `joinFarm()` updates an existing pending ('Invited') `teamMembers` record in place if one exists (created by `inviteMember()` in `team.js`), rather than pushing a duplicate entry.

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

### `index.html` (983 lines)
**Purpose:** All screen markup/containers (`screen-dashboard`, `screen-devices`, `screen-detail`, `screen-add`, `screen-network`, `screen-net-detail`, `screen-apps`, `screen-app-detail`, `screen-backups`, `screen-settings`), plus static forms that get cloned by JS.
**Notes:** known prior defects — duplicate element IDs, malformed div nesting in the Settings section. Verify structure with a linter/grep before assuming a given `id` is unique.

### `styles.css` (125 lines)
**Purpose:** All visual styling — brand colors (forest green `#1F4D2E`, risk red/yellow/green variants, off-white `#f5f5f0`), layout, component styles.

### `module-load-order.json`
**Purpose:** Defines the script tag load order in `index.html`. Not a functional/purpose map — see this file only when load-order/dependency-timing bugs are suspected.

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
