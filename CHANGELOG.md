# AgriGuardian — CHANGELOG

Newest entries at the top. Every future change — however small — gets a new
entry here in the same turn it's made. This file is the single running
record.

Format per entry: date (or session, where exact date isn't known) — what
changed — why / notes.

---

## [Unreleased / next entry goes here]

---

## 2026-07-06 (late night) — Farm Hand experience audit: 5 real bugs found and fixed, 1 design rule changed
- Joy did a live pass through the app as each role and found real problems this session's earlier testing had missed. Each was verified against actual code/execution before fixing, not assumed.
- **Fixed: Farm Hand could archive and delete devices/networks** — the action buttons rendered completely unconditionally, no permission check at all (a pre-existing gap; a prior changelog entry had claimed a `canArchiveDevices()` helper already existed, but it didn't — another doc/code mismatch, now actually built). Added `canArchiveDevices()` (gated by the existing `archiveDelete` perm flag) for archive/restore, reused `canHardDelete()` (Owner-only) for permanent delete — applied to both devices and networks, at both the button-rendering level and the function level (defense in depth).
- **Fixed: Farm Hand saw the purple escalation banner and the escalated/partial-resolve pill tags** — root cause: `canSeeIssue(d)` was being used as the sole gate in several places, but it was designed to mean "this device exists to them," not "they should see operational severity signals." Added `&& canSeeDetailedRisk()` (already `false` for Farm Hand/Viewer) everywhere this pattern appeared: the escalation banner (`devices-detail.js`), and the escalated/partial-resolve tags in the device list (`devices-list.js`).
- **Changed (explicit new rule, not previously the case):** Technicians (and any non-Owner/Manager role) can no longer resolve an *unassigned* device — previously `canResolveIssues()` let anyone with the resolve permission act on unassigned work; now assignment is required first, no exception. Owner/Manager behavior is unchanged.
- **Fixed: Farm Hand dashboard and device list had no visual styling** — just plain text labels, no color or icon distinction between states. Replaced with a themed-but-calm 3-state pill system (down from 4 — "do-not-use" retired as a distinct state per explicit decision): Fine (thumbs-up, brand green), Known issue (info icon, neutral gray), Use with caution (alert-triangle, neutral amber — reusing colors already established elsewhere in the app, not a new red/alarm palette). Applied consistently on the dashboard, device list, and the device detail page's own status note. Removed "do-not-use" from the Manager/Owner-facing status-assignment dropdown going forward; existing devices with that value already stored still display correctly (mapped into the caution treatment for backward compatibility).
- **Verified working, not a bug:** the observation/"Notice something?" reporting workflow already correctly surfaces to the Owner/Manager dashboard as a distinct blue-bordered, clickable card — confirmed via jsdom (Farm Hand submits an observation, Owner's dashboard render includes it).
- **Identified but deliberately deferred, not silently skipped:** the Manager "Take Ownership → escalate to Owner" flow's escalate option renders far down the page instead of replacing the original decision banner at the top, and device detail's collapsible sections don't have the consistent animated/tinted accordion treatment `networks.js` got. Both are really the same underlying problem — the device detail page never got the full accordion rebuild that network detail did — and reordering pieces of the current ~700-line conditional render carries real risk of breaking the "each role sees exactly one banner" logic it depends on. Scoped as its own next dedicated pass, same size/shape as the network detail rebuild, rather than a rushed partial reorder.
- Verified via jsdom: 12 new targeted checks covering every fix above, plus a full 4-role × dashboard/device-list/10-devices/network-list/3-networks regression sweep (69 checks) to confirm nothing broke. All passing.

## 2026-07-06 (late evening) — Base corrected: this file replaces an earlier, wrong reconstruction
- **What happened today, honestly documented:** work was spread across several separate Claude conversations. This conversation initially pulled the GitHub `dev` branch as a base and built on top of it — but `dev` turned out to be stale relative to a `agriguardian-updated.zip` file from a later same-day session ("Managing a change request audit document," ~7:22pm), which had already fixed real things `dev` didn't have (see below). That later file had been deleted from Downloads and was recovered from the Recycle Bin.
- **Confirmed present in the 7:22pm file (verified directly, not assumed):** a real session-persistence security fix (`pendingLogin` staging pattern in `auth-flow.js`/`session.js`, preventing stale `currentUser` data from silently authenticating someone), Manager-to-Owner escalation working, and networks/network-detail otherwise matching what this conversation had independently built.
- **Confirmed absent from the 7:22pm file, despite being described in other same-day session summaries:** `reassignEscalation()` (this file still uses the older `sendBackToTech()` naming) and the `isPrincipalTier()`/10-role-hierarchy groundwork functions described in "Code fix token consumption inefficiency" (~6:13pm). That session's specific contributions do not appear to have carried into this file, and no separate copy of that session's output was found in the recovered Trash files. Not fabricating a fix for this — flagged as a real, currently-unrecovered gap.
- **A second doc/code mismatch found in this same 7:22pm file's own `FILE-MAP.md`:** it confidently claimed the Farm Hand dashboard crash (`canFarmHandSeeDevice` undefined) had already been found and fixed — but the actual `dashboard.js` in the same zip didn't reflect that fix. Corrected directly in `FILE-MAP.md` and fixed properly in `dashboard.js` (see below). This is the same "doc says fixed, code says otherwise" pattern that caused the original confusion earlier today — now confirmed to predate today's work, not something introduced by it.
- This changelog's own earlier version (built during today's now-corrected work) contained an entry claiming the Farm Hand dashboard crash was "found and fixed" — that entry described a real bug and a real fix, but against the *wrong* (stale GitHub) base. The fix described below is the same fix, correctly re-verified against the right base.

## 2026-07-06 (evening) — Farm Hand dashboard: colored severity count leak fixed
- `dashboard.js`'s `renderDashList()` computed `redDevices`/`yellowDevices` using only `canSeeIssue(d)`, with no gate on detailed-risk visibility — meaning Farm Hand's numeric issue count silently included colored severity information, contradicting this file's own documented design intent (see the "DEFAULT (Farm Hand, Viewer)" render branch: no count card, specifically because "it would color its number by severity").
- Fixed: both filters now also require `canSeeDetailedRisk()` (already `false` for Farm Hand/Viewer, `true` for Owner/Manager/Technician) — no new function invented, just gating with what already existed.
- Verified via jsdom: Farm Hand's dashboard renders with zero `badge-red`/`badge-yellow` classes present, across a full 4-role x dashboard/device-list/10 devices/network-list/3 networks execution audit (69 checks, all passing).

## 2026-07-06 (evening) — Network detail screen: full accordion + assignment/return-to-assigner
- `showNetDetail()` rebuilt around six animated collapsible sections (How to fix this / Assignment / Network details / Notes / Network history / Remediation checklist — renamed from "What was done?" for this screen only; devices keep their original wording).
- New assignment system for networks — previously didn't exist at all; any role with resolve permission could act on any network regardless of assignment. Added `assignedTo`/`assignedBy` fields, `netAssignBoxHTML()`, `assignNetIssue()`, `unassignNetIssue()`.
- New return-to-assigner workflow (`canReturnNetIssue()`, `canActOnReturnedNet()` in `permissions.js`; `returnNetIssue()` in `networks.js`) — the assignee hands an issue back to whoever specifically assigned it, carrying checklist progress forward automatically, purple-styled (`#5B21B6`/`#F3EEFF`/`#C4B5FD`) per an explicit decision to treat this as escalation-equivalent. Deliberately simpler than the device escalation system (no structural-issue severity gate — networks have no brand/CVE data to gate on).
- Non-farm devices added to the demo inventory: Owner's iPhone (Apple, green), Farm Manager's Android phone (Samsung, yellow — deliberate, shows a relatable everyday gap on ordinary tech), Farm office laptop (Dell, green), Farm records tablet (Apple, green). New `getRiskData()` entries for Apple/Samsung/Dell; new device types Smartphone/Laptop/Tablet added to `index.html` and `lang-data.js` (EN+ES); `team.js` brand-collision list updated.
- **Two open questions, not resolved by guessing:** whether Owner should have any distinct ability beyond Manager on the network detail screen specifically (currently identical); how a genuinely read-only network viewer should be modeled (no such role currently exists — Farm Hand/Viewer are locked out of the Network tab entirely at the nav level, unlike the more nuanced device model).

## 2026-07-06 (~7:22pm session, real content recovered from Trash — "Managing a change request audit document")
- Unified sign-in flow so all paths use one real MFA mechanism (no bypass).
- **Session-persistence security fix:** `pendingLogin` staging pattern in `auth-flow.js`/`session.js`, preventing `verifyCode()` from silently authenticating using a previous session's stale `currentUser` data.
- Farm Hand/Viewer least-privilege redesign: Network tab removed entirely, device detail information tiering, neutral-only status indicators, observation reporting feature.
- Two bugs fixed in `saveAll()` that caused resolve operations to silently fail or wipe their own data.
- Manager-to-Owner escalation enabled (previously blocked alongside Owner despite Managers having the same need).
- Collapsible sections added to device and network detail pages (pre-dating this evening's fuller accordion rebuild above).

## 2026-07-06 (~6:13pm-ish sessions — NOT confirmed present in current files, flagged not fabricated)
- Two same-day sessions ("Demo - Alpha 2" and "Code fix token consumption inefficiency") described: a weighted hygiene-scoring rework, an SMS-style invite-code flow, `isPrincipalTier()`/`isSuccessorTier()`/`isTopTier()` role-tier groundwork functions, and `sendBackToTech()` being replaced by `reassignEscalation()`.
- None of these were found in the recovered 7:22pm file. If you still have a separate delivered zip from either of those specific sessions, upload it and these can be verified and merged in; otherwise treat this entry as a record that the work was described as done, not as confirmation it exists in current code.

## 2026-07-06 — RBAC & auth overhaul (earlier reconstruction, historical)
- Full RBAC redesign consolidated in `permissions.js`.
- Farm Hand / Viewer least-privilege model: all devices visible, no severity color-coding, generic status notes, Network tab hidden, technical risk detail gated behind `canSeeDetailedRisk()`.
- Observation/report mechanism ("Notice something?") surfacing to Owner/Manager dashboards.
- Login/auth flow overhaul: removed external "Create an account" flow, unified sign-in through MFA.
- Added demo personas Joni Dear (Technician) and Casey Aitch (invite-flow placeholder).
- Passwords replaced with NIST SP 800-63B-aligned passphrases.
- Resolve/escalate workflow rebuilt as a unified tabbed box; escalation color unified to purple app-wide.
- Hygiene scoring reworked to weighted math (red counts 3× yellow).

## 2026-07-05 — Token-efficiency / file-map session
- Split the former `app.js` monolith into standalone modules — the monolith is retired, modules are the sole source of truth.
- Created `FILE-MAP.md` and `module-load-order.json`.

## 2026-07-04 and earlier — historical, condensed
- Farm Hand/Viewer least-privilege groundwork, Manager escalation toggles, view-only assignment with instruction notes, B-file merge and color unification, structured least-privilege permission redesign (OS superuser/primary-user/guest model), project scope assessment against nine security principles, initial prototype build (device management, network monitoring, RBAC, escalation chains, hygiene scoring, red/yellow/green tiering), brand identity established.

---

### A note on sourcing and trust
This changelog has been rebuilt once already today after discovering the
first version was constructed against a stale base. Entries above marked
"NOT confirmed present" are exactly that — described in a session summary,
not verified against actual code. Going forward, nothing gets marked as
"fixed" or "done" in this file without direct execution verification in the
same turn.
