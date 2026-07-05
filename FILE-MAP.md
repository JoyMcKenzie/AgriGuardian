# AgriGuardian — FILE-MAP.md

**Purpose:** dev-only reference, not shipped with the app. Lets you point at
a screen/feature and know which file(s) to name, and lets Claude jump
straight to the right file instead of cold-reading the project.

**Rule:** any turn that changes a file's purpose or exported functions must
update that file's entry below in the same turn, as part of the normal
validate-and-deliver pipeline. A stale map is worse than no map.

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
**Key exports:** `canManage()`, `currentPerms()`, `defaultPermsForRole()`, `canHardDelete()`, `canActOnMember()`, `canResolveIssues()`, `canAssignIssues()`, `canExportReports()`, `hasStructuralIssue()`, `shouldShowPartialResolveBox()`, `canSeeIssue()`, `canSeeDetailedRisk()`, `canSeeNetworkIssue()`, `canSeeHygieneScore()`, `canSeeApps()`, `assignableMembers()`, `canEscalateIssue()`, `escalationTarget()`, `escalationTargetName()`, `canClearEscalation()`, `isEscalationPrimaryActor()`.
**Depends on:** `currentUser`.
**Used by:** `devices-detail.js`, `devices-resolve.js`, `devices-list.js`, `apps.js`, `networks.js`, `team.js`, `settings.js`, `dashboard.js`, `auth-ui.js` (`defaultPermsForRole()` is shared by `inviteMember()` and `joinFarm()` so a role gets the same real permissions whether it was assigned by an Owner invite or accepted via the invite-code flow) — this is the RBAC gate; any "who can click this button" question starts here.
**Known issue (from prior audit):** archive/delete/add-device actions in `devices-list.js`/`devices-detail.js` are not yet gated through this file — RBAC enforcement gap.

### `risk.js` (66 lines)
**Purpose:** Device risk scoring and messaging based on brand/password/health.
**Key exports:** `getRiskData()`, `getRisk()`, `translateLocation()`, `translateDeviceType()`, `getRiskLabel()`, `getRiskWhy()`, `getRiskAction()`.
**Depends on:** `t()`.
**Used by:** `devices-list.js`, `devices-detail.js`, `dashboard.js`.
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

### `devices-list.js` (145 lines)
**Purpose:** Renders the device list screen; list-level actions (filter, archive, unarchive, delete).
**Key exports:** `renderDeviceList()`, `deviceCardHTML()`, `setUserFilter()`, `archiveDevice()`, `unarchiveDevice()`, `deleteDevice()`.
**Depends on:** `risk.js`, `permissions.js`.
**Known issue:** archive/delete not yet RBAC-gated (see `permissions.js` note).

### `devices-detail.js` (687 lines — largest UI file)
**Purpose:** Device detail screen: full device view, add-device form, issue assignment, and `showScreen()` — the shared screen-navigation function used app-wide.
**Key exports:** `findDefaultLoginHTML()`, `pwManagerCardHTML()`, `deviceTimelineHTML()`, `showDetail()`, `assignBoxHTML()`, `assignIssue()`, `unassignIssue()`, `showScreen()`, `showAddForm()`, `hideAddForm()`, `selectPw()`, `addDevice()`.
**Depends on:** `risk.js`, `permissions.js`, `audit.js`.
**Used by:** effectively every screen-switch in the app calls `showScreen()` from here.
**Notes:** Largest single file — if a fix only touches one function, grep for it rather than viewing the whole file.

### `devices-resolve.js` (238 lines)
**Purpose:** Technician-facing resolve/escalate workflow and device verification.
**Key exports:** `renderAddScreen()`, `verifyIsStale()`, `verifyBoxHTML()`, `markVerified()`, `saveAll()`, `promptReplacementDevice()`, `saveResolution()`.
**Depends on:** `permissions.js` (`canResolveIssues`, `canEscalateIssue`), `devices-detail.js` (`showScreen`).
**Relevant to locked spec:** this is the file for "technician resolve-vs-escalate workflow" and "technician escalation offered on any assigned issue."

### `networks.js` (344 lines)
**Purpose:** Network list/detail screens — UI layer for networks.
**Key exports:** `renderNetworkList()`, `netTimelineHTML()`, `getNetRecAction()`, `showNetDetail()`, `checkNetVulnerabilities()`, `archiveNetwork()`, `unarchiveNetwork()`, `deleteNetwork()`, `saveNetwork()`, `selectNetPw()`, `selectNetEnc()`, `handleNetBrandSelect()`, `setNetFilter()`, `toggleNetAddForm()`, `addNetwork()`.
**Depends on:** `networks-data.js`, `permissions.js`, `vulnerabilities.js`.
**Relevant to locked spec:** "farm hand least-privilege access (Network tab hidden)" — the hide logic should gate entry to this screen.

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

### `accessibility.js` (~165 lines)
**Purpose:** Accessibility settings (text size, contrast, etc.), the collapsible-section toggle helper, and per-user default preferences (accessibility + language).
**Key exports:** `toggleSettingsSection()`, `scrollToSection()`, `goToAccessibility()`, `toggleA11y()`, `applyA11yUI()`, `loadMyPreferences()`, `saveMyPreferences()`. **Key data:** `userPreferences` (accessibility + language, keyed by phone number, covers all five demo people including Owner).
**Used by:** `auth-ui.js` (`_enterApp()` calls `loadMyPreferences()` on every sign-in), `session.js` (`logOut()` resets to universal default).
**Relevant to locked spec:** `toggleSettingsSection()` is the likely shared helper for "labeled collapsible sections across all screens" — check here before writing a new toggle function. Per-person accessibility/language preferences were previously a single global (`a11ySettings`/`currentLang` had no concept of "whose") — now loaded/reset on sign-in/sign-out, saved explicitly via a "Save as my default" button rather than a prompt-per-change.

### `auth-flow.js` (~50 lines)
**Purpose:** Sign-in verification-code send logic (registration flow removed — Farm accounts are provisioned externally before the app is ever opened; Owner only ever signs in). Also holds the single source of truth for demo account credentials.
**Key exports:** `sendCode()`, `resolveDemoAccount()`, `normalizePhone()`. **Key data:** `DEMO_CREDENTIALS` (phone → password map, one distinct password per demo account — deliberately not reused, since password reuse is exactly what this app teaches against).
**Used by:** `auth-ui.js` (`signInAsDemoMember()` shares `resolveDemoAccount()` so the one-tap buttons and manual phone+password sign-in can never drift out of sync with each other).

### `auth-ui.js` (~185 lines)
**Purpose:** Sign-in screen flow — step navigation, invite code validation, demo persona sign-in. No account-creation UI (removed — see `auth-flow.js` note).
**Key exports:** `togglePwVisibility()`, `copyDemoPassword()`, `saveHealth()`, `showStep()`, `validateInviteCode()`, `joinFarm()`, `signInAsDemoMember()`, `_enterApp()`.
**Depends on:** `auth-flow.js` (`resolveDemoAccount()`), `session.js`.
**Notes:** `signInAsDemoMember()` pre-fills the real sign-in form with a demo account's credentials — it no longer bypasses MFA directly; the person still sends the code and verifies through the normal `sendCode()`/`verifyCode()` path. `joinFarm()` updates an existing pending ('Invited') `teamMembers` record in place if one exists (created by `inviteMember()` in `team.js`), rather than pushing a duplicate entry.

### `session.js` (140 lines)
**Purpose:** Session timeout, logout, password reset flow.
**Key exports:** `startSessionTimeout()`, `resetTimeout()`, `logOut()`, `sendResetCode()`, `confirmReset()`, `verifyCode()`.
**Depends on:** `auth-flow.js` (`normalizePhone()`, `DEMO_CREDENTIALS`) — `confirmReset()` actually updates the matched account's demo password now, rather than just claiming success.
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
