# AgriGuardian Backend Architecture — Planning Document

**Status:** Living design document — planning/pre-implementation stage
**Scope:** This document covers the future backend/SaaS architecture (accounts, roles, permissions, invitations, notifications, messaging). It is entirely separate from the current static prototype in `/mnt/project` — nothing here changes that codebase. This is groundwork for when real backend implementation begins.
**Last updated:** This session — see conversation history for full reasoning behind each decision.

---

## 1. Core Design Principles and Backend Structure

### 1.1 Core Design Principles (apply throughout)

- **Least privilege** — access is granted deliberately, never broad-by-default. Internal Admin is the only role with blanket access, and even that is fully audited.
- **Non-repudiation** — every grant, revoke, role change, login, message, and review action is logged with actor, timestamp, and (where relevant) a reason. Nothing about access or communication should ever be unanswerable months later.
- **Defense in depth** — security boundaries are structural (separate tables, separate session scopes), not just query filters or UI restrictions.
- **Fail-safe defaults** — deny unless explicitly granted; nothing assumes trust.
- **Compute permissions live, never cache them** — this was learned the hard way in the prototype (`pendingLogin` staging bug from stale cached session state). Effective access is always resolved fresh from current role assignments and grants, never from a snapshot.

### 1.2 Backend Structure Overview

The backend is organized into three top-level sections, matching the interactive map (`agriguardian-backend-map.html`):

| Section | Status in this document |
|---|---|
| **Farm view** | Two surfaces: **App** (daily operational use — broken into features in Section 9) and **Web dashboard** (the Account Admin Portal — broken into features in Section 11) |
| **Infrastructure and shared services** | Seven named sub-branches (Database, Backend API, Authentication and identity, Communications, Integrations, Hosting and secrets, Billing and payments) — scoped, with real deferred items surfacing in Section 10 as they come up |
| **Vendor dashboard** | Confirmed as the "technician-only backend" referenced in the original business plan. Starting shape identified in Section 12: client roster and service-level management, Implementation Specialist operations, third-party risk monitoring and alert relay. |

Sections 2 through 8 describe the underlying data model, permission logic, invitation flow, notifications, and messaging that both **App** and **Web dashboard** are built on. Section 9 organizes that foundation feature-by-feature for App; Section 11 does the same for Web dashboard. Vendor dashboard doesn't have its own breakdown yet — that's the natural next piece of this document once it gets the same treatment.

---

## 2. Account and Role Model

### 2.1 The Farm entity and provisioning

The Farm account is provisioned externally, through a backend/service layer, at the point a farm engages the service — never through a "create my farm" flow inside the farmer-facing app. The app only ever operates against a Farm that already exists.

### 2.2 Three access tiers

**Full identity model for the first two rows (how staff exist as records, authenticate, onboard, and what session security applies) now lives in Section 12.1** — this table covers what each tier can *do*; Section 12.1 covers *who they are as system identities*, which was a genuine gap until addressed there.

| Tier | Who | Surface |
|---|---|---|
| Internal Admin | AgriGuardian staff | Internal admin console (Vendor dashboard) — full access across all farms, provisioning, support |
| Implementation Specialist | AgriGuardian staff, narrower scope than Internal Admin | Vendor dashboard — write access to Managed farms' device/network/team data during setup and ongoing support, scoped only to farms currently assigned to them. Named deliberately to avoid colliding with the farm-side Technician role (Section 2.4) — same job category, different person, different system. |
| Owner | The farm's principal account holder | App (daily, full operational) + Portal (via step-up switch) |
| Portal-only roles | Bookkeeper, Office Manager, etc. | Portal only — no login to the operational app at all |

### 2.3 Owner's dual access — step-up re-authentication

The Owner has one set of login credentials, used for daily app access. Reaching the Account Admin Portal requires an explicit, visible mode switch ("Switch to Account Admin") that triggers fresh re-authentication (password/MFA) before the portal loads. This is the same pattern as AWS root-vs-IAM or "confirm password to change billing." It avoids a second password to manage while still creating a hard security boundary — a logged-in phone left open on the app can't be used to reach account-admin functions without re-proving identity.

### 2.4 Role catalog (composable, multi-role per person)

A person can hold **more than one role simultaneously** (e.g., a bookkeeper who's also doing tech support/HR) — this matches how small farms actually staff themselves. Each role has a **fixed internal key** used by all permission logic; **display labels are farm-customizable** on top (e.g., a cattle farm relabeling "Technician" as "Herdsman"), purely cosmetic, never referenced by logic.

| Role key | Surface | Apps/business-account tab |
|---|---|---|
| Owner | App + Portal | App: read-only. Portal: full edit |
| Manager | App only | App: read-only |
| Technician | App only | None |
| Farm Hand / Viewer | App only | None |
| Bookkeeper (multiple per farm allowed) | Portal only | None — billing/subscription only (view + manage: upgrade/downgrade/cancel) |
| Office Manager | Portal only | Full edit (business accounts: banking, feed/seed, Amazon business, etc.) |
| Onboarding/Offboarding Administrator (multiple per farm allowed) | Portal only | None — personnel lifecycle only: initiating invites (Section 5) and full offboarding (revoking role assignments, de-registering devices via Section 9.5) for both onboarding and offboarding by default. Not every farm needs this assigned — same optional-catalog pattern as every other role — but larger operations with real staff turnover benefit from a dedicated lifecycle role rather than routing every hire/departure through the Owner personally. |

**Effective permission = union of all assigned roles' default bundles, plus any Owner-granted one-off extras.** Where roles conflict on the same resource, **most-permissive wins** (confirmed decision — since assigning both roles is a deliberate choice).

### 2.5 Apps/business-account data location

Decided: **Portal is the source of truth and edit surface** (Office Manager and Owner-via-portal manage entries there). **The app shows this data read-only**, because hygiene score is farm-wide and needs the full risk picture. This is a change from the current prototype (today: edit-in-app, Owner-only) — flagged clearly so it isn't rebuilt the old way out of habit when backend work starts.

### 2.6 The 10-role hierarchy roadmap item — resolved

The previously-planned "10-role hierarchy" (Principal Operator, Herdsman/Stock Lead, etc.) is **not a separate role system** — it's superseded by the display-label customization in 2.4. Each catalog role above gets a farm-configurable label; there is no separate fixed 10-role structure to build.

---

## 3. Data Model

### 3.1 Entities

- **Farm** — `farm_id` immutable forever, even if legal name changes. Non-repudiation anchor. Carries a `service_level` field (**Managed** or **Self-Serve**) — changeable in either direction over the life of the account, logged like any other change (who changed it, when). **Self-Serve**: AgriGuardian only ever creates the Farm record and the Owner account; every device, network, team member, and role assignment after that is entered by the farm's own people, on whichever surface (App or Portal) fits the task — never by AgriGuardian staff. **Managed**: an Implementation Specialist (Section 2.2) does the on-site setup and provides ongoing support, with real write access to that farm's operational data.
- **Person** — farm-agnostic identity (legal name, display name, status). Never hard-deleted, only archived. **Login is phone number + password + MFA — no email involved in login for anyone.**
- **PersonFarmMembership** — join table between Person and Farm. Introduced specifically to keep the door open for a person belonging to multiple farms later (e.g., an outside accountant serving several farm clients) without a painful migration — even though today every person has exactly one membership.
- **Role** — the fixed catalog (see 2.4).
- **RoleAssignment** — scopes to a **membership** (not directly to a person), since a role only makes sense within a specific farm relationship. Rows are never deleted, only `revoked_at` stamped.
- **PermissionGrant** — Owner's one-off extras beyond role defaults. Carries `farm_id`, `resource_type`, `permission_level`, and a **mandatory reason** (matches the "mandatory notes on every handoff" principle already established in the app). Kept structurally separate from RoleAssignment so removing a role never ambiguously affects a manual grant. **Validated by existing prototype behavior:** `team.js`/`settings.js` already give every team member individual permission overrides beyond their role default (`addDevices`, `archiveDelete`, `resolveIssues`, `assignIssues`, `exportReports`, `viewOnly`) — a simpler, fixed-flag version of exactly this concept. The real design generalizes beyond those six fixed booleans to arbitrary resource-scoped grants, but the underlying pattern (per-person overrides beyond role) is already proven out.
- **Session** — scoped to `surface` (app/portal) and `auth_level` (standard/elevated). A stolen app-session token cannot authorize portal actions — the separation is structural, not just a UI gate.
- **AuditLog** — append-only, no update/delete path exists at the application layer, ever — not even for Internal Admin. Corrections are new entries, never edits to history. **Flagged, not yet resolved:** this entity currently assumes every actor is a `Person` — now that `VendorStaff` exists as a separate entity (Section 12.1), every log entry needs to reference either a Person or a VendorStaff. A real technical detail to work out, not a blocker to anything decided so far.
- **Invitation** — single-use, expiring, carries proposed roles.
- **HandoffEvent** — a per-device history of every handoff (assign, resolve, escalate, send-back, take-ownership, partial-fix), each carrying `type`, `from_person`, `to_person`, a **mandatory note**, `reason` (escalate/partial-fix only, drawn from the fixed taxonomy below), and `occurred_at`. Distinct from AuditLog: AuditLog is the system-wide immutable ledger of every action across the whole platform; HandoffEvent is a device-scoped, curated view of just the handoff narrative for that one device — though every HandoffEvent should also produce a matching AuditLog entry, not replace it. Confirmed real in the prototype (`d.handoffLog` on every device in `permissions.js`), not a speculative addition.
- **Escalation reason taxonomy** — confirmed from the prototype (`lang-data.js`, `escReasons`): *End of life — device should be retired*, *End of service — no more updates from the manufacturer*, *Needs replacement purchase*, *Needs vendor/dealer involvement*, *Outside my permissions*, *Other*. Becomes a fixed enum on the real Escalation structure rather than a free-text field.

### 3.2 Why Person has no `farm_id` directly

Person is farm-agnostic on purpose. If a person's farm relationship changes shape later (multi-farm), it's a new `PersonFarmMembership` row — no restructuring of Person, Session, AuditLog, or anything referencing `person_id` elsewhere.

---

## 4. Permission Check Resolution (runs on every request)

1. **Validate session** — unexpired, untampered. Fail fast if not.
2. **Enforce surface match** — session's surface (app/portal) must match the resource's home surface. Mismatch = deny, regardless of what permissions exist. This is what makes app/portal separation a real boundary, not cosmetic.
3. **Resolve effective permissions** — union of active RoleAssignment bundles (via current membership) + active PermissionGrants, most-permissive-wins on conflict. **Computed live, never cached**, to avoid the stale-session class of bug.
4. **Step-up gate** — some actions (Owner entering portal mode, subscription cancellation, message review) require `auth_level = elevated`, not just the underlying permission.
5. **Allow or deny — log either way.** Denials are logged for: all state-changing actions, and all portal-surface denials regardless of type (higher-stakes surface). Read-only app-surface denials may be sampled/aggregated rather than logged individually, to avoid audit-log noise.

---

## 5. Invitation Flow

1. **Invite created** — Owner, Internal Admin, or an Onboarding/Offboarding Administrator (Section 2.4, new role) selects **phone number** (not email — login is phone + password + MFA for everyone, and invites follow that same identity model), proposed role(s), farm. **This is one unified flow regardless of which surface the role belongs to** — an invite can carry an App-surface role (Manager, Technician), a Portal-surface role (Bookkeeper, Office Manager), or both at once. There is no separate Portal-specific invitation system (confirmed decision — see Section 11.4).
2. **Token issued via SMS** — cryptographically random, single-use. **Only the hash is stored**; the raw token exists only in the text message itself (same pattern as password-reset tokens, just delivered by SMS instead of email — consistent with SMS being the trusted channel throughout this design, since it rides the same phone number used for login).
3. **Invitee accepts link** — validated: exists, unexpired, unused, matches farm. Any failure returns an **identical generic error** regardless of which check failed, to prevent enumeration.
4. **Credential setup + mandatory MFA** — required before activation for a brand-new Person. No bypass — this mirrors the existing fix that eliminated the prototype's one-tap MFA bypass; an invite flow without this would reopen the same door elsewhere. Existing Persons being added to an additional role skip this step (already have credentials).
5. **Membership/role assignment created** — logged, inviter notified of acceptance.

**Duplicate invites — confirmed:** if the Owner invites the same phone number again before the first invite is accepted, **the new invite supersedes the old one** — the earlier token is invalidated, only the newest invite is live. Simpler to reason about than letting both stand (which risks two valid tokens with unclear which roles actually apply), and less restrictive than blocking the second attempt outright (which would force the Owner to manually find and cancel the first invite just to fix something like a mistyped role).

**Owner revocation — confirmed:** the Owner can revoke a pending invite before it's accepted, and doing so **requires a reason**, matching the mandatory-notes pattern already established for other sensitive actions in this design (PermissionGrant, escalation). Logged like any other reasoned action.

**Incomplete MFA enrollment — confirmed:** if someone accepts the invite and sets a password but never finishes MFA enrollment, they get **no access at all** — not partial App access while Portal stays locked. Blocking only Portal would reopen a version of the exact one-tap-bypass gap that was already deliberately closed in the prototype, for no real benefit; there's no legitimate reason someone needs App access badly enough mid-enrollment to justify that risk.

**Auto-cleanup for abandoned enrollment — confirmed, new:** if credential setup begins but MFA enrollment isn't completed within **10 days**, the incomplete Person/Membership/RoleAssignment is automatically archived, and the phone number becomes eligible for a fresh invite. The 10-day window (rather than a shorter one) was chosen deliberately to avoid penalizing someone whose enrollment window happens to span a holiday period (Christmas–New Year's was the example raised). This is logged like anything else, and the Owner gets a quiet, **log-only** note about it — this is housekeeping, not a security event, so it doesn't warrant an active push. This exists specifically so an abandoned invite doesn't become a manual cleanup chore the Owner has to remember to do. Distinct from the pre-acceptance invite-link expiry (Section 5, step 2 area — ~72 hours before the link itself goes dead if nobody ever clicks it) — this is a second, later timeout for the case where someone *did* start but never finished.

This closes out every item originally raised in Section 5.1 — nothing left open here.

---

## 6. Notification and Security Alerting

### 6.1 Failed authentication vs. failed authorization — different threats, different handling

- **Failed authentication** (wrong password/MFA): escalating lockout.
  - Tier 1: 5 attempts / 15 min → 5-min lockout, email to account holder
  - Tier 2: repeat → 30-min lockout, email to account holder
  - Tier 3: repeat again → 24-hr lockout, email to account holder **and** the farm Owner
  - Tier 4 (rare): sustained targeting continues, or same pattern across multiple accounts/farms → escalates to Internal Admin (platform-level)
- **Failed authorization** (valid session, action outside the person's role): **log + flag for Owner review — no auto-lockout, no auto-session-suspension.** Confirmed reasoning: many legitimate, non-malicious causes exist (stale bookmarks, curiosity, permissions that changed after the fact), and auto-punishing creates false accusations. Escalates to Internal Admin only if the pattern is systemic (many accounts/farms, not one).
- **Denial is never proactively surfaced to the acting person** — this is deliberate. If the cause is malicious, tipping them off helps them, not you.

### 6.2 Delivery tracks — decided at write-time, not read-time

| Track | Examples | Farm-visible? | Delivery |
|---|---|---|---|
| Log-only | Tier-1/2 auth lockouts, explainable authz patterns | Yes, browsable activity log with one-click "this was me" dismissal | None pushed |
| Surfaced | Tier-3 auth escalation | Yes, actively pushed | Email + SMS + in-app (if reachable) |
| Vendor-only | Cross-farm/platform attack patterns | **No** — lives in a structurally separate table (`PlatformSecurityEvent`), not just a filtered view | Internal Admin only |

### 6.3 Tone and message design (to prevent unnecessary farmer anxiety)

- Fixed message templates per alert type — never dynamically composed, to keep tone deliberately chosen rather than improvised.
- Plain, non-technical language always.
- Every actionable alert pairs the description with **exactly one recommended next step** — never "look into it," which invites self-diagnosis down a wrong path.
- "No action needed" stated explicitly when true.

### 6.4 Entities

- **SecurityAlert** — `alert_id`, `person_id`, `farm_id`, `alert_type`, `status` (open/reviewed/dismissed), `reviewed_by`, `reviewed_at`, linked to underlying AuditLog evidence. Farm-visible tiers only.
- **PlatformSecurityEvent** — structurally separate table for vendor-only events. Table-level separation, not a query filter — a bug in farm-facing queries can never leak a row that was never in the farm-facing table.

### 6.5 OPEN — not yet decided
- Whether account-security signals ever fold into the weighted hygiene score, or stay permanently separate. Current lean: keep separate until real data on alert frequency/noise is available.

### 6.6 Notification routing (business/informational categories — billing, hygiene reports, audit exports)

- **NotificationRoute** entity: `category`, `recipient_kind` (role / person / external email), `recipient_value`, `reason` (required for external recipients), `expires_at` (strongly recommended default for external/ad hoc recipients like outside auditors), `added_by`, `added_at`, `revoked_at`.
- Role-based routing (e.g., "Bookkeeper gets billing changes") resolves dynamically to whoever currently holds that role — self-maintaining as people change roles.
- Channel by category: urgent security → in-app + SMS + email. Business/informational → email only. Log-only → nothing pushed. **Correction, fully resolved:** email as a delivery channel is eliminated for **everyone with any login at all** — App-only roles and Portal-only roles alike, Owner included. Business/informational notices now use the same content-free SMS-trigger + in-app pattern universally: the SMS points to Dashboard (Section 9.1) for anyone touching the App, or to Oversight, Review, and Audit Trail (Section 11.6) for anyone Portal-only — both already serve as the "here's what's happened" landing place for their respective surface, so no new screen was needed for the Portal side. **The one exception, confirmed:** external `NotificationRoute` recipients (outside auditors, no app login at all) keep real email — "log in to check" is meaningless for someone who isn't a Person in this system, and building a separate no-login secure-access mechanism for this occasional case would be disproportionate scope. The existing safeguards (required reason, recommended expiration) already keep this appropriately contained.
- **The in-app notifications landing area is fully designed** — see Dashboard (Section 9.1) for the App-side design; Portal reuses the existing Oversight, Review, and Audit Trail screen rather than needing its own separate version.

### 6.7 Person.notification_email — eliminated

**Login is phone number + password + MFA for everyone — email was never part of login for anyone.**

- **`notification_email` is eliminated entirely, for everyone with any login.** What started as "optional, Owner-controlled" is now not needed at all — anyone with an App or Portal login gets their notices via SMS-trigger pointing to their surface's landing area (Dashboard or Oversight/Review/Audit Trail), never email.
- Email is treated as a **low-trust channel** throughout, which is exactly why this field was worth eliminating rather than just restricting: many farmers use older personal webmail (Hotmail, AOL, Yahoo) with weak security practices, and SMS — riding the same phone number already used for login — is inherently more trustworthy for this audience.
- **The Owner's-own-email-change question is now moot, not resolved by mechanism.** There's no `notification_email` field left for the Owner (or anyone else with a login) to have changed in the first place — this was the last piece of that long-open item, and it closes by elimination rather than by picking a confirmation flow.
- The one place email survives at all is the external `NotificationRoute` recipient case (Section 6.6) — someone with no login, not a Person in this system.

### 6.8 Parked idea — AgriGuardian-managed professional email

**Reframed:** this isn't just a future revenue stream — the core insight is that farms relying on old personal webmail (Hotmail, AOL, Yahoo) for actual business use *is itself a cyber-hygiene risk*, the same category of thing this whole product exists to surface and fix. AgriGuardian offering a migration path to secured business email is squarely on-mission, not a bolt-on monetization idea. Revenue is a reasonable side effect of doing this, not the reason to do it.

- Likely a **reseller/wrapper model** (Google Workspace/Microsoft 365 under the hood) rather than building raw mail infrastructure — real deliverability/DMARC/abuse-handling work is substantial and better sourced than built.
- **Administration** lives in the Account Admin Portal (create mailbox, assign to person, billing) — same pattern as subscription/Apps management.
- **Daily access** is a lightweight SSO entry point ("Mail" button, surfaced from app or portal) — explicitly *not* a built-in webmail client (Option B over Option A), to avoid turning a security product into an email client.
- SSO rides the same phone + password + MFA identity already used for login — one hardened credential covers both, directly solving the personal-webmail weak-password problem for this audience.
- **New idea surfaced, not yet decided:** should personal-vs-secured email usage become its own tracked hygiene signal — similar to how Business Apps and Accounts (9.3/11.3) already tracks MFA/password-manager hygiene on third-party accounts — turning "this farm uses Hotmail for business" from an assumption into a flagged risk item, with this migration service as the natural remediation offered right there? A real product idea, worth its own consideration later, separate from whether/when the email service itself gets built.
- Status: parked, shaped, not committed as active work.

---

## 7. In-App Secure Messaging

### 7.1 Why not native SMS deep-linking

Rejected. Breaks the audit trail entirely (conversation happens outside any system AgriGuardian can see), makes phone numbers permanently portable once saved to someone's native contacts, and native SMS sender identity is spoofable/unverifiable.

### 7.2 Why not Signal/Telegram as the core mechanism

Rejected as the primary system. Signal's core value (true end-to-end privacy, unreadable even by Signal) directly conflicts with the audit/non-repudiation requirements this whole design is built around. Telegram's default chats aren't E2E encrypted either, so it wouldn't even deliver the "secure" property being sought, while still adding a third-party identity/API dependency.

**Possible future idea (not committed):** an explicitly separate, clearly-labeled "quick chat" side-channel for purely casual, non-operational communication only — never used for anything operational (handoffs, escalations). Flagged as parked, not decided.

### 7.3 Adopted model: in-app messaging + content-free SMS notice

- Message sent in-app → stored, timestamped, tied to authenticated sender identity, fully logged.
- Recipient gets an SMS immediately: sender's name only, no content (e.g., *"New AgriGuardian message from Carlos — log in to view"*).
- In-app push attempted too, if the recipient's device/app state allows it — SMS is the reliable fallback since not everyone keeps the app running.

### 7.4 Access model — reason-gated review, not standing visibility

- Message content encrypted at rest. Sender and recipient read normally, no justification needed (they're parties to it).
- **Reading someone else's conversation is a deliberate, accountable act** — modeled as a `PermissionGrant`, not a role:
  - Owner has this permission by default.
  - Other people (e.g., a business-partner spouse holding the Bookkeeper role) get it via an explicit grant — reason required, gated behind step-up re-auth, logged.
  - Grant can be **scoped** (e.g., "review access to the Manager's threads" rather than blanket access to everyone) via the existing `resource_id` field on PermissionGrant.
- **Review is silent** — confirmed decision. The reviewed parties are not proactively told a review happened; it's logged, not announced. Matches how failed-authorization handling was decided earlier (log, don't tip off).
- **MessageReview** entity: `reviewer_person_id`, `thread_id`, `reason`, `reviewed_at` — itself an AuditLog entry. **Parked alongside the Messaging feature itself (Section 9.6a)** — this entity isn't being built until/unless Messaging is reactivated.

### 7.5 Behavioral design — making logging visible without relying on memory

A **persistent, non-dismissible label pinned above every conversation thread** — not a one-time onboarding popup — reading something like *"Messages here are logged for farm business records."* Shown every time, every session, so the framing is active in the moment someone's about to type something casual, not something they saw once and forgot.

### 7.6 Resolved and Parked
**Phone number visibility — confirmed, resolved:** team members see each other's raw phone numbers, tap-to-call. The reasoning: a real practical need exists (finding a coworker quickly when people are spread across a barn, a field miles away, and running errands), and native calling was never an audited channel to begin with — unlike the messaging system (Section 7.1–7.4), a phone call has no content to log, so showing the number doesn't reopen any of the concerns that led to rejecting native SMS deep-linking. Attempting to hide the raw digits while still allowing tap-to-call would add friction without any real privacy benefit, since the person's own phone call log shows the number the instant they dial anyway.

**Messaging feature — parked, not built at this time (confirmed decision):** working through the actual use case surfaced real adoption risk (would anyone use this over just texting the person's real number) against needs already met elsewhere (tap-to-call for reaching someone quickly; the existing assign/escalate/resolve HandoffEvent notes for anything device-specific). Reactivate if this becomes something farms actually ask for, or if its absence creates a real security issue (people relying on ungoverned personal texting for work communication). Full detail in Section 9.6a.

---

## 8. Consolidated Open Items List (superseded)

**This list is historical and no longer maintained.** It was accurate early in this design process, but every item here is now tracked more precisely in the per-feature deferred-items tables in Sections 9–12, which are kept in sync with the interactive diagram (`agriguardian-backend-map.html`) and are the actual current source of truth. Several items below are already resolved as of later work in this document but were never removed from this list — don't treat this section as reflecting current status. Kept only for historical continuity, not as a working reference.

1. ~~Invitation: duplicate-invite handling~~ — resolved, Section 5
2. ~~Invitation: Owner's ability to revoke a pending invite~~ — resolved, Section 5
3. ~~Invitation: does incomplete MFA block all access or only portal-surface actions~~ — resolved, Section 5
4. Whether account-security signals ever join the hygiene score — still open, Sections 9.1/9.6
5. Owner's own notification-email change process — still open, Section 10.1
6. ~~Phone number visibility scope in Settings~~ — resolved, Section 7.6
7. ~~Messaging structure: free-form vs. context-tied vs. both~~ — moot, Messaging feature parked entirely, Section 9.6a
8. Parked: AgriGuardian-managed email service — still parked, Section 10.2
9. Parked: casual "quick chat" side-channel — still parked, Section 7.2 (now folded into the broader Messaging-parked decision, Section 9.6a)

---

---

## 9. App Branch — Full Feature Breakdown

**Structure:** Backend = three sections (Farm view, Infrastructure and shared services, Vendor dashboard). Farm view = two surfaces (App, Web dashboard/Portal). This section fully builds out **App** — the daily-use, farmer-facing surface — grounded in what the current static prototype actually does (see `/mnt/project/FILE-MAP.md`), plus everything decided in this document.

**Standing structural rule:** every feature branch gets its own deferred-items sub-level by default, even when currently empty, rather than deferred items living only in a separate list. Each deferred item is tagged **Quick**, **Deep-eval**, **Parked**, or **Expert** — the same triage system used in Section 8 and in the interactive backend map (`agriguardian-backend-map.html`), so the document and the diagram always stay in sync. **Expert** is distinct from Deep-eval: Deep-eval means more of our own thinking will resolve it; Expert means the question genuinely needs an outside cybersecurity or compliance professional, not just more internal discussion.

### 9.1 Dashboard
**Prototype today:** `dashboard.js` — summary cards, alerts, nav shortcuts. Pulls from `risk.js`, `networks-data.js`, `permissions.js`.
**Backend needs:** Database, Backend API — aggregate device/network/app risk and hygiene score, role-scoped (Farm Hand/Viewer see neutral-tier only, per the least-privilege model).
**Known prototype defect to fix in production build:** `renderHygieneScore()` is currently dead code — computed but never wired into any screen.
**Correction — hygiene score math:** the current `computeHygiene()` implementation is a **demo-only placeholder** — a straight percentage average of "green" ratios across password, update, network, app, and backup categories, with no distinction in weight between a red finding and a yellow one. This is not the intended final design. The real weighted scoring algorithm (including whatever the actual red-vs-yellow weighting should be) is undecided and lives under the Production-grade hygiene scoring item in Section 10.3, Infrastructure → Integrations — deliberately, since the real formula depends on richer data (CVSS, NVD, manufacturer lifecycle) that only exists once that infrastructure work is done.
**In-app notifications landing area — confirmed design, resolved.** This lives here, on Dashboard, rather than as its own separate feature or nav tab — a small notification icon/badge, tapping it opens a single chronological list combining SecurityAlert items relevant to that person's role (Section 9.6) with business/informational notices (the things that used to be email-only for App-only roles, Section 6.6). Each entry shows what happened and when; tapping one shows more detail inline or navigates to the relevant screen (a device, a network item). No separate "Notifications" tab — Dashboard is already the "here's what needs your attention" screen, and a second version of that same concept would just compete with it rather than add anything.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Fold security alerts into hygiene score? | The hygiene score already exists and works today (Section 6.5's math is unaffected). This is only about whether a new signal — account-security alerts like failed logins — should also feed into that same score, or stay a separate indicator. **Confirmed: stays open by necessity, not indecision** — the real weighted scoring formula itself is deferred to Section 10.3 (Infrastructure → Integrations), so there's no formula yet to decide how this signal would even weigh into. Revisit once 10.3 resolves and real alert-frequency data exists, not before. | Deep-eval |

### 9.2 Devices and Network
**Prototype today:** `devices-list.js`, `devices-detail.js`, `devices-resolve.js`, `networks.js`, `networks-data.js` — device/network inventory, risk scoring, assign/resolve/escalate workflow.
**Backend needs:** Database, Backend API, Integrations — vulnerability lookups (NVD/CISA) must move server-side rather than the current direct-browser calls.
**Known prototype defect to fix in production build:** archive/delete/add-device actions are not yet RBAC-gated (flagged in `permissions.js`) — this must be closed before real users touch it, not carried forward as-is.
**Additional confirmed depth (previously undocumented):**
- Every device carries its own **HandoffEvent** history (Section 3.1) — not just a single assign/resolve flag.
- Escalation is a **structured object** (`target`, `targetName`, `reason`, `note`, `by`, `date`) with a **confirmed fixed reason taxonomy** (Section 3.1) — not free text.
- Three distinct workflows exist beyond the basic resolve/escalate pair: **take ownership** (Owner/Manager claiming an assigned device directly), **send back to technician** (Manager-only, returns an escalated issue with a required note), and **partial-resolve-and-escalate** (a single combined action that records a partial fix *and* an escalation together, appending two HandoffEvents at once).
- **Role visibility is more granular than a flat "Farm Hand/Viewer see neutral tier" rule:** Farm Hand sees that an issue *exists* without the detailed risk grade; Viewer sees *only* issues specifically assigned to them, not the full list. These are two different visibility rules, not one shared "neutral tier."

**Device classification — usage pattern vs. ownership (two independent fields, not one):**
- **`usage_pattern`** (per-device: **Dedicated**, **Mixed-use**, or **Shared**) is the field that actually drives security treatment. This replaces an earlier "farm-owned vs. BYOD" framing that turned out to measure the wrong thing — on a family farm, a phone the farm technically owns is often used for someone's entire personal life anyway, so ownership doesn't reliably predict risk. What predicts risk is whether personal activity (personal apps, personal accounts, anything outside farm work) happens on the same device as the farm session. A dedicated device is one the farm can meaningfully influence; a mixed-use device inherits whatever risk exists on its personal side, regardless of who's on the receipt.
- **Shared — confirmed, a distinct third category, not a variant of the other two:** a device like a barn tablet used by multiple different Farm Hands during their shifts doesn't have a single person to bind a login to, so it's exempted from device-binding entirely (Section 9.5). Instead: every person authenticates individually each time they pick it up, with a short idle timeout that logs the session out before the next worker grabs it. This is deliberately different from Dedicated/Mixed-use's per-person device-binding model — the goal for a Shared device was never "which device is this," it's "who's using it right now," and forcing it into the personal-device model would just create workflow-blocking friction (the first person to touch it would end up "owning" it, and everyone else would get locked out trying to do their job) without any real security benefit, since the whole point of a shared device is that many people are supposed to use it.
- **Shared devices are always farm-owned — confirmed.** A device can only genuinely be Shared in this sense if the farm owns it; a personally-owned phone can't be "shared" among multiple workers the same trusted way. This means `ownership` and `usage_pattern = Shared` aren't fully independent after all — Shared implies farm-owned, while Dedicated and Mixed-use can be either.
- **Shared devices still get registered, just not bound to a person — confirmed.** The tablet itself is a known `Device` entity in the system (the same entity already tracked here for hygiene/risk purposes), which is what lets the system distinguish "this is our legitimate shared tablet" from an unknown device attempting logins. It simply has no single login bound to it the way a Dedicated device does.
- **`ownership`** (per-device: farm-owned or personal) is kept as a **separate field with zero bearing on security treatment** for Dedicated/Mixed-use devices — useful for asset tracking and insurance purposes, not used anywhere in risk scoring or access control. (Shared devices are the one case where ownership and usage pattern are linked, per above.)
- Confirmed real-world implication: whatever gets tracked about a device must be visible to the person using it — never covert monitoring, consistent with the principle already established elsewhere in this design.

**Camera input for device fields — confirmed design, resolved:** scan a manufacturer sticker to extract brand, model, and serial number, rather than typing them in. Up to **3 scan attempts** — if all fail (a worn/dirty sticker, bad lighting, the real conditions of a barn or field), a clear message directs the person to enter the fields manually instead, avoiding an indefinite retry loop. On a successful scan, the extracted fields are **not auto-accepted** — the person must explicitly verify each one matches the physical sticker before it's saved, since OCR can confidently return a plausible-looking but wrong value (0/O, 1/I/l confusion especially, common in serial numbers). This is an honor-system check, not a technical safeguard, but proportionate: the person doing this (a Self-Serve Owner, or an Implementation Specialist during Managed setup) is invested in getting their own farm's inventory right, and a wrong serial number is a data-quality issue, not a security one. **The photo itself is never stored** — captured only to extract the text, then discarded immediately, consistent with the "don't retain more than needed" principle already running through this design (reason-gated message review, minimal-content notifications, etc.).

**Precise GPS location — confirmed design, resolved:** an **optional** field, added at the person's discretion, not required for every device. The existing free-text location label (predefined options plus custom text) is enough for devices that are inherently easy to find — a camera mounted at the barn door isn't going anywhere and is visually obvious. GPS coordinates earn their place specifically for devices that can become genuinely hard to locate later despite a good label — a ground moisture sensor, say, that gets swallowed up once crops grow tall enough to obscure it. Captured as a **one-time "capture current location" action** (the person stands at the device and taps a button, using the phone's GPS to log that single point) — deliberately not continuous tracking. This is metadata about where a piece of equipment sits, not surveillance of a person's movements, and keeping it a one-time snapshot rather than ongoing tracking keeps it honestly in that category. **The same action needs to be re-triggerable, not a permanent, unchangeable snapshot** — if a device gets physically relocated (moved between fields, repositioned for a new season), the person needs to be able to stand at its new spot and re-capture, overwriting the old coordinate. Otherwise stale location data becomes actively misleading rather than just unhelpful — worse than having no GPS data at all, since it confidently points someone to the wrong place.

**Remote wipe — confirmed decision, will not be built:** de-registration (Section 9.5) already fully solves the security problem remote wipe would exist for — the moment a device is de-registered, it can never authenticate as that person again, across all three device classifications (including Shared, where nothing was ever bound to a person to begin with). Remote wipe would only add downside on top of a problem that's already solved: for a Mixed-use device specifically, it would destroy someone's actual personal data (photos, everything else) with zero additional security benefit over de-registration alone. This is a permanent decision, not a "not now" — there is no scenario identified where de-registration alone is insufficient. **Device binding itself (registration, de-registration authority, shared-device handling) is fully resolved — see Section 9.5.**

**Mixed-use device controls — confirmed, resolved:** two controls apply specifically to Mixed-use devices (not necessarily Dedicated, which is a more controlled environment already): an **app-level PIN/biometric lock**, and a **shorter idle timeout**. The PIN/biometric lock is the one that matters most — the core problem with a Mixed-use device is that its baseline security sits outside the farm's control (a family member might leave it unlocked, the OS-level screen lock might be weak or absent), and an app-level lock is the only one of the candidate controls that doesn't depend on trusting something about the device the farm can't actually verify. A shorter idle timeout pairs naturally with it, reducing the exposure window directly, same logic already used for Shared devices. **Stricter/repeated MFA enforcement was deliberately excluded** — MFA already happens at login, and re-triggering it constantly during ordinary use adds real friction without much added benefit once the PIN lock and shorter timeout are in place. If anything MFA-adjacent is ever warranted, it should be reserved for genuinely high-stakes actions specifically, the same restraint already applied to Portal step-up, not blanket re-challenging.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Device detail page accordion rebuild | Match the collapsible-section treatment the network detail screen already has. | Quick |
| Production-grade hygiene scoring | Canonical decision now tracked under Section 10, Infrastructure → Integrations — the App only consumes this data, it doesn't own the decision. | See Infrastructure |
| Shared device Portal access | Should a Shared device be restricted to App access only, with Portal work requiring a Dedicated/personal device — or is step-up re-authentication sufficient protection even on a device many people physically handle throughout the day? **Flagged for outside cybersecurity/compliance consultation, not just more internal discussion.** Relevant frameworks to bring to that conversation: **NIST SP 800-63** (assurance levels scaling with sensitivity — exactly the App-vs-Portal distinction here), **NIST SP 800-207** (Zero Trust — device trust as its own signal, the same pattern behind "conditional access" in enterprise identity systems like Entra ID/Okta), and **PCI-DSS** — since Subscription and Billing now touches real payment processing (Section 10.4), this may not be a design preference at all but a binding compliance requirement about shared devices accessing cardholder-data environments. That last point is why this needs a professional, not just more of our own thinking. **Same underlying need as the PCI-DSS compliance confirmation item (Section 10.4)** — worth bringing both to the same consultation. | Expert |

### 9.3 Apps and Backups (view)
**Prototype today:** `apps.js` — Apps inventory and 3-2-1 Backup tracker, currently full-edit, Owner-only, in-app.
**Backend needs:** Database, Backend API — pulls from Portal-managed business-account data (Section 6, decided: edit moves to Office Manager/Owner in the Portal; App becomes read-only).
**Known prototype defect to fix in production build:** today's in-app edit access must be actively removed/redirected when this migrates, not just left in place alongside the new Portal edit path.

**Deferred items:** none identified yet. Sub-level present per the standing structural rule, currently empty.

### 9.4 Team and Roles
**Prototype today:** `team.js`, `settings.js`, `permissions.js` — roster, invite/edit/archive, permission checkboxes, custom role handling.
**Backend needs:** Database, Backend API, Authentication and identity — the full Person/PersonFarmMembership/RoleAssignment/PermissionGrant/Invitation model from Sections 2–5.
**Known prototype defect, now resolved by design rather than needing a code fix:** the seed-data identity conflict (Sarah Tully appearing as both Technician and Farm Hand) stops being a bug once multi-role assignment is real — that's just two legitimate RoleAssignments on one Person.

**Deferred items:** none — the one item previously here (messaging structure) is resolved by the Messaging feature being parked entirely (Section 9.6a).

### 9.5 Session and Login
**Prototype today:** `session.js`, `auth-flow.js`, `auth-ui.js` — currently a hardcoded demo code (`'123456'`), in-memory `currentUser`, no real password storage.
**Backend needs:** Authentication and identity, Communications — real password hashing, real MFA, real SMS-based phone verification, surface-scoped sessions with step-up support.
**Known prototype defect to fix in production build:** everything about identity currently resets on page reload — this entire feature is a placeholder, not a partial implementation.
**Ownership clarification — the step-up mechanism:** the "Switch to Account Admin" trigger and the password/MFA re-authentication challenge that follows both belong entirely to this feature, not to Web dashboard. It's one mechanism, not two — the trigger and the challenge are a single authentication event that happens to gate entry into Portal. Every Web dashboard feature (Section 11) *requires* the resulting elevated session (`auth_level = elevated`, Section 3.1) as a precondition, the same way they already depend on Authentication and identity generally, but none of them own the mechanism itself.

**Device binding — confirmed design, fully resolved:** a device gets registered naturally at first login (the device used to accept the invitation and set up credentials/MFA); a login attempt from a different device is blocked even with correct password and MFA; a lost/replaced device or departing employee gets handled by **de-registering** the device rather than remote-wiping it (Section 9.2's Remote wipe decision — de-registration is the complete answer, wipe adds no security value on top of it). Applies to App only — Portal relies on its existing step-up mechanism instead. **Device count and shared devices:** personal devices (Dedicated/Mixed-use) are strictly one at a time; Shared devices are exempted from device-binding entirely, each person authenticating individually per use instead. **De-registration authority, confirmed:** the Owner, or anyone holding the new Onboarding/Offboarding Administrator role (Section 2.4), can de-register a device — the same authority that covers full offboarding generally (revoking role assignments, this, and initiating invites on the onboarding side). **Self-reporting, confirmed:** this doesn't need a dedicated technical flow — someone who's lost their phone just calls the Owner or Administrator directly (tap-to-call, Section 7.6 already supports this), who then de-registers the device with a required reason, same pattern as any other sensitive action. **Risk-exposure during the gap, resolved by reframing:** de-registration was never protecting against a stranger who finds or steals a lost phone — whoever has the phone still needs the password and to pass MFA to do anything as that person, from a new login. The actual exposure during any gap is whether the app session was already *open* on the lost device, which is a **session-timeout** question, not a device-binding one. De-registration's real job is preventing a *future* login attempt — which matters most for the departing-employee case, not the lost-phone case.

**Deferred items:** none — the one item previously here (Owner notification email change) is now moot; `notification_email` was eliminated entirely for everyone with a login (Section 6.7).

### 9.6 Alerts
**Prototype today:** no equivalent exists — this is new backend-era functionality, not a prototype migration.
**Backend needs:** Database, Communications — SecurityAlert and NotificationRoute entities from Section 6.
**Scope correction, fully resolved:** email is eliminated as a delivery channel for **everyone with any login at all** (Section 6.7) — not just App-only roles. This feature provides the underlying `SecurityAlert` data; the actual landing screen someone checks after getting that SMS lives on **Dashboard** (Section 9.1) for App users, or Oversight, Review, and Audit Trail (Section 11.6) for Portal-only users.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Fold security alerts into hygiene score? | Same open question as 9.1 — stays open by necessity until Section 10.3's real scoring formula exists, not a decision being avoided. | Deep-eval |
| AgriGuardian-managed email service | Canonical decision now tracked under Section 10, Infrastructure → Communications — it's a build-vs-buy infrastructure call, not an App-feature nuance. | See Infrastructure |

### 9.6a Messaging — PARKED
**Status: parked, not being built at this time.** The full design work in Section 7 (in-app messaging, MessageReview, the persistent logging label) remains intact below as reference, but this is a deliberate decision not to build it now, not an oversight.

**Why parked:** working through the actual use case (Section 7's design) against realistic adoption (would anyone actually use this over just texting the person's real number, which is faster and more familiar) surfaced a real risk — the feature could sit unused while people quietly default back to ungoverned personal texting anyway, meaning the engineering effort produces neither adoption nor the governance it was meant to provide. The two genuine needs identified along the way are already met elsewhere: wanting to reach a coworker quickly is served by tap-to-call (Section 7.6); anything that should attach to a specific device's record already has a home in the existing assign/escalate/resolve workflow with mandatory HandoffEvent notes (Section 9.2) — a stronger, more purposeful place for device-specific communication than a loosely-tied chat message would be.

**Reactivate if:** (1) this is something farms actually ask for, or (2) its absence becomes a real security issue — specifically, evidence that people are relying on ungoverned personal texting for work communication in a way that creates the exact risk this feature was originally meant to prevent. Until either of those happens, this doesn't get built.

**Deferred items:** none tracked — this whole feature is parked, not mid-decision.

### 9.7 Reports and Audit
**Prototype today:** `reports.js`, `report-viewers.js` — client-side PDF generation via `jsPDF`; `audit.js` — audit log storage/render.
**Backend needs:** Database (AuditLog is append-only, no update/delete path — Section 3.1). PDF generation can likely stay client-side for the App; server-side generation only becomes necessary if Vendor Dashboard needs bulk/cross-farm reporting later.
**Considered and dropped:** additional report types (project scope, technical/non-technical assessment variants) beyond the existing Hygiene and Activity reports — no clear use case emerged when actually examined, so this isn't being pursued rather than left open indefinitely.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Server-side bulk reports | Only needed if the Vendor dashboard requires generating reports across many farms at once. | Deep-eval |

### 9.8 Vulnerability Checks
**Prototype today:** `vulnerabilities.js` — direct browser calls to NVD (API key in a plain JS variable) and CISA (with a public CORS-proxy fallback).
**Backend needs:** Integrations (Infrastructure) — both lookups move server-side; NVD key stored encrypted per farm; CISA feed cached and served internally instead of depending on a third-party proxy.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Production-grade hygiene scoring | Canonical decision now tracked under Section 10, Infrastructure → Integrations — same item as 9.2. | See Infrastructure |

### 9.9 Accessibility
**Prototype today:** `accessibility.js` — large/XL text scaling, a full high-contrast stylesheet override, reduced motion, and colorblind mode. Confirmed real and substantial, not a stub — this was missing from earlier passes of this document entirely.
**Backend needs:** Database, Backend API — preferences are person-level, not device-local (see below), so this needs real persistence, not just minimal backing.
**Known prototype defect to fix in production build:** every setting here is session-only — `a11ySettings` resets on reload, never persisted anywhere, for anyone.
**Preference persistence — confirmed:** settings sync to the **person**, not the device. Reasoning: for someone who depends on large text or high contrast to use the app at all — not as a convenience — losing that setup every time their phone gets lost, replaced, or swapped would be a real regression for exactly the population this feature exists to help. This holds regardless of how the separate device-count/device-binding question (Section 9.5) eventually gets resolved — even under the strictest possible one-device-at-a-time policy, devices still get replaced as a normal event, so preferences need to survive that regardless.

**Deferred items:** none — resolved.

### 9.10 Internationalization
**Prototype today:** `lang-data.js` (1,290 lines — the single largest file in the entire prototype), `set-lang.js` (479 lines — applies a language switch at runtime, including reapplying translations to cloned form elements), and `core.js`'s `t()` lookup function plus the `currentLang` global. A full bilingual EN/ES system covering every screen, form, and JS-generated string. Confirmed real and substantial, not a stub — flagged as missing from this document during an earlier completeness review but never actually added until now.
**Backend needs:** Database, Backend API — same pattern as Accessibility: a person-level preference, not device-local.
**Known prototype defects to fix in production build:** `currentLang` is session-only and resets on reload, same issue as Accessibility's settings. The prototype's own `FILE-MAP.md` also flags real translation-system defects worth carrying forward as engineering hygiene, not design decisions: duplicate keys in the `LANG` object (must dedupe, keeping the last occurrence, after any future additions), roughly 110 orphaned English-only keys, and some hardcoded English strings elsewhere in the app that bypass the translation system entirely.
**Preference persistence — confirmed, same reasoning as Accessibility (9.9):** language preference syncs to the **person**, not the device. Someone who needs Spanish, not English, to actually use the app shouldn't have to reselect it every time their phone changes — same logic, same conclusion, independent of the Section 9.5 device-count question.

**Deferred items:** none — resolved alongside Accessibility.

---

## 10. Infrastructure Branch — Deferred Items

Infrastructure's seven sub-branches (Database, Backend API, Authentication and identity, Communications, Integrations, Hosting and secrets, Billing and payments) don't get a full feature-by-feature breakdown yet — per standing decision, that level of detail gets added only as real conversations produce it, not pre-emptively. The items below are the real items to surface so far, several moved here from an App or Web dashboard feature where they had been living under a feature-level label rather than their actual infrastructure home. Each affected feature keeps a "See Infrastructure" pointer card rather than a duplicate entry, so there's one place status/details actually live.

### 10.1 Authentication and Identity
**No deferred items.** The one item previously here (Owner notification email change) is now moot — `notification_email` was eliminated entirely for everyone with a login, App or Portal, Owner included (Section 6.7). There was never a mechanism left to design.

### 10.2 Communications
| Item | Note | Tag |
|---|---|---|
| AgriGuardian-managed email service | A reseller-based professional email add-on (Google Workspace/Microsoft 365 under the hood, Section 6.8) — reframed as a cyber-hygiene mission (moving farms off risky personal webmail), not just a revenue idea, though revenue is a reasonable side effect. Referenced from 9.6. | Parked |

### 10.3 Integrations
| Item | Note | Tag |
|---|---|---|
| Production-grade hygiene scoring | Replace today's demo-only percentage-average placeholder with real CVSS scores, NVD data, manufacturer lifecycle APIs, and network topology — including designing the actual weighting/aggregation formula itself (e.g. how a red finding should weigh against a yellow one), which hasn't been decided yet. Feeds Devices and Network (9.2) and Vulnerability Checks (9.8) in the App. Referenced from both. | Deep-eval |

### 10.4 Billing and Payments
**New branch, identified while building out Web dashboard's Subscription and Billing feature (Section 11.2).** Upgrade/downgrade/cancel means actual money moving — a payment gateway, invoicing/receipts, and PCI-DSS compliance considerations, none of which fit naturally under Integrations (which is specifically security data feeds — NVD, CISA — a different compliance domain entirely from handling payments). Deliberately kept as its own branch rather than folded into Integrations, so the two very different regulatory contexts (vulnerability data vs. financial transaction processing) don't blur together.

**Architecture — confirmed:** **Stripe** (or an equivalent reputable gateway), using its **hosted tokenization** (Stripe Elements/Checkout) rather than handling raw card data directly. Building payment processing in-house was never a real option at this company's size — real payment infrastructure (card networks, fraud detection, chargebacks, international compliance) takes years and dedicated teams; a reputable gateway is the standard default. Stripe specifically fits well because it has built-in subscription/recurring-billing support out of the box, matching what Subscription and Billing actually needs. With hosted tokenization, **raw card numbers never touch AgriGuardian's own servers at all** — the card form is rendered by Stripe inside the page, the data goes straight to Stripe, and AgriGuardian only ever receives a token. This collapses PCI-DSS scope to its lightest tier (SAQ A) by architecture, not through careful manual handling.

| Item | Note | Tag |
|---|---|---|
| PCI-DSS compliance confirmation | Formal confirmation that the Stripe-hosted-tokenization architecture actually satisfies PCI-DSS for this specific setup is a real compliance sign-off, not something to decide from best-practice knowledge alone. **Same underlying need as the Shared device Portal access item (Section 9.2)** — both are genuinely the same kind of outside cybersecurity/compliance consultation, worth bringing to the same professional in one engagement rather than as two separate conversations. | Expert |

Database, Backend API, and Hosting and secrets have no deferred items yet — genuinely blank, not under-tagged. They'll get entries here the same way, only once a real one comes up. Note also: Hosting and secrets' vault scope explicitly includes third-party credentials stored in Business Apps and Accounts (Section 11.3 — banking logins, Amazon business logins), not just AgriGuardian's own internal API keys.

---

## 11. Web Dashboard (Portal) Branch — Full Feature Breakdown

**Structure:** Web dashboard is the Account Admin Portal side of Farm view, alongside App (Section 9). Unlike App, **there is no prototype equivalent for any of this** — the current static prototype has no portal surface at all. Every feature below is new backend-era design, built from what's already been decided in Sections 2–8, not migrated from existing code.

**On the step-up mechanism:** every feature in this section requires the Owner's elevated session (`auth_level = elevated`) to be active, but none of them own that mechanism — the "Switch to Account Admin" trigger and the re-authentication challenge belong entirely to Session and Login (Section 9.5, App). Web dashboard consumes the result; it doesn't produce it.

### 11.1 Farm Identity and Account Settings
**Purpose:** Farm name, immutable account number, billing/contact email, physical address, subscription tier (view) — the Owner-editable fields defined in Section 2.2's Owner portal bundle.
**Backend needs:** Database, Backend API, Authentication and identity (the Portal itself requires step-up re-authentication to enter at all, per Section 2.3).
**Deferred items:** none yet.

### 11.2 Subscription and Billing
**Purpose:** View plus manage (upgrade/downgrade/cancel) — the primary domain for the Bookkeeper role (Section 2.4); Owner can also act here. Also where **seat/user count limits** are surfaced (view-only, plan-derived — not independently editable, since they come from the subscription tier itself). This detail was discussed in an early conversation about the Owner's portal bundle but never actually made it into this document until now — a genuine gap, not a relocation.
**Backend needs:** Database, Backend API, Communications, Authentication and identity, **Billing and payments** (Section 10.4 — actual payment processing, new Infrastructure branch identified from this feature's requirements).
**Workflow correction:** the earlier design only specified "notify the Owner," which read as email-only — that contradicts the low-trust-email principle from Section 6.7 (email should never be the sole channel for anything urgent). A subscription cancellation is exactly the kind of event that principle was written for: someone who never sees the farm's security posture unilaterally shutting off the service the Owner depends on. This should use the same **urgent delivery tier** as everything else in Section 6.2 — in-app push, SMS, and email together, not email alone. It should also create a **persistent entry in Oversight, Review, and Audit Trail (Section 11.6) requiring explicit acknowledgment**, not just a transient notification the Owner could miss or dismiss without ever seeing it.
**Deferred items:** none yet.

### 11.3 Business Apps and Accounts
**Purpose:** The full-edit counterpart to what the App shows read-only (Section 9.3) — banking, feed/seed ordering, Amazon business, MFA tracking, renewal/cost. Office Manager's primary domain (Section 2.4); Owner can also edit.
**Backend needs:** Database, Backend API. This is the canonical source of truth — the App's Apps and Backups (view) feature reads from here, never the other way around.
**Deferred items:** none yet.

### 11.4 Account Administration for People
**Purpose:** Broadened from an earlier, narrower scope of "Portal-only roles" — this feature now covers **sensitive account-level settings for any person, regardless of which surface their role lives on.** The unifying logic: these are all actions that need the Owner's Portal step-up specifically, not day-to-day role/permission management (that stays in the App's Team and roles, Section 9.4). Concretely, this feature covers:
- Viewing and managing who currently holds the Bookkeeper and Office Manager roles.
- Granting or revoking **any** `PermissionGrant` (Section 3.1) — MessageReview (Section 7.4) was the originally planned first concrete example, though that's now parked alongside the Messaging feature itself (Section 9.6a); the entity itself remains general (any `resource_type`, any one-off extra beyond a role's default bundle), and this feature is where all of it gets managed whenever a real example does need it. Every grant here carries its mandatory reason and lands in the audit trail (Section 11.6), same as any other account-administration action.

**Note — scope correction:** an earlier version of this feature also covered setting/changing any person's `notification_email`. That field was eliminated entirely (Section 6.7), so this capability no longer applies — there's nothing left to manage there, for anyone.

**This is a management view only — it does not have its own invite mechanism.** Confirmed decision: invitations for any role, App or Portal, go through the one unified Invitation flow in Section 5. This feature is where the Owner sees and adjusts account-level settings for people who already exist, not where an invite gets sent.
**Backend needs:** Database, Backend API, Authentication and identity.
**Deferred items:** none — Section 5.1 (the invitation edge cases that apply here, since the flow is shared with the App) is now fully resolved: new invite supersedes old, Owner can revoke with a required reason, and incomplete MFA blocks all access with a 10-day auto-cleanup for abandoned enrollment.

### 11.5 Notification Routing
**Purpose:** Configuring `NotificationRoute` entries (Section 6.6) — role-based CC (e.g., the Bookkeeper automatically copied on billing changes) or ad hoc external recipients (e.g., an outside auditor), each requiring a reason and, for external recipients, a recommended expiration.
**Backend needs:** Database, Communications.
**Deferred items:** none yet.

### 11.6 Oversight, Review, and Audit Trail
**Purpose:** The step-up-gated review queue for `SecurityAlert` (Section 6.4) — fully active — and `MessageReview` (Section 7.4), which is **parked alongside the Messaging feature itself** (Section 9.6a) and not being built until/unless that's reactivated. **Plus general audit-trail browsing scoped to Portal-relevant events** — who changed the billing email, when a permission grant was issued, when the subscription was last modified, changes made in Account Administration for People (Section 11.4). Also carries **persistent, acknowledgment-requiring entries for Bookkeeper-initiated subscription cancellations or downgrades** (Section 11.2) — these are urgent enough to need a confirmed "the Owner saw this," not just a passive log line. This is distinct from the App's Reports and Audit (Section 9.7), which covers device/network hygiene reporting, not account-administration history. All of it draws from the same underlying `AuditLog` (Section 3.1) — this feature is simply the Portal-scoped lens onto it, the same way Reports and Audit is the App-scoped lens.
**Backend needs:** Database, Authentication and identity, Communications.
**Step-up scope — confirmed, resolved:** step-up gates entry to Portal **as a whole**, not per-action within it. Once someone's stepped up, browsing around inside — including just looking at the log-only SecurityAlert feed or the audit trail — doesn't require a second gate. Re-checking on every click would just be re-litigating trust already granted at the door; the step-up's actual job is deciding whether someone's in Portal at all, not micromanaging what they look at once they're there. This was deliberately left open earlier, before Web dashboard had real shape (real billing/PCI-scoped payment data, Account Administration for People, the audit trail itself) — revisited now that it does.

### 11.7 Managed Email Administration (Parked)
**Purpose:** Creating farm mailboxes, assigning them to people, billing — the administrative half of the parked AgriGuardian-managed email idea (Section 6.8). Daily use (the lightweight SSO access point) lives in the App, not here — this feature is purely the admin side.
**Backend needs:** Communications, Backend API.
**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Whole feature | Parked pending the build-vs-reseller decision already noted in Section 6.8 — not worth detailing further until that's resolved. | Parked |

---

## 12. Vendor Dashboard Branch — Initial Feature Breakdown

**Structure:** Vendor dashboard is the AgriGuardian-staff-facing side of the backend, confirmed as the "technician-only backend" referenced in the original business plan. Unlike App and Web dashboard, this branch is genuinely new territory — most of what follows was identified in this session, not carried forward from prior design work, and should be expected to keep developing as real questions surface (confirmed explicitly when the Managed/Self-Serve distinction was discussed).

### 12.1 Staff Identity and Access Model
**Confirmed as its own genuine gap, not a minor missing detail:** everything built so far in this section describes *what* Vendor dashboard's users can do (client roster management, Implementation Specialist write-access, risk monitoring), but never who they are as system identities, how they authenticate, how they get onboarded, or what session/device security applies to them. This deserved its own dedicated identity model, the same way Section 2 built one for the farm side — not something to bolt onto the existing feature descriptions after the fact.

**Why this arguably needs *stricter* treatment than anything designed for the farm side, not the same or looser:** a compromised Vendor dashboard account has a much larger blast radius than a compromised farm account. One farm's Owner account being breached exposes that one farm; one Internal Admin account being breached potentially exposes every farm on the platform.

**Staff are a structurally separate entity from `Person`, confirmed — not a flag on the existing model.** `Person` (Section 3.1) was deliberately built farm-agnostic specifically to allow someday belonging to multiple farms — but Internal Admin doesn't belong to any farm at all, and Implementation Specialist's relationship to a farm is fundamentally different in kind (temporary work assignment, not membership). Stretching `Person` to also cover "works for the vendor across every client" would blur two genuinely different concepts under one entity. Keeping staff in their own table is also a real defense-in-depth wall: a breach of one population's identity table doesn't automatically compromise the other — the same instinct already behind separate App/Portal session tokens and the separate `PlatformSecurityEvent` table.

**New entities:**
- **`VendorStaff`** — name, contact info, `staff_role` (Internal Admin / Implementation Specialist — its own small role catalog, separate from the farm-side one in Section 2.4), status. Not a `Person`.
- **`StaffFarmAssignment`** — the mechanism that makes "Implementation Specialist access is scoped only to farms currently assigned to them" (Section 12.3) actually real, rather than just a sentence. Internal Admin doesn't need this at all — their access is blanket by design.

**Flagged, not yet resolved:** `AuditLog` (Section 3.1) currently assumes every actor is a `Person`. Now that `VendorStaff` exists as a separate entity, every log entry needs to reference *either* a Person *or* a VendorStaff — a real technical detail to work out, not a blocker to the identity-model decision itself.

**Staff authentication method — confirmed, resolved: a real company identity provider (Google Workspace, Okta, or similar), not the farm-side phone+password+MFA model.** The reasoning: phone+password+MFA exists for farm users specifically because they have no existing corporate identity to lean on — a Farm Hand's phone is genuinely the only trustworthy anchor available. AgriGuardian's own staff are the opposite case: W-2 employees or contractors who either already have or should have a company identity of some kind. Reusing the farm-side model for staff would mean building a second, bespoke authentication system for internal use only, recreating what mature identity providers already do well (employee lifecycle management, centralized MFA enforcement, instant deprovisioning on departure, conditional-access and device-compliance features built in). This also reinforces the `VendorStaff`/`Person` separation at the infrastructure level, not just the data-model level — staff authenticate through a genuinely different system, not just a different table using the same login mechanism.

**Staff onboarding mechanism — confirmed, resolved: no bespoke flow needed, follows through directly from the identity-provider decision.** Two-step model, mirroring how any company onboards a new employee:
1. **The identity-provider account is the real onboarding event** — when AgriGuardian hires someone, IT/HR creates their Google Workspace or Okta account the normal way, entirely outside this system. That's the actual "this person now exists" moment, same as any new hire getting a company email.
2. **An Internal Admin creates the corresponding `VendorStaff` record** — linking to that already-existing identity-provider account (selected from the company directory, not typed freeform) and assigning `staff_role` (Internal Admin or Implementation Specialist), plus any initial `StaffFarmAssignment`s if starting as an Implementation Specialist.

This doesn't need its own invitation system the way the farm side does (Section 5), because the reason that flow exists — a farm has no pre-existing relationship with AgriGuardian to lean on, so it has to create identity from scratch via SMS and credential setup — doesn't apply to staff. The identity-provider account already establishes who they are before this system is ever involved; the `VendorStaff` record just recognizes an existing identity and attaches a role, it doesn't create one.

**Staff session/device security — confirmed, resolved: yes, stricter than the farm side, via the identity provider's own built-in conditional-access features, not a custom-built mechanism.** Google Workspace and Okta both ship conditional access/device-compliance policies as standard — requiring a managed device, enforcing MFA on every login rather than once, shortening session lifetimes, restricting by location, blocking unrecognized devices entirely. This is exactly the stricter treatment the blast-radius argument called for, already mature and well-documented in these products. This reframes the work from "design a new security model" to "configure the identity provider's existing settings once a specific provider is selected" — an operational/IT setup task, not a further design question. Genuinely different in kind from the PCI-DSS and Shared-device-Portal-access items (Section 9.2/10.4) — those needed an outside compliance professional's judgment call; this is a standard, well-trodden configuration task any competent admin of that platform can execute directly.

**Section 12.1 is now fully resolved** — every question this thread raised (staff-as-separate-entity, authentication method, onboarding mechanism, session/device security) has a confirmed answer.

### 12.2 Client Roster and Service-Level Management
**Purpose:** Viewing every farm client, Managed or Self-Serve, and changing a farm's `service_level` (Section 3.1) over time — confirmed that a farm can move in either direction, not a permanent choice made at signup.
**Backend needs:** Database, Backend API.
**Deferred items:** none yet — this branch is too new to have surfaced real open questions beyond its basic existence.

### 12.3 Implementation Specialist Operations
**Purpose:** On-site setup and ongoing support for Managed farms. An Implementation Specialist (Section 2.2) — deliberately not called "Technician," to avoid colliding with the farm-side role of the same name — needs real write access to a Managed farm's device, network, and team data, scoped only to farms currently assigned to them.
**Backend needs:** Database, Backend API, Authentication and identity.
**Write-access visibility — confirmed, resolved:** Implementation Specialist actions show the **real actor** in the farm's own audit trail — "Implementation Specialist [name] added this device" — never fabricated to read as if the Owner or Manager did it. This is the only option consistent with non-repudiation as a hard principle throughout this design; making an AgriGuardian employee's action read as someone else's would be a fabricated audit trail, not a simplified one. A Managed farm chose this service specifically to have someone else handle setup, so seeing the Specialist's name attached to that work is an accurate reflection of the service, not a confusing surprise.

### 12.4 Third-Party Risk Monitoring and Alert Relay
**Purpose:** Continuous, cross-farm monitoring of third-party feeds (NVD, CISA, potentially others later) with automated matching against **every farm's** registered device inventory, pushing relevant findings down as alerts — regardless of service tier. Distinct from the App's on-demand Vulnerability Checks (Section 9.8) — that's farm-initiated and single-farm; this is Vendor-side, proactive, and watches every farm at once. Confirmed to be largely automated — the system does the matching; human involvement is for exceptions and oversight, not a dedicated headcount-per-farm role.
**Backend needs:** Database, Backend API, Integrations, Communications.
**Coverage — confirmed, resolved: applies to Managed farms too, not just Self-Serve.** Since this monitoring is automated, there's no real cost or effort difference in extending it to every client — and the purpose of the whole product is cyber hygiene, which makes withholding a known-vulnerability alert from anyone, regardless of service tier, directly counter to that purpose. Implementation Specialist support for Managed farms is a genuinely different kind of coverage (hands-on setup and ongoing account support), not a substitute for automated feed-matching against known threats — the two aren't interchangeable.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Additional third-party feeds | Which sources beyond NVD/CISA might get added over time (other national vulnerability databases were mentioned as a possibility). | Parked |

---

*This document should be uploaded into project knowledge manually, same as delivered zips, so future sessions can reference it directly rather than relying on conversation history.*
