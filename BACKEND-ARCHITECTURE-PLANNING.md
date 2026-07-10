# AgriGuardian Backend Architecture: Planning Document

**Status:** Living design document, planning/pre-implementation stage
**Scope:** This document covers the future backend/SaaS architecture (accounts, roles, permissions, invitations, notifications, messaging). It is entirely separate from the current static prototype in `/mnt/project`, nothing here changes that codebase. This is groundwork for when real backend implementation begins.
**How decisions get made:** every "confirmed" or "decided" note in this document reflects a real call already made; see `GOVERNANCE.md` for who holds that authority and how disagreement gets resolved.
**What this document doesn't cover:** what's being built, not who's building it or when. See the domain map (`agriguardian-backend-map.html`) for staffing/effort weighting, and `PROJECT-MANAGEMENT-ROLE.md` for how work gets sequenced.
**If you're a contributor deciding what to work on:** every feature section in Sections 9, 11, and 12 is tagged (Tier 1) or (Tier 2); Tier 2 is where everyone starts (see `GOVERNANCE.md` Section 3). For how to actually get set up and submit a first change, see `CONTRIBUTOR-PITCH.md` and `CONTRIBUTING.md`, not this document.
**Reasoning behind each decision:** see conversation history for the full discussion behind every "confirmed" or "decided" note in this document.

---

**Orientation, for a first read:** AgriGuardian has three separate interfaces. The **App** is what a farm's own people use day to day, checking device and network status, resolving issues, there's a working prototype you can click through. The **Web dashboard (Portal)** is where a farm's Owner or admin staff manage billing, accounts, and oversight, a more sensitive surface reached through an extra re-authentication step ("step-up"); no functional prototype exists yet, but a visual mockup does (`portal.html`). The **Vendor dashboard** is AgriGuardian's own internal staff tool, entirely separate from anything a farm customer sees; it also has a visual mockup (`vendor.html`). Sections 9, 11, and 12 build out each of these in turn; Sections 2-8 cover the shared foundation (accounts, roles, permissions) all three depend on.

---

## 1. Core Design Principles and Backend Structure

### 1.1 Core Design Principles (apply throughout)

- **Least privilege**: access is granted deliberately, never broad-by-default. Internal Admin is the only role with blanket access, and even that is fully audited.
- **Non-repudiation**: every grant, revoke, role change, login, message, and review action is logged with actor, timestamp, and (where relevant) a reason. Nothing about access or communication should ever be unanswerable months later.
- **Defense in depth**: security boundaries are structural (separate tables, separate session scopes), not just query filters or UI restrictions.
- **Fail-safe defaults**: deny unless explicitly granted; nothing assumes trust.
- **Compute permissions live, never cache them**: this was learned the hard way in the prototype (`pendingLogin` staging bug from stale cached session state). Effective access is always resolved fresh from current role assignments and grants, never from a snapshot.

### 1.2 Backend Structure Overview

The backend is organized into three top-level sections, matching the interactive map (`agriguardian-backend-map.html`):

| Section | Status in this document |
|---|---|
| **Farm view** | Two surfaces: **App** (daily operational use, broken into features in Section 9) and **Web dashboard** (the Account Admin Portal, broken into features in Section 11) |
| **Infrastructure and shared services** | Seven named sub-branches (Database, Backend API, Authentication and identity, Communications, Integrations, Hosting and secrets, Billing and payments), scoped, with real deferred items surfacing in Section 13 as they come up |
| **Vendor dashboard** | Confirmed as the internal-only surface AgriGuardian staff use to manage and support farm clients. Starting shape identified in Section 12: staff identity and access model, client roster and service-level management, Implementation Specialist operations, third-party risk monitoring and alert relay. |

Sections 2 through 8 describe the underlying data model, permission logic, invitation flow, notifications, and messaging that both **App** and **Web dashboard** are built on. Section 9 organizes that foundation feature-by-feature for App; Section 11 does the same for Web dashboard; Section 12 does the same for Vendor dashboard.

---

## 2. Account and Role Model

### 2.1 The Farm entity and provisioning

The Farm account is provisioned externally, through a backend/service layer, at the point a farm engages the service, never through a "create my farm" flow inside the farmer-facing app. The app only ever operates against a Farm that already exists.

### 2.2 Three access tiers

**Full identity model for the first two rows (how staff exist as records, authenticate, onboard, and what session security applies) now lives in Section 12.1.** This table covers what each tier can *do*; Section 12.1 covers *who they are as system identities*.

| Tier | Who | Surface |
|---|---|---|
| Internal Admin | AgriGuardian staff | Internal admin console (Vendor dashboard), full access across all farms, provisioning, support |
| Implementation Specialist | AgriGuardian staff, narrower scope than Internal Admin | Vendor dashboard, write access to Managed farms' device/network/team data during setup and ongoing support, scoped only to farms currently assigned to them. Named deliberately to avoid colliding with the farm-side Technician role (Section 2.4), same job category, different person, different system. |
| Owner | The farm's principal account holder | App (daily, full operational) + Portal (via step-up switch) |
| Portal-only roles | Bookkeeper, Office Manager, etc. | Portal only, no login to the operational app at all |

### 2.3 Owner's dual access: step-up re-authentication

The Owner has one set of login credentials, used for daily app access. Reaching the Account Admin Portal requires an explicit, visible mode switch ("Switch to Account Admin") that triggers fresh re-authentication (password/MFA) before the portal loads. This is the same pattern as AWS root-vs-IAM or "confirm password to change billing." It avoids a second password to manage while still creating a hard security boundary. A logged-in phone left open on the app can't be used to reach account-admin functions without re-proving identity.

### 2.4 Role catalog (composable, multi-role per person)

A person can hold **more than one role simultaneously** (e.g., a bookkeeper who's also doing tech support/HR). This matches how small farms actually staff themselves. Each role has a **fixed internal key** used by all permission logic; **display labels are farm-customizable** on top (e.g., a cattle farm relabeling "Technician" as "Herdsman"), purely cosmetic, never referenced by logic.

| Role key | Surface | Apps/business-account tab |
|---|---|---|
| Owner | App + Portal | App: read-only. Portal: full edit |
| Manager | App only | App: read-only |
| Technician | App only | None |
| Farm Hand / Viewer | App only | None |
| Bookkeeper (multiple per farm allowed) | Portal only | None, billing/subscription only (view + manage: upgrade/downgrade/cancel) |
| Office Manager | Portal only | Full edit (business accounts: banking, feed/seed, Amazon business, etc.) |
| Onboarding/Offboarding Administrator (multiple per farm allowed) | Portal only | None, personnel lifecycle only: initiating invites (Section 5) and full offboarding (revoking role assignments, de-registering devices via Section 9.5) for both onboarding and offboarding by default. Not every farm needs this assigned, same optional-catalog pattern as every other role, but larger operations with real staff turnover benefit from a dedicated lifecycle role rather than routing every hire/departure through the Owner personally. |

**Effective permission = union of all assigned roles' default bundles, plus any Owner-granted one-off extras.** Where roles conflict on the same resource, **most-permissive wins** (confirmed decision, since assigning both roles is a deliberate choice).

**Two lateral-privilege rules, confirmed real in the prototype, both worth explicit backend enforcement, not just a UI dropdown filter, and both extended to close a real gap the original prototype rule didn't cover:**
- **Only the Owner can invite someone as a Manager, or grant Manager as an additional role to an existing person.** Neither a Manager nor an Onboarding/Offboarding Administrator can do this, even though the latter otherwise has full invite authority for every other role (Section 5). Restricting only "Manager" and leaving the Administrator role unrestricted would let this rule be bypassed entirely through the other role that also sends invites.
- **Only the Owner can edit, archive, or revoke role assignments for an existing Manager.** Neither a Manager nor an Onboarding/Offboarding Administrator can act on one, even though the latter otherwise holds full offboarding authority for every other role (Section 2.4).

Both close the same kind of gap: a Manager, or anyone else with broad personnel-management authority, unilaterally expanding or consolidating Manager-level access is exactly the lateral privilege move least-privilege (Section 1.1) exists to prevent. The prototype already enforces the Manager-specific half of this in two places each (the UI hides the option, and a defense-in-depth check blocks it even via a bypassed form or direct call); production needs the same two-layer enforcement, extended to explicitly cover Onboarding/Offboarding Administrator too, not just the UI-level check on the role the prototype happened to already consider.

### 2.5 Apps/business-account data location

Decided: **Portal is the source of truth and edit surface** (Office Manager and Owner-via-portal manage entries there). **The app shows this data read-only**, because hygiene score is farm-wide and needs the full risk picture. This is a change from the current prototype (today: edit-in-app, Owner-only), flagged clearly so it isn't rebuilt the old way out of habit when backend work starts.

### 2.6 Role hierarchy naming

Role hierarchy is handled entirely through the fixed catalog (2.4) plus farm-customizable display labels, **not** a separate, more elaborate role system. A farm wanting titles like "Principal Operator" or "Herdsman" gets there by relabeling an existing catalog role (e.g., relabeling "Technician" as "Herdsman"), not through a different underlying structure. There is no separate fixed role hierarchy to build beyond the catalog already defined above.

### 2.7 Full cancellation and post-cancellation records access

**Distinct from a Managed → Self-Serve `service_level` change (Section 3.1).** Switching service levels is a support-model change; the subscription and full access continue either way. This section covers **full cancellation** of the AgriGuardian subscription itself (Section 11.2), the farm stops using the service entirely.

**Phase 1, 0-90 days after cancellation: Owner-only, read-only.** Every other role, Bookkeeper, Office Manager, Manager, Technician, everyone, loses access immediately. The Owner retains access through the existing step-up mechanism ("Switch to Account Admin," Sections 2.3/9.5), no new authentication path needed. Once in, access is strictly read-only: no editing, no active management, browsing and downloading historical records only (billing history, the audit trail, reports). A **one-click bulk export** is also available, everything zipped into a single download, for a farm that wants to archive it all at once rather than browsing piece by piece.

**Backup guidance on export, confirmed:** when a farm downloads that bulk export, the Portal recommends saving it in at least two separate places, one cloud storage location, one local/physical location (an external drive, a thumb drive), mirroring the same 3-2-1-style backup principle the product already tracks for a farm's own equipment (Section 9.3's Backup tracker). Practicing the same hygiene the product teaches, not just asking farms to.

**Phase 2, 90 days to 7 years: all login disabled, data retained.** After the 90-day window, the Owner's access closes too, nobody can log in anymore. The underlying data is **not deleted**, it's retained for a full 7 years, the standard US tax-recordkeeping window, regardless of whether the farm's 90-day access phase was on a paid or free tier.

**Phase 3, after 7 years: data purged.**

**Recovery policy, confirmed:** if a farm loses or corrupts the zip they downloaded during Phase 1, **Internal Admin** (Vendor dashboard) handles the recovery request, using the still-retained backend data from Phase 2, with the same identity-verification rigor as any other access to a farm's data, not a lighter-touch process just because it's outside the normal login flow. The actual step-by-step SOP for handling these requests belongs in an internal operations manual, not this document, but the system itself needs to support it: every recovery request, who handled it, what was verified, gets logged the same as any other sensitive action, so the SOP has something real to be built and audited against.

**Phase 1 access, confirmed free.** The 90-day read-only window costs nothing, regardless of what tier the farm was on before cancelling.

**Zip export protection, confirmed: optional password, not MFA.** MFA doesn't meaningfully apply to a static file already sitting on someone's own drive, it's a live-login protection, not something that carries over to a downloaded archive. A password on the zip itself is the right analog, and a common one (plenty of banks and tax software offer this for exports). Made **optional, farm's choice at export time**, not mandatory, since a forgotten mandatory password would lock a farm out of its own backup years later, exactly the failure mode this whole mechanism exists to avoid.

---

## 3. Data Model

### 3.1 Entities

- **Farm**: `farm_id` immutable forever, even if legal name changes. Non-repudiation anchor. Carries a `service_level` field (**Managed** or **Self-Serve**), changeable in either direction over the life of the account, logged like any other change (who changed it, when). **Self-Serve**: AgriGuardian only ever creates the Farm record and the Owner account; every device, network, team member, and role assignment after that is entered by the farm's own people, on whichever surface (App or Portal) fits the task, never by AgriGuardian staff. **Managed**: an Implementation Specialist (Section 2.2) does the on-site setup and provides ongoing support, with real write access to that farm's operational data.
- **Person**: farm-agnostic identity (legal name, display name, status). Never hard-deleted, only archived. **Login is phone number + password + MFA, no email involved in login for anyone.** **Archival is blocked while the person holds open, assigned work** (an active `HandoffEvent` with no resolving action yet): the open item must first be reassigned to another person, or moved to **unassigned** (a real state, not a forced reassignment to whoever happens to be available) before archival can proceed. This closes a real gap: without this check, an archived person's open work would silently become orphaned, assigned to someone who can no longer log in or act on it.
- **Device and Network entities follow the same rule as Person: never hard-deleted, only archived.** The prototype's `canHardDelete()` (Owner-only hard delete) does not carry into production; this is a deliberate reversal, not an oversight. Hard-delete existed to fix data-entry mistakes (a wrong device added, a typo, an accidental duplicate), but two more targeted mechanisms solve that without ever destroying a record: **duplicate-detection on entry**, adding a device whose identifying fields (serial number, MAC) match an existing record, archived or active, offers to restore/reactivate that record instead of creating a confusing duplicate; and a **permission-gated edit toggle**, device fields are read-only by default, a checkbox reveals edit mode for whoever's role allows it, fixing a typo or wrong entry without needing to delete and re-add anything. Must work identically on App and Portal, not two separate implementations. With both of these in place, hard-delete's original justification no longer applies, and keeping every device/network record permanently (even archived, even retired) means its full history, from creation through every alert and status change, stays genuinely complete, not "there's a note it existed."
- **PersonFarmMembership**: join table between Person and Farm. Introduced specifically to keep the door open for a person belonging to multiple farms later (e.g., an outside accountant serving several farm clients) without a painful migration, even though today every person has exactly one membership.
- **Role**: the fixed catalog (see 2.4).
- **RoleAssignment**: scopes to a **membership** (not directly to a person), since a role only makes sense within a specific farm relationship. Rows are never deleted, only `revoked_at` stamped.
- **PermissionGrant**: Owner's one-off extras beyond role defaults. Carries `farm_id`, `resource_type`, `permission_level`, and a **mandatory reason** (matches the "mandatory notes on every handoff" principle already established in the app). Kept structurally separate from RoleAssignment so removing a role never ambiguously affects a manual grant. **Validated by existing prototype behavior:** `team.js`/`settings.js` already give every team member individual permission overrides beyond their role default (`addDevices`, `archiveDelete`, `resolveIssues`, `assignIssues`, `exportReports`, `viewOnly`), a simpler, fixed-flag version of exactly this concept. The real design generalizes beyond those six fixed booleans to arbitrary resource-scoped grants, but the underlying pattern (per-person overrides beyond role) is already proven out.
- **Session**: scoped to `surface` (app/portal) and `auth_level` (standard/elevated). A stolen app-session token cannot authorize portal actions. The separation is structural, not just a UI gate.
- **AuditLog**: append-only, no update/delete path exists at the application layer, ever, not even for Internal Admin. Corrections are new entries, never edits to history. **Flagged, not yet resolved:** this entity currently assumes every actor is a `Person`. Now that `VendorStaff` exists as a separate entity (Section 12.1), every log entry needs to reference either a Person or a VendorStaff. A real technical detail to work out, not a blocker to anything decided so far. **Known prototype defect, must not carry forward:** `audit.js`'s client-side array caps at 200 entries, silently dropping the oldest once full. That directly contradicts non-repudiation (Section 1.1), the real backend AuditLog keeps everything, permanently, with no cap of any kind.
- **Invitation**: single-use, expiring, carries proposed roles.
- **HandoffEvent**: a per-device history of every handoff (assign, resolve, escalate, send-back, take-ownership, partial-fix, unassign, **observation, observation-dismissed, observation-confirmed**), each carrying `type`, `from_person`, `to_person` (**null for `unassign` and `observation-confirmed`**, since the whole point of both is that nobody currently holds it), a **mandatory note**, `reason` (escalate/partial-fix only, drawn from the fixed taxonomy below), and `occurred_at`. The three observation-related types support the Observation workflow (Section 9.2): a low-privilege report of something the risk model can't see, its dismissal, or its confirmation as a real operational issue. Distinct from AuditLog: AuditLog is the system-wide immutable ledger of every action across the whole platform; HandoffEvent is a device-scoped, curated view of just the handoff narrative for that one device, though every HandoffEvent should also produce a matching AuditLog entry, not replace it. Confirmed real in the prototype (`d.handoffLog` on every device in `permissions.js`), not a speculative addition.
- **A device's complete history is broader than just its HandoffEvent narrative, confirmed.** Device creation itself is a logged event, and every alert or finding tied to that device (a `SecurityAlert`, a vulnerability lookup result, a hygiene status change) is part of its permanent record too, not just the handoff actions (assign/resolve/escalate/observation). A device's detail view should surface this complete picture, from the moment it was added through everything that's happened to it since, combining its HandoffEvent narrative with its device-scoped `AuditLog`/`SecurityAlert` entries. This is the same underlying data already described above (nothing new to build twice), just confirming the device-level view draws from all of it, not a narrower slice.
- **Filtering is a real requirement on every log view, device-level and system-wide alike, not just an export-time detail.** Nobody needs to see every event at once; a person should be able to filter by date range, event type, or similar, in both the collective/system-wide activity log and a single device's own history. The underlying data always retains full metadata regardless of what's currently filtered on-screen, so nothing is lost for reporting purposes, filtering narrows the view, never the data itself.
- **Escalation reason taxonomy**: confirmed from the prototype (`lang-data.js`, `escReasons`): *End of life, device should be retired*, *End of service, no more updates from the manufacturer*, *Needs replacement purchase*, *Needs vendor/dealer involvement*, *Outside my permissions*, *Other*. Becomes a fixed enum on the real Escalation structure rather than a free-text field.
- **DeviceGroup, new, confirmed:** a real entity for devices that function together as one system (a master controller and its moisture sensors, say). `Device.group_id` is **nullable and exclusive**: a device belongs to at most one group at a time, or none. Exclusive rather than many-to-many on purpose, this is meant to model one real functional relationship, not overlapping categories, and exclusivity avoids a bulk action on one group accidentally stranding a device that also depended on it through a second group. Full feature description in Section 11.8.
- **SupportTicket, new, confirmed:** carries `person_id`, `farm_id`, `subject`, `body`, `status` (open/in-progress/resolved), `assigned_to` (a `VendorStaff`, Section 12.1), `created_at`, `resolved_at`. For **account-specific** issues only, something wrong with a person's own login, MFA, or account behavior, distinct from farm-level issues, which stay with the farm (the Owner, or Onboarding/Offboarding Administrator, per the existing self-reporting pattern in Section 9.5). Routes straight to AgriGuardian (Internal Admin), not through the farm first: the farm-resolvable case is already fully handled by that existing call-the-Owner pattern, so this entity exists specifically for the residual case the farm genuinely can't fix. Full feature description in Sections 9.13 and 12.5.

### 3.2 Why Person has no `farm_id` directly

Person is farm-agnostic on purpose. If a person's farm relationship changes shape later (multi-farm), it's a new `PersonFarmMembership` row, no restructuring of Person, Session, AuditLog, or anything referencing `person_id` elsewhere.

---

## 4. Permission Check Resolution (runs on every request)

1. **Validate session**: unexpired, untampered. Fail fast if not.
2. **Enforce surface match**: session's surface (app/portal) must match the resource's home surface. Mismatch = deny, regardless of what permissions exist. This is what makes app/portal separation a real boundary, not cosmetic.
3. **Resolve effective permissions**: union of active RoleAssignment bundles (via current membership) + active PermissionGrants, most-permissive-wins on conflict. **Computed live, never cached**: this avoids the stale-session class of bug.
4. **Step-up gate**: some actions (Owner entering portal mode, subscription cancellation, message review) require `auth_level = elevated`, not just the underlying permission.
5. **Allow or deny, log either way.** Denials are logged for: all state-changing actions, and all portal-surface denials regardless of type (higher-stakes surface). Read-only app-surface denials may be sampled/aggregated rather than logged individually, to avoid audit-log noise.

---

## 5. Invitation Flow

1. **Invite created**: Owner, Internal Admin, or an Onboarding/Offboarding Administrator (Section 2.4, new role) selects **phone number** (not email, login is phone + password + MFA for everyone, and invites follow that same identity model), proposed role(s), farm. **This is one unified flow regardless of which surface the role belongs to.** An invite can carry an App-surface role (Manager, Technician), a Portal-surface role (Bookkeeper, Office Manager), or both at once. There is no separate Portal-specific invitation system (confirmed decision, see Section 11.4).
2. **Token issued via SMS**: cryptographically random, single-use. **Only the hash is stored**; the raw token exists only in the text message itself (same pattern as password-reset tokens, just delivered by SMS instead of email, consistent with SMS being the trusted channel throughout this design, since it rides the same phone number used for login).
3. **Invitee accepts link**: token validated as existing, unexpired, unused, and matching the farm. Any failure returns an **identical generic error** regardless of which check failed, to prevent enumeration. **Name, phone, and role are locked, confirmed:** all three were set by whoever sent the invite and can't be changed by the person accepting it. The role is a decision made by the inviter, not something negotiated during acceptance.
4. **Credential setup + mandatory MFA**: required before activation for a brand-new Person. No bypass. This mirrors the existing fix that eliminated the prototype's one-tap MFA bypass; an invite flow without this would reopen the same door elsewhere. Existing Persons being added to an additional role skip this step (already have credentials).
5. **Membership/role assignment created**: logged, inviter notified of acceptance.

**Duplicate invites, confirmed:** if the Owner invites the same phone number again before the first invite is accepted, **the new invite supersedes the old one**, the earlier token is invalidated, only the newest invite is live. Simpler to reason about than letting both stand (which risks two valid tokens with unclear which roles actually apply), and less restrictive than blocking the second attempt outright (which would force the Owner to manually find and cancel the first invite just to fix something like a mistyped role).

**Owner revocation, confirmed:** the Owner can revoke a pending invite before it's accepted, and doing so **requires a reason**, matching the mandatory-notes pattern already established for other sensitive actions in this design (PermissionGrant, escalation). Logged like any other reasoned action.

**Incomplete MFA enrollment, confirmed:** if someone accepts the invite and sets a password but never finishes MFA enrollment, they get **no access at all**, not partial App access while Portal stays locked. Blocking only Portal would reopen a version of the exact one-tap-bypass gap that was already deliberately closed in the prototype, for no real benefit; there's no legitimate reason someone needs App access badly enough mid-enrollment to justify that risk.

**Auto-cleanup for abandoned enrollment, confirmed, new:** if credential setup begins but MFA enrollment isn't completed within **10 days**, the incomplete Person/Membership/RoleAssignment is automatically archived, and the phone number becomes eligible for a fresh invite. The 10-day window (rather than a shorter one) was chosen deliberately to avoid penalizing someone whose enrollment window happens to span a busy work period or holiday. This is logged like anything else, and the Owner gets a quiet, **log-only** note about it, this is housekeeping, not a security event, so it doesn't warrant an active push. This exists specifically so an abandoned invite doesn't become a manual cleanup chore the Owner has to remember to do. Distinct from the pre-acceptance invite-link expiry (Section 5, step 2 area, ~72 hours before the link itself goes dead if nobody ever clicks it), this is a second, later timeout for the case where someone *did* start but never finished.

---

## 6. Notification and Security Alerting

### 6.1 Failed authentication vs. failed authorization: different threats, different handling

- **Failed authentication** (wrong password/MFA): escalating lockout.
  - Tier 1: 5 attempts / 15 min → 5-min lockout, SMS to account holder
  - Tier 2: repeat → 30-min lockout, SMS to account holder
  - Tier 3: repeat again → 24-hr lockout, SMS to account holder and the farm Owner, plus a notification to the Farm's on-file contact email (Section 11.1), a deliberately restrictive use of that channel, reserved for this severity specifically
  - Tier 4 (rare): sustained targeting continues, or same pattern across multiple accounts/farms → **indefinite lockout, not timed.** Unlike Tiers 1-3, this doesn't auto-resolve on a clock; the situation is ambiguous enough (potentially a real, coordinated attack) that it needs an actual person to look at it before access returns. Escalates to Internal Admin, who reviews and manually lifts the lockout, the only tier where restoration isn't automatic. **Internal Admin's expected response time is a real operational question, not resolved here**; a tracked SOP item, not a made-up number with no real basis.
- **Failed authorization** (valid session, action outside the person's role): **log + flag for Owner review, no auto-lockout, no auto-session-suspension.** Confirmed reasoning: many legitimate, non-malicious causes exist (stale bookmarks, curiosity, permissions that changed after the fact), and auto-punishing creates false accusations. Escalates to Internal Admin only if the pattern is systemic (many accounts/farms, not one).
- **Denial is never proactively surfaced to the acting person**: this is deliberate. If the cause is malicious, tipping them off helps them, not you.

### 6.2 Delivery tracks: decided at write-time, not read-time

| Track | Examples | Farm-visible? | Delivery |
|---|---|---|---|
| Log-only | Tier-1/2 auth lockouts, explainable authz patterns | Yes, browsable activity log with one-click "this was me" dismissal | None pushed |
| Surfaced | Tier-3 auth escalation | Yes, actively pushed | SMS + in-app (if reachable), plus the Farm's on-file contact email at this severity specifically |
| Vendor-only | Cross-farm/platform attack patterns | **No**, lives in a structurally separate table (`PlatformSecurityEvent`), not just a filtered view | Internal Admin only |

### 6.3 Tone and message design (to prevent unnecessary farmer anxiety)

- Fixed message templates per alert type, never dynamically composed, to keep tone deliberately chosen rather than improvised.
- Plain, non-technical language always.
- Every actionable alert pairs the description with **exactly one recommended next step**, never "look into it," which invites self-diagnosis down a wrong path.
- "No action needed" stated explicitly when true.

### 6.4 Entities

- **SecurityAlert**: `alert_id`, `person_id`, `farm_id`, `alert_type`, `status` (open/reviewed/dismissed), `reviewed_by`, `reviewed_at`, linked to underlying AuditLog evidence. Farm-visible tiers only.
- **PlatformSecurityEvent**: structurally separate table for vendor-only events. Table-level separation, not a query filter, a bug in farm-facing queries can never leak a row that was never in the farm-facing table.

### 6.5 Account-security signals and the hygiene score: permanently separate

**Confirmed, by scope, not by default:** account-security signals (failed logins, lockouts, and similar) never fold into the hygiene score. This isn't "keep separate until more data exists", it's a scope decision that no future data or formula would change. The hygiene score measures ongoing device/network/app *practice*, passwords changed, updates applied, backups configured, things a farm can actually improve through better habits. A failed login attempt is a security *event*, not a hygiene practice, and folding event data into a practice score would blur what the score actually represents, real scope creep away from this app's cyber-hygiene purpose. Some other things built into this design exist for convenience or to support that core purpose (SMS notifications, device binding, and the rest); that doesn't mean everything security-related has to feed the same single metric.

### 6.6 Notification routing (business/informational categories, billing, hygiene reports, audit exports)

- **NotificationRoute** entity: `category`, `recipient_kind` (role / person / external email), `recipient_value`, `reason` (required for external recipients), `expires_at` (strongly recommended default for external/ad hoc recipients like outside auditors), `added_by`, `added_at`, `revoked_at`.
- Role-based routing (e.g., "Bookkeeper gets billing changes") resolves dynamically to whoever currently holds that role, self-maintaining as people change roles.
- Channel by category: urgent security → in-app + SMS + email. Business/informational → email only. Log-only → nothing pushed. **Correction, fully resolved:** email as a delivery channel is eliminated for **everyone with any login at all**, App-only roles and Portal-only roles alike, Owner included, as their own personal notification channel. Business/informational notices now use the same content-free SMS-trigger + in-app pattern universally: the SMS points to Dashboard (Section 9.1) for anyone touching the App, or to Oversight, Review, and Audit Trail (Section 11.6) for anyone Portal-only, both already serve as the "here's what's happened" landing place for their respective surface, so no new screen was needed for the Portal side. **Three exceptions, confirmed:** external `NotificationRoute` recipients (outside auditors, no app login at all) keep real email, "log in to check" is meaningless for someone who isn't a Person in this system, and building a separate no-login secure-access mechanism for this occasional case would be disproportionate scope. Separately, the Farm's on-file contact email is used for two specific, severe cases: Tier 3 failed-authentication escalation (Section 6.1), and subscription cancellation (Section 11.2), both deliberately restrictive, farm-level uses, distinct from any individual person's personal notification email. The existing safeguards on the NotificationRoute case (required reason, recommended expiration) already keep it appropriately contained.
- **The in-app notifications landing area is fully designed**: see Dashboard (Section 9.1) for the App-side design; Portal reuses the existing Oversight, Review, and Audit Trail screen rather than needing its own separate version.

### 6.7 Person.notification_email: eliminated

**Login is phone number + password + MFA for everyone, email was never part of login for anyone.**

- **`notification_email` is eliminated entirely, for everyone with any login.** What started as "optional, Owner-controlled" is now not needed at all. Anyone with an App or Portal login gets their notices via SMS-trigger pointing to their surface's landing area (Dashboard or Oversight/Review/Audit Trail), never email.
- Email is treated as a **low-trust channel** throughout, which is exactly why this field was worth eliminating rather than just restricting: many farmers use older personal webmail (Hotmail, AOL, Yahoo) with weak security practices, and SMS, riding the same phone number already used for login, is inherently more trustworthy for this audience.
- The only places email survives at all are the three exceptions documented in Section 6.6: external `NotificationRoute` recipients (someone with no login, not a Person in this system), and the Farm's on-file contact email, used specifically for Tier 3 failed-authentication escalation (Section 6.1) and subscription cancellation (Section 11.2).

### 6.8 Parked idea: AgriGuardian-managed professional email

**Reframed:** this isn't just a future revenue stream. The core insight is that farms relying on old personal webmail (Hotmail, AOL, Yahoo) for actual business use *is itself a cyber-hygiene risk*, the same category of thing this whole product exists to surface and fix. AgriGuardian offering a migration path to secured business email is squarely on-mission, not a bolt-on monetization idea. Revenue is a reasonable side effect of doing this, not the reason to do it.

- Likely a **reseller/wrapper model** (Google Workspace/Microsoft 365 under the hood) rather than building raw mail infrastructure, real deliverability/DMARC/abuse-handling work is substantial and better sourced than built.
- **Administration** lives in the Account Admin Portal (create mailbox, assign to person, billing), same pattern as subscription/Apps management.
- **Daily access** is a lightweight SSO entry point ("Mail" button, surfaced from app or portal), explicitly *not* a built-in webmail client, to avoid turning a security product into an email client.
- SSO rides the same phone + password + MFA identity already used for login, one hardened credential covers both, directly solving the personal-webmail weak-password problem for this audience.
- **New idea surfaced, not yet decided:** should personal-vs-secured email usage become its own tracked hygiene signal, similar to how Business Apps and Accounts (9.3/11.3) already tracks MFA/password-manager hygiene on third-party accounts, turning "this farm uses Hotmail for business" from an assumption into a flagged risk item, with this migration service as the natural remediation offered right there? A real product idea, worth its own consideration later, separate from whether/when the email service itself gets built.
- Status: parked, shaped, not committed as active work.

---

## 7. In-App Secure Messaging

### 7.1 Why not native SMS deep-linking

Rejected. Breaks the audit trail entirely (conversation happens outside any system AgriGuardian can see), makes phone numbers permanently portable once saved to someone's native contacts, and native SMS sender identity is spoofable/unverifiable.

### 7.2 Why not Signal/Telegram as the core mechanism

Rejected as the primary system. Signal's core value (true end-to-end privacy, unreadable even by Signal) directly conflicts with the audit/non-repudiation requirements this whole design is built around. Telegram's default chats aren't E2E encrypted either, so it wouldn't even deliver the "secure" property being sought, while still adding a third-party identity/API dependency.

**Possible future idea (not committed):** an explicitly separate, clearly-labeled "quick chat" side-channel for purely casual, non-operational communication only, never used for anything operational (handoffs, escalations). Flagged as parked, not decided.

### 7.3 Adopted model: in-app messaging + content-free SMS notice (summary)

In-app messages are logged and tied to authenticated sender identity. The recipient gets a content-free SMS notice (sender's name only, no message content) as a reliable fallback alongside in-app push.

### 7.4 Access model: reason-gated review, not standing visibility (summary)

Reading someone else's conversation is a deliberate, accountable act: gated behind an explicit, reasoned, logged grant, not open by default and not proactively announced when it happens.

### 7.5 Behavioral design: making logging visible without relying on memory (summary)

A persistent, non-dismissible label on every conversation thread keeps the "this is logged" framing active in the moment, not a one-time popup someone sees once and forgets.

### 7.6 Resolved and Parked
**Phone number visibility, confirmed, resolved:** team members see each other's raw phone numbers, tap-to-call. The reasoning: a real practical need exists (finding a coworker quickly when people are spread across a barn, a field miles away, and running errands), and native calling was never an audited channel to begin with, unlike the messaging system (Section 7.1–7.4), a phone call has no content to log, so showing the number doesn't reopen any of the concerns that led to rejecting native SMS deep-linking. Attempting to hide the raw digits while still allowing tap-to-call would add friction without any real privacy benefit, since the person's own phone call log shows the number the instant they dial anyway.

**Messaging feature, parked, not built at this time (confirmed decision):** working through the actual use case surfaced real adoption risk (would anyone use this over just texting the person's real number) against needs already met elsewhere (tap-to-call for reaching someone quickly; the existing assign/escalate/resolve HandoffEvent notes for anything device-specific). Reactivate if this becomes something farms actually ask for, or if its absence creates a real security issue (people relying on ungoverned personal texting for work communication). Full detail in Section 9.6a.

### 7.7 Note on the more detailed design considered

A more detailed design (specific entities, permission-scoping mechanics, UI copy) was worked through before the feature was rejected in 9.6a. That level of detail isn't preserved here: if messaging is seriously reconsidered later, it warrants a fresh design against needs at that time, not a resurrected old spec. What's worth keeping is the rejection reasoning itself (9.6a): real adoption risk, since faster and more familiar alternatives (a phone call, a text) already exist, meaning the development investment wouldn't have a good return.

---

## 8. Consolidated Open Items List (superseded)

**This list is historical and no longer maintained.** It was accurate early in this design process, but every item here is now tracked more precisely in the per-feature deferred-items tables in Sections 9–12, which are kept in sync with the interactive diagram (`agriguardian-backend-map.html`) and are the actual current source of truth. Several items below are already resolved as of later work in this document but were never removed from this list. Don't treat this section as reflecting current status. Kept only for historical continuity, not as a working reference.

1. ~~Invitation: duplicate-invite handling~~, resolved, Section 5
2. ~~Invitation: Owner's ability to revoke a pending invite~~, resolved, Section 5
3. ~~Invitation: does incomplete MFA block all access or only portal-surface actions~~, resolved, Section 5
4. ~~Whether account-security signals ever join the hygiene score~~, resolved, permanently separate by scope, Section 6.5
5. ~~Owner's own notification-email change process~~, moot, resolved by elimination, Section 6.7
6. ~~Phone number visibility scope in Settings~~, resolved, Section 7.6
7. ~~Messaging structure: free-form vs. context-tied vs. both~~, moot, Messaging feature parked entirely, Section 9.6a
8. Parked: AgriGuardian-managed email service, still parked, Section 13.2
9. Parked: casual "quick chat" side-channel, still parked, Section 7.2 (now folded into the broader Messaging-parked decision, Section 9.6a)

---

---

## 9. App Branch: Full Feature Breakdown

**Structure:** Backend = three sections (Farm view, Infrastructure and shared services, Vendor dashboard). Farm view = two surfaces (App, Web dashboard/Portal). This section fully builds out **App**, the daily-use, farmer-facing surface, grounded in what the current static prototype actually does (see `/mnt/project/FILE-MAP.md`), plus everything decided in this document.

**Standing structural rule:** every feature branch gets its own deferred-items sub-level by default, even when currently empty, rather than deferred items living only in a separate list. Each deferred item is tagged **Quick**, **Deep-eval**, **Parked**, or **Expert**, the same triage system used in Section 8 and in the interactive backend map (`agriguardian-backend-map.html`), so the document and the diagram always stay in sync. **Expert** is distinct from Deep-eval: Deep-eval means more of our own thinking will resolve it; Expert means the question genuinely needs an outside cybersecurity or compliance professional, not just more internal discussion.

### 9.1 Dashboard (Tier 2)
**Prototype today:** `dashboard.js`, summary cards, alerts, nav shortcuts. Pulls from `risk.js`, `networks-data.js`, `permissions.js`.
**Backend needs:** Database, Backend API, aggregate device/network/app risk and hygiene score, role-scoped (Farm Hand/Viewer see neutral-tier only, per the least-privilege model).
**Known prototype defect to fix in production build:** `renderHygieneScore()` is currently dead code, computed but never wired into any screen.
**Correction, hygiene score math:** the current `computeHygiene()` implementation is a **demo-only placeholder**, a straight percentage average of "green" ratios across password, update, network, app, and backup categories, with no distinction in weight between a red finding and a yellow one. This is not the intended final design. The real weighted scoring algorithm (including whatever the actual red-vs-yellow weighting should be) is undecided and lives under the Production-grade hygiene scoring item in Section 13.3, Infrastructure → Integrations, deliberately, since the real formula depends on richer data (CVSS, the Common Vulnerability Scoring System, NVD, manufacturer lifecycle) that only exists once that infrastructure work is done.
**In-app notifications landing area, confirmed design, resolved.** This lives here, on Dashboard, rather than as its own separate feature or nav tab: a small notification icon/badge. Tapping it opens a single chronological list combining SecurityAlert items relevant to that person's role (Section 9.6) with business/informational notices (the things that used to be email-only for App-only roles, Section 6.6). Each entry shows what happened and when; tapping one shows more detail inline or navigates to the relevant screen (a device, a network item). No separate "Notifications" tab. Dashboard is already the "here's what needs your attention" screen, and a second version of that same concept would just compete with it rather than add anything.

**Unassigned work, confirmed real in the prototype, carries forward unchanged.** `dashboard.js` already filters unresolved, non-green-risk devices with no `assignedTo` into a distinct "Needs Attention" list, with its own visual badge separate from "assigned to" (`unassignedLabel`). This is exactly where an item lands after the new **unassign** `HandoffEvent` type (Section 3.1, triggered when a person holding open work gets archived): no new UI concept needed, it surfaces through the same existing mechanism any other unassigned item already uses. Only Owner/Manager can act on it directly or reassign it to someone else; other roles must wait to be explicitly assigned (the existing 2026-07-06 rule in `permissions.js`, no "unassigned = anyone can act" exception).

**Deferred items:** none, resolved by scope (Section 6.5): account-security signals never fold into the hygiene score.

### 9.2 Devices and Network (Tier 2)
**Prototype today:** `devices-list.js`, `devices-detail.js`, `devices-resolve.js`, `networks.js`, `networks-data.js`, device/network inventory, risk scoring, assign/resolve/escalate workflow.
**Backend needs:** Database, Backend API, Integrations, vulnerability lookups (NVD/CISA) must move server-side rather than the current direct-browser calls.
**Known prototype defect to fix in production build:** archive/delete/add-device actions are not yet RBAC-gated (flagged in `permissions.js`). More significantly, hard-delete itself (`canHardDelete()`) does not carry into production at all, per Section 3.1: Device and Network follow Person's never-hard-deleted rule.
**Additional confirmed depth (previously undocumented):**
- **The Observation workflow, a real feature, not a minor detail.** View-only roles (Farm Hand, Viewer) can't resolve or escalate anything, but they can submit a free-text observation flagging something wrong with a device that the risk-scoring model has no way to see at all, a physical or operational problem, not a security one (e.g., a satellite dish physically damaged, something `getRisk()`'s brand/password/network-based scoring was never designed to detect). Visible to Owner/Manager; deliberately **not** shown back to the person who submitted it. Renders as a banner regardless of the device's risk color, so a device can never show a false "all green" while something real has been reported. Owner/Manager can **dismiss** it (nothing to act on) or **investigate** it, which hands off through the exact same assign/resolve/escalate pipeline already used for security issues, no separate status model. Investigating resolves as either "no issue found" (clears back to normal, feeds the same **unassign** path as any other closed item) or a **confirmed operational issue**, which stays visibly flagged until someone explicitly clears it later, a real third category distinct from both "resolved" and "risk is green." A fresh observation always restarts this lifecycle, even on a device with a prior dismissed/investigating/cleared history, each report is its own thing to look at.
- Every device carries its own **HandoffEvent** history (Section 3.1), not just a single assign/resolve flag.
- Escalation is a **structured object** (`target`, `targetName`, `reason`, `note`, `by`, `date`) with a **confirmed fixed reason taxonomy** (Section 3.1), not free text.
- Three distinct workflows exist beyond the basic resolve/escalate pair: **take ownership** (Owner/Manager claiming an assigned device directly), **send back to technician** (Manager-only, returns an escalated issue with a required note), and **partial-resolve-and-escalate** (a single combined action that records a partial fix *and* an escalation together, appending two HandoffEvents at once).
- **Role visibility is more granular than a flat "Farm Hand/Viewer see neutral tier" rule:** Farm Hand sees that an issue *exists* without the detailed risk grade; Viewer sees *only* issues specifically assigned to them, not the full list. These are two different visibility rules, not one shared "neutral tier."
- **The coarse status Farm Hand/Viewer actually see is Owner/Manager's judgment call, not a raw technical readout.** Fine / Use with caution / Do-not-use are deliberately generic labels, a simple traffic light, not a description of the underlying technical finding (which may well be a real, exploitable vulnerability). That's intentional: a view-only role doesn't need the technical detail to know whether they can use the device, they need the verdict. Management renders that judgment; the label communicates it simply.
- **A fourth state is needed, and it's not a variant of the other three: "New alert, not yet reviewed."** This is the case where a real, non-green finding exists (say, an overnight vulnerability push) but Owner/Manager hasn't rendered a judgment call on it yet. The prototype's current fallback silently treats this the same as "Known issue," which hides a real, meaningful distinction from the Farm Hand: *nobody has looked at this yet* is not the same thing as *management has classified this as a known, lower-severity issue*. Calm, not alarming, matching the same palette principle as the other three, but honestly communicating "unjudged," not "judged and it's fine to keep working with caution." This status pairs directly with the Observation workflow (above): if the Farm Hand is actively experiencing a real-world symptom (a GPS that won't connect, say) at the same moment a device shows this status, submitting an observation is the natural next action right there, giving management both signals together, the automated finding and a real person's real-time report, rather than either alone.

**Custom brands and device types, confirmed:** the built-in brand/type lists aren't closed, a farm can add its own (with duplicate-detection against existing entries, so "John Deere" and "john deere" don't become separate records). A custom brand automatically inherits the same treatment the existing **"Other"** category already gets: unknown support status, defaulting to yellow risk. This is a deliberate default, not a gap, claiming green (safe) for a brand the system has no real data on would be actively misleading, and requiring a farm to manually classify their own custom entry adds friction without adding real safety.

**Device classification, usage pattern vs. ownership (two independent fields, not one):**
- **`usage_pattern`** (per-device: **Dedicated**, **Mixed-use**, or **Shared**) is the field that actually drives security treatment. This replaces an earlier "farm-owned vs. BYOD" framing that turned out to measure the wrong thing, on a family farm, a phone the farm technically owns is often used for someone's entire personal life anyway, so ownership doesn't reliably predict risk. What predicts risk is whether personal activity (personal apps, personal accounts, anything outside farm work) happens on the same device as the farm session. A dedicated device is one the farm can meaningfully influence; a mixed-use device inherits whatever risk exists on its personal side, regardless of who's on the receipt.
- **Shared, confirmed, a distinct third category, not a variant of the other two:** a device like a barn tablet used by multiple different Farm Hands during their shifts doesn't have a single person to bind a login to, so it's exempted from device-binding entirely (Section 9.5). Instead: every person authenticates individually each time they pick it up, with a short idle timeout that logs the session out before the next worker grabs it. This is deliberately different from Dedicated/Mixed-use's per-person device-binding model, the goal for a Shared device was never "which device is this," it's "who's using it right now," and forcing it into the personal-device model would just create workflow-blocking friction (the first person to touch it would end up "owning" it, and everyone else would get locked out trying to do their job) without any real security benefit, since the whole point of a shared device is that many people are supposed to use it.
- **Shared devices are always farm-owned, confirmed.** A device can only genuinely be Shared in this sense if the farm owns it; a personally-owned phone can't be "shared" among multiple workers the same trusted way. This means `ownership` and `usage_pattern = Shared` aren't fully independent after all, Shared implies farm-owned, while Dedicated and Mixed-use can be either.
- **Shared devices still get registered, just not bound to a person, confirmed.** The tablet itself is a known `Device` entity in the system (the same entity already tracked here for hygiene/risk purposes), which is what lets the system distinguish "this is our legitimate shared tablet" from an unknown device attempting logins. It simply has no single login bound to it the way a Dedicated device does.
- **`ownership`** (per-device: farm-owned or personal) is kept as a **separate field with zero bearing on security treatment** for Dedicated/Mixed-use devices, useful for asset tracking and insurance purposes, not used anywhere in risk scoring or access control. (Shared devices are the one case where ownership and usage pattern are linked, per above.)
- Confirmed real-world implication: whatever gets tracked about a device must be visible to the person using it, never covert monitoring, consistent with the principle already established elsewhere in this design.

**Camera input for device fields, confirmed design, resolved:** scan a manufacturer sticker to extract brand, model, and serial number, rather than typing them in. Up to **3 scan attempts**, if all fail (a worn/dirty sticker, bad lighting, the real conditions of a barn or field), a clear message directs the person to enter the fields manually instead, avoiding an indefinite retry loop. On a successful scan, the extracted fields are **not auto-accepted**, the person must explicitly verify each one matches the physical sticker before it's saved, since OCR can confidently return a plausible-looking but wrong value (0/O, 1/I/l confusion especially, common in serial numbers). This is an honor-system check, not a technical safeguard, but proportionate: the person doing this (a Self-Serve Owner, or an Implementation Specialist during Managed setup) is invested in getting their own farm's inventory right, and a wrong serial number is a data-quality issue, not a security one. **The photo itself is never stored**, captured only to extract the text, then discarded immediately, consistent with the "don't retain more than needed" principle already running through this design (reason-gated message review, minimal-content notifications, etc.).

**Precise GPS location, confirmed design, resolved:** an **optional** field, added at the person's discretion, not required for every device. The existing free-text location label (predefined options plus custom text) is enough for devices that are inherently easy to find, a camera mounted at the barn door isn't going anywhere and is visually obvious. GPS coordinates earn their place specifically for devices that can become genuinely hard to locate later despite a good label, a ground moisture sensor, say, that gets swallowed up once crops grow tall enough to obscure it. Captured as a **one-time "capture current location" action** (the person stands at the device and taps a button, using the phone's GPS to log that single point), deliberately not continuous tracking. This is metadata about where a piece of equipment sits, not surveillance of a person's movements, and keeping it a one-time snapshot rather than ongoing tracking keeps it honestly in that category. **The same action needs to be re-triggerable, not a permanent, unchangeable snapshot**, if a device gets physically relocated (moved between fields, repositioned for a new season), the person needs to be able to stand at its new spot and re-capture, overwriting the old coordinate. Otherwise stale location data becomes actively misleading rather than just unhelpful, worse than having no GPS data at all, since it confidently points someone to the wrong place.

**Remote wipe, revised: not available for personally-owned devices, available for farm-owned devices.** For a **personally-owned** device (`ownership = personal`), the original reasoning still holds in full: de-registration (Section 9.5) already fully solves the security problem remote wipe would exist for, the moment a device is de-registered, it can never authenticate as that person again, and a wipe would only destroy someone's real personal data (photos, everything else) with zero additional security benefit over de-registration alone. For a **farm-owned** device, the calculus is different: ownership itself sets the expectation, the same way a company-issued laptop can be reimaged or wiped without it being a surprise, an accepted condition of using employer-owned equipment, not a new risk introduced by adding this capability. This applies regardless of `usage_pattern` (Dedicated or Mixed-use); ownership, not usage pattern, is what determines whether wipe is available. **Device binding itself (registration, de-registration authority, shared-device handling) is fully resolved, see Section 9.5.**

**Find My Device, confirmed, a genuinely separate feature from remote wipe.** This is about physically locating a lost device (real asset-recovery value, a farmer doesn't want to lose an actual phone or tablet in a field), not about preventing unauthorized access, which de-registration already fully covers. Scoped deliberately narrow to avoid reading as surveillance of someone's personal device: activated only when the person themselves reports the device lost, not passive or continuous background tracking, and built on top of the device's existing OS-level capability (Find My iPhone, Find My Device on Android) rather than AgriGuardian building its own location-tracking system from scratch. Available regardless of ownership, personal or farm-owned, since locating a lost device doesn't carry the same personal-data risk remote wipe does.

**Mixed-use device controls, confirmed, resolved:** two controls apply specifically to Mixed-use devices (not necessarily Dedicated, which is a more controlled environment already): an **app-level PIN/biometric lock**, and a **shorter idle timeout**. The PIN/biometric lock is the one that matters most. The core problem with a Mixed-use device is that its baseline security sits outside the farm's control (a family member might leave it unlocked, the OS-level screen lock might be weak or absent), and an app-level lock is the only one of the candidate controls that doesn't depend on trusting something about the device the farm can't actually verify. A shorter idle timeout pairs naturally with it, reducing the exposure window directly, same logic already used for Shared devices. **Stricter/repeated MFA enforcement was deliberately excluded.** MFA already happens at login, and re-triggering it constantly during ordinary use adds real friction without much added benefit once the PIN lock and shorter timeout are in place. If anything MFA-adjacent is ever warranted, it should be reserved for genuinely high-stakes actions specifically, the same restraint already applied to Portal step-up, not blanket re-challenging.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Device detail page accordion rebuild | Match the collapsible-section treatment the network detail screen already has. | Quick |
| Production-grade hygiene scoring | Canonical decision now tracked under Section 13, Infrastructure → Integrations; the App only consumes this data, it doesn't own the decision. | See Infrastructure |
| Shared device Portal access | **Tentatively decided: allowed.** Step-up re-authentication plus the existing short idle timeout on Shared devices already address the realistic risks (unauthorized entry, a session staying open after someone walks away); blocking Portal on top of that would add friction without a clear incremental security benefit, the same reasoning already applied to rejecting repeated MFA re-challenges on Mixed-use devices. Practically, many people hold roles spanning both surfaces and need to act from whatever device is at hand (a barn iPad, a truck Chromebook), not a device dictated by policy. **Still pending, not fully locked in:** whether PCI-DSS has an actual binding requirement about what device types can touch a cardholder-data environment, since Portal now handles real payments (Section 13.4). That's a compliance fact, not a design judgment call, and needs the outside consultation already flagged below, not more internal reasoning. **Same underlying need as the PCI-DSS compliance confirmation item (Section 13.4)**, worth bringing both to the same consultation. | Expert |

### 9.3 Apps and Backups (view) (Tier 2)
**Prototype today:** `apps.js`, Apps inventory and 3-2-1 Backup tracker, currently full-edit, Owner-only, in-app.
**Backend needs:** Database, Backend API, pulls from Portal-managed business-account data (Section 2.5, decided: edit moves to Office Manager/Owner in the Portal; App becomes read-only).
**Known prototype defect to fix in production build:** today's in-app edit access must be actively removed/redirected when this migrates, not just left in place alongside the new Portal edit path.

**Deferred items:** none identified yet. Sub-level present per the standing structural rule, currently empty.

### 9.4 Team and Roles (Tier 1)
**Prototype today:** `team.js`, `settings.js`, `permissions.js`, roster, invite/edit/archive, permission checkboxes, custom role handling.
**Backend needs:** Database, Backend API, Authentication and identity, the full Person/PersonFarmMembership/RoleAssignment/PermissionGrant/Invitation model from Sections 2–5.
**Known prototype defect, now resolved by design rather than needing a code fix:** the seed-data identity conflict (Sarah Tully appearing as both Technician and Farm Hand) stops being a bug once multi-role assignment is real, that's just two legitimate RoleAssignments on one Person.
**Known prototype defect to fix in production build:** `settings.js`'s `saveOwnerEmail()` function and its `owner-email-input` field must be removed from the App entirely, and `auth-flow.js`'s demo account resolution (`resolveDemoAccount()`, `pendingLogin`, `currentUser`) must drop its `email` field the same way. Both are the literal prototype code for the old, since-eliminated Owner notification-email concept (Section 6.7); the one legitimate email field that survives is the Farm-level billing/contact email, already planned for and handled in the Web dashboard (Section 11.1), not a per-person field anywhere in the App.
**Farm timezone, confirmed, Owner-only editable.** A real setting (`team.js`'s `updateFarmTimezone()`), not currently documented elsewhere; carries forward as-is.
**Session timeout, confirmed configurable, Owner-only, resolved.** Matches the same farm-wide-setting pattern as timezone: a shared setting, not a personal preference, and arguably more security-sensitive than timezone since it directly controls how long an idle, authenticated session stays open. The prototype's flat `SESSION_TIMEOUT = 5 * 60` (commented "demo friendly" in the code, not a real recommendation) becomes three tiers, tied to the device classifications already established in Section 9.2:
- **Dedicated (the Owner-configurable baseline):** a preset dropdown, not free-form entry, in the **15-30 minute** range. Long enough that someone doing physical farm work, gloves on, stepping away mid-task, isn't fighting constant re-logins; short enough that a lost or left-open device doesn't stay authenticated indefinitely.
- **Mixed-use:** meaningfully shorter than the Dedicated baseline, **5-10 minutes**, not independently configurable, matching Section 9.2's existing "shorter idle timeout" control and the weaker baseline security a Mixed-use device already carries.
- **Shared:** shortest of all, **1-2 minutes**, not independently configurable. This one isn't really about idleness, it's about closing the window before the next worker picks up the device (Section 9.2).

**Deferred items:** none, the one item previously here (messaging structure) is resolved by the Messaging feature being parked entirely (Section 9.6a).

### 9.5 Session and Login (Tier 1)
**Prototype today:** `session.js`, `auth-flow.js`, `auth-ui.js`, currently a hardcoded demo code (`'123456'`), in-memory `currentUser`, no real password storage.
**Backend needs:** Authentication and identity, Communications, real password hashing, real MFA, real SMS-based phone verification, surface-scoped sessions with step-up support.
**Known prototype defect to fix in production build:** everything about identity currently resets on page reload. This entire feature is a placeholder, not a partial implementation.
**Ownership clarification, the step-up mechanism:** the "Switch to Account Admin" trigger and the password/MFA re-authentication challenge that follows both belong entirely to this feature, not to Web dashboard. It's one mechanism, not two. The trigger and the challenge are a single authentication event that happens to gate entry into Portal. Every Web dashboard feature (Section 11) *requires* the resulting elevated session (`auth_level = elevated`, Section 3.1) as a precondition, the same way they already depend on Authentication and identity generally, but none of them own the mechanism itself.

**Device binding, confirmed design, fully resolved:** a device gets registered naturally at first login (the device used to accept the invitation and set up credentials/MFA); a login attempt from a different device is blocked even with correct password and MFA; a lost/replaced device or departing employee gets handled by **de-registering** the device, which alone fully closes off future access regardless of ownership (Section 9.2's Remote wipe decision: available for farm-owned devices, not personally-owned ones). Applies to App only, Portal relies on its existing step-up mechanism instead. **Device count and shared devices, revised:** personal devices (Dedicated/Mixed-use) allow **up to two simultaneously registered devices per person**, not strictly one. This reflects real farm workflow: a phone for quick status checks, a tablet (or similar) for the actual hands-on work, data entry, resolving issues, in the field, without forcing someone to log out of one to use the other. Strictly one device would create exactly the kind of workflow-blocking friction without real security benefit already argued against elsewhere in this design (Section 9.2's Mixed-use reasoning); two is a real, meaningful constraint, not unlimited devices, sized to match how people actually work rather than an arbitrary number. Shared devices are exempted from device-binding entirely, each person authenticating individually per use instead. **De-registration authority, confirmed:** the Owner, or anyone holding the new Onboarding/Offboarding Administrator role (Section 2.4), can de-register a device, the same authority that covers full offboarding generally (revoking role assignments, de-registering devices, and initiating invites on the onboarding side). **Self-reporting, confirmed:** this doesn't need a dedicated technical flow, someone who's lost their phone just calls the Owner or Administrator directly (tap-to-call, Section 7.6 already supports this), who then de-registers the device with a required reason, same pattern as any other sensitive action. **Risk-exposure during the gap, resolved by reframing:** de-registration was never protecting against a stranger who finds or steals a lost phone, whoever has the phone still needs the password and to pass MFA to do anything as that person, from a new login. The actual exposure during any gap is whether the app session was already *open* on the lost device, which is a **session-timeout** question, not a device-binding one. De-registration's real job is preventing a *future* login attempt, which matters most for the departing-employee case, not the lost-phone case.

**Deferred items:** none, the one item previously here (Owner notification email change) is now moot; `notification_email` was eliminated entirely for everyone with a login (Section 6.7).

**Device-binding mechanism, confirmed: a WebAuthn/passkey credential, not a network address or a raw manufacturer hardware ID.** Network (IP) address is unusable for this, it changes constantly (switching WiFi, cellular vs. WiFi, a router reassigning addresses) and was never a candidate. A manufacturer-assigned hardware ID (IMEI, serial number) is the more intuitive idea, but both iOS and Android now deliberately block apps and websites from reading these, a privacy lockdown neither platform allows around without enterprise Mobile Device Management, which brings a heavier IT-style enrollment burden that doesn't match how a farm operates day to day. **WebAuthn/passkey achieves the same practical result:** a credential generated once at registration, stored in that specific device's own secure hardware, persistent across app restarts and network changes, just as reliably tied to one physical device as a hardware ID would be, without needing OS-blocked access to get there.

**Personal-device binding is symmetric, confirmed.** Someone can't log into their own account from someone else's registered personal device, and someone else can't use a different person's registered device to log into their own separate account either. The binding ties one device credential to one person in both directions.

**A second personal device requires an Owner-granted permission, not automatic.** Default is one registered device per person. A second (matching real farm workflow, phone for quick checks, tablet for fieldwork) requires a `PermissionGrant` (Section 3.1) from the Owner, mandatory reason, logged, the same mechanism already used for every other one-off access extension in this design. **Only one active session at a time, regardless of device count:** logging into the second device automatically ends the session on the first. Someone with a granted second device can use either, just never both simultaneously.

**Shared (farm-owned) devices check farm membership before login, confirmed new requirement.** As designed so far, login only verifies *who someone is*, not whether they actually belong to the specific farm that owns the physical device in front of them. Without this check, someone with valid credentials for a different farm entirely could sit down at this farm's shared tablet and log into their own unrelated account, a misuse of the farm's own equipment, not a data-exposure risk (each person only ever sees farms they're actually a member of), but a real gap regardless. The fix: a Shared device checks the logging-in person's `PersonFarmMembership` against the device's own `farm_id` before allowing login at all, on top of the normal phone/password/MFA check.

**Per-device allowlist for Shared devices, confirmed, optional.** On top of the farm-membership check, an Owner (or Onboarding/Offboarding Administrator, matching the existing device-authority pattern) can optionally restrict a specific Shared device to a named list of Persons, a dairy-barn tablet limited to just the three people who actually work there, rather than usable by the whole farm's roster. Defaults to "any farm member" if nobody's set an explicit list, this is opt-in tightening for specific equipment, not a new requirement placed on every Shared device.

### 9.6 Alerts (Tier 2)
**Prototype today:** no equivalent exists, this is new backend-era functionality, not a prototype migration.
**Backend needs:** Database, Communications, SecurityAlert and NotificationRoute entities from Section 6.
**Scope correction, fully resolved:** email is eliminated as a delivery channel for **everyone with any login at all** (Section 6.7), not just App-only roles. This feature provides the underlying `SecurityAlert` data; the actual landing screen someone checks after getting that SMS lives on **Dashboard** (Section 9.1) for App users, or Oversight, Review, and Audit Trail (Section 11.6) for Portal-only users.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| AgriGuardian-managed email service | Canonical decision now tracked under Section 13, Infrastructure → Communications, it's a build-vs-buy infrastructure call, not an App-feature nuance. | See Infrastructure |

### 9.6a Messaging: PARKED
**Status: parked, not being built at this time.** The full design work in Section 7 (in-app messaging, MessageReview, the persistent logging label) remains intact below as reference, but this is a deliberate decision not to build it now, not an oversight.

**Why parked:** working through the actual use case (Section 7's design) against realistic adoption (would anyone actually use this over just texting the person's real number, which is faster and more familiar) surfaced a real risk: the feature could sit unused while people quietly default back to ungoverned personal texting anyway, meaning the engineering effort produces neither adoption nor the governance it was meant to provide. The two genuine needs identified along the way are already met elsewhere: wanting to reach a coworker quickly is served by tap-to-call (Section 7.6); anything that should attach to a specific device's record already has a home in the existing assign/escalate/resolve workflow with mandatory HandoffEvent notes (Section 9.2), a stronger, more purposeful place for device-specific communication than a loosely-tied chat message would be.

**Reactivate if:** (1) this is something farms actually ask for, or (2) its absence becomes a real security issue, specifically, evidence that people are relying on ungoverned personal texting for work communication in a way that creates the exact risk this feature was originally meant to prevent. Until either of those happens, this doesn't get built.

**Deferred items:** none tracked, this whole feature is parked, not mid-decision.

### 9.7 Reports and Audit (Tier 2)
**Prototype today:** `reports.js`, `report-viewers.js`, client-side PDF generation via `jsPDF`; `audit.js`, audit log storage/render.
**Backend needs:** Database (AuditLog is append-only, no update/delete path, Section 3.1). PDF generation can likely stay client-side for the App; server-side generation only becomes necessary if Vendor Dashboard needs bulk/cross-farm reporting later.
**Download is the point, not incidental:** every report and every audit-log view here is meant to be downloaded and printed, the same first-class treatment as the Portal's audit trail (Section 11.6), since these are the records a farm needs on hand for its own compliance, insurance, or business purposes, not just something to glance at on-screen.
**Considered and dropped:** additional report types (project scope, technical/non-technical assessment variants) beyond the existing Hygiene and Activity reports, no clear use case emerged when actually examined, so this isn't being pursued rather than left open indefinitely.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Server-side bulk reports | **Confirmed need, not speculative.** This is AgriGuardian's own proprietary knowledge, which specific farms have which specific vulnerable devices, data nobody else has visibility into, which is exactly why AgriGuardian is the only party positioned to act on it at scale. Two real functions depend on it: Third-Party Risk Monitoring and Alert Relay (Section 12.4), asking "which client farms have this device" in one cross-farm query when a new NVD/CISA finding hits, rather than checking each farm individually; and Implementation Specialist portfolio management (Section 12.2), seeing an entire assigned client portfolio's status at once rather than opening each farm's dashboard one at a time. Still deferred until Section 12's own buildout reaches this depth, but the need itself is confirmed, not conditional. | Deep-eval |

### 9.8 Vulnerability Checks (Tier 2)
**Prototype today:** `vulnerabilities.js`, direct browser calls to NVD (API key in a plain JS variable) and CISA (with a public CORS-proxy fallback).
**Backend needs:** Integrations (Infrastructure), both lookups move server-side; NVD key stored encrypted per farm; CISA feed cached and served internally instead of depending on a third-party proxy.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Production-grade hygiene scoring | Canonical decision now tracked under Section 13, Infrastructure → Integrations, same item as 9.2. | See Infrastructure |

### 9.9 Accessibility (Tier 2)
**Prototype today:** `accessibility.js`, large/XL text scaling, a full high-contrast stylesheet override, reduced motion, and colorblind mode. Confirmed real and substantial, not a stub.
**Backend needs:** Database, Backend API, preferences are person-level, not device-local (see below), so this needs real persistence, not just minimal backing.
**Known prototype defect to fix in production build:** every setting here is session-only, `a11ySettings` resets on reload, never persisted anywhere, for anyone.
**Preference persistence, confirmed:** settings sync to the **person**, not the device. Reasoning: for someone who depends on large text or high contrast to use the app at all, not as a convenience, losing that setup every time their phone gets lost, replaced, or swapped would be a real regression for exactly the population this feature exists to help. This holds regardless of how the separate device-count/device-binding question (Section 9.5) eventually gets resolved, even under the strictest possible one-device-at-a-time policy, devices still get replaced as a normal event, so preferences need to survive that regardless.

**Layout orientation preference, new, confirmed.** When Large or XL text is turned on, a new option becomes visible right there in the same Accessibility screen: a layout toggle, wider, landscape-style content blocks (Horizontal) or the standard narrower layout (Vertical), defaulting to **Horizontal** the moment Large/XL text is selected, since larger text needs the extra width to avoid excessive line-wrapping and scrolling. Vertical remains a real, one-tap choice to switch back to, not removed, just no longer the default once XL text signals someone needs the room. **Not physical device rotation, confirmed distinct:** this is a layout choice, not a request to the OS to rotate the phone, which apps can't reliably force anyway (a real gap flagged in Section 9.12 for iOS Safari specifically). The wider layout renders regardless of how the phone is physically being held. Same persistence rule as everything else here: tied to the **person**, syncs across their devices, survives a lost or replaced phone.

**Both text-size tiers (Large, XL) confirmed to stay, worth real user input, not just internal reasoning.** This design (and the two-tier structure generally) was reasoned through internally; actual input from visually impaired users would meaningfully improve it over guesswork.

**Deferred items:** none, resolved.

### 9.10 Internationalization (Tier 2)
**Prototype today:** `lang-data.js` (1,290 lines, the single largest file in the entire prototype), `set-lang.js` (479 lines, applies a language switch at runtime, including reapplying translations to cloned form elements), and `core.js`'s `t()` lookup function plus the `currentLang` global. A full bilingual EN/ES system covering every screen, form, and JS-generated string. Confirmed real and substantial, not a stub.
**Backend needs:** Database, Backend API, same pattern as Accessibility: a person-level preference, not device-local.
**Known prototype defects to fix in production build:** `currentLang` is session-only and resets on reload, same issue as Accessibility's settings. The prototype's own `FILE-MAP.md` also flags real translation-system defects worth carrying forward as engineering hygiene, not design decisions: duplicate keys in the `LANG` object (must dedupe, keeping the last occurrence, after any future additions), roughly 110 orphaned English-only keys, and some hardcoded English strings elsewhere in the app that bypass the translation system entirely.
**Preference persistence, confirmed, same reasoning as Accessibility (9.9):** language preference syncs to the **person**, not the device. Someone who needs Spanish, not English, to actually use the app shouldn't have to reselect it every time their phone changes, same logic, same conclusion, independent of the Section 9.5 device-count question.

**Translation quality, worth real native-speaker input, same principle as Accessibility (9.9).** The existing EN/ES translations were built without a Spanish-first-language reviewer; real input from someone who actually speaks Spanish as a first language would catch things internal review can't, tone, regional word choice, phrasing that's technically correct but doesn't read naturally.

**Distinct from user-facing resources (help content, user guides), confirmed.** This section covers the in-app UI string system (`lang-data.js`, `t()` lookups), short strings baked into the app itself. Longer-form user-facing documentation is a separate need, owned by the Technical Writer role (`GOVERNANCE.md` Section 2.2.2), and carries the same "not just AI translation" standard: real cultural and regional nuance is easy to miss trusting AI translation alone, native-speaker review is the actual quality bar for both.

**Deferred items:** none, resolved alongside Accessibility.

### 9.11 Responsive Layout and Viewport Behavior (Tier 2)
**Scope note:** most of this is a frontend/UI concern, not a backend one, tracked here only where it touches something backend-relevant (API payload shape, state persistence), not as a substitute for a real UI/design spec.

**Breakpoints:** phone portrait, phone landscape, tablet, Chromebook. Default assumption is CSS-only (layout reflow, not different data or logic), but this needs an explicit per-component check rather than a blanket assumption, since at least one case (nav) plausibly needs more than CSS: a collapsed hamburger/icon nav on phone vs. an expanded/always-visible nav on tablet or Chromebook isn't just a visual change if it means different nav items are fetched, pre-loaded, or rendered eagerly at the wider breakpoint. Needs a per-feature answer, not a document-wide one.

**Touch target sizing:** the one-handed, gloved-use principle driving touch target sizing on phone (Section 9's operational-use framing, someone working a device one-handed, often gloved, in a barn or field) doesn't stop applying at the tablet breakpoint. A Manager or Owner checking devices on a tablet is still frequently in the same physical conditions (gloves, one hand, outdoors). Tablet is a bigger screen, not a different use context. Sizing shouldn't shrink by default just because there's more room; any tightening at larger breakpoints needs a deliberate reason, not just "more room means it's fine to be smaller."

**Orientation change:** default assumption is that rotation is a pure layout event: active tab, in-progress form data, and scroll position persist client-side across the rotation, with no re-fetch from the backend triggered by orientation alone. This should hold in the common case, but needs confirming against any screen where content is meaningfully re-laid-out on rotation (e.g., a data table that reflows into cards). If the reflow changes what's actually rendered (not just how), that's worth flagging explicitly rather than assuming it falls under the same default.

**Viewport-dependent role UI (Manager/Owner data on tablet vs. phone), confirmed, resolved:** the same data everywhere, always the full dataset. The only real difference between phone and tablet is layout, how it's arranged and displayed, not what's fetched. No density/detail parameter on the endpoint; every client gets the same response and renders it according to its own screen. This also settles the layout-orientation question above, the App's job is adapting layout to the device and to the person's own accessibility needs (Section 9.9's new Horizontal/Vertical toggle), not withholding data based on screen size.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Breakpoint-dependent nav state | Confirm whether collapsed-vs-expanded nav is CSS-only everywhere, or needs different data/eager-loading behavior at wider breakpoints. | Quick |
| Touch target sizing at tablet breakpoint | Confirm the one-handed/gloved-use sizing principle carries through to tablet, not just phone, absent a specific reason to relax it. | Quick |
| Orientation-change state persistence | Confirm client-side-only persistence (no re-fetch) holds for every screen, especially ones where rotation reflows a table into cards or vice versa; the new Horizontal/Vertical layout toggle (Section 9.9) is a separate, deliberate choice from this, not the same thing as physical rotation. | Quick |

### 9.12 Browser and Platform Support (Tier 2)
**Status: two of three questions resolved this session; one genuinely remains, pending real device testing.** Cross-browser differences show up in a few distinct ways, not one general "browsers differ" concern:

- **Rendering/layout:** modern evergreen browsers (Chrome, Safari, Firefox, Edge) are close enough on standard CSS that this should be minor risk if the app sticks to well-supported features. The real exposure is older browsers lagging behind current CSS support, not something worth engineering around for locked-down or improperly-provisioned hardware specifically (see the resolved browser-floor item below).
- **Feature availability, resolved:** Safari, especially iOS Safari, has historically lagged Chrome/Android on push notifications and background sync. This doesn't create a real gap here, the notification system was designed SMS-first from the start (Section 6.2's "SMS + in-app, if reachable"), specifically because push was never assumed reliable on any platform. **Standing caution for all future feature work:** do not build any feature that relies on push notifications working without re-evaluating this decision first. In-app push stays supplementary, attempted when possible, never the sole channel a feature depends on.
- **Camera/GPS permission behavior, still genuinely open:** the device-scan-a-sticker flow (9.2) and one-time GPS capture (9.2) both depend on browser permission APIs, which behave differently across browsers, iOS Safari's camera/location prompts and behavior differ from Chrome's. If the app ships as a PWA rather than native, this is the likeliest source of "works on my phone, not theirs" bugs. This one genuinely can't be resolved by reasoning it through, it needs real testing on a real device once the app exists.

**Minimum supported browser/version list, resolved:** the standard, well-established convention, last 2 versions of each evergreen browser. No special accommodation for locked-down or improperly-provisioned secondhand hardware (e.g., a Chromebook still enrolled in a school district's management domain from before resale), that's a hardware-provenance problem outside what this software can or should solve for, and it aligns with a real stance this design already implies through the Dedicated/Mixed-use/Shared classification (Section 9.2): business work belongs on a proper business device, not whatever secondhand hardware happens to be at hand.
- **Touch/input quirks:** lower risk if custom gesture handling is avoided; standard touch targets should behave consistently.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Camera/GPS permission handling across browsers | Confirm permission-prompt and denial-recovery behavior for the sticker-scan (9.2) and GPS-capture (9.2) flows on iOS Safari specifically, since it's the most likely outlier. | Deep-eval |

### 9.13 Help and Account Support (Tier 2)

**Purpose:** two related but distinct things, previously missing from this document entirely. **Help/FAQ**: general how-to-use-the-app content. **Account contact form**: for issues specific to a person's own account (login trouble, MFA stuck, account behavior that seems wrong), not farm-level issues, which stay with the farm (Section 9.5's existing call-the-Owner pattern already covers those).

**Contact form routes straight to AgriGuardian (Internal Admin), not through the farm first** (see `SupportTicket`, Section 3.1, for the full reasoning). Receiving side is a real new feature too, not just a form, see Section 12.5.

**Two open questions, not yet decided:**
- **Help/FAQ delivery mechanism:** static content bundled into the app (simple, but needs a real app update to change a single word), or served from the backend so the Technical Writer role (`GOVERNANCE.md` Section 2.2.2, already established as owning help content) can update it without needing an app release?
- **Placement:** Settings is a natural fit for the contact form, since it's inherently account-level. Help/FAQ might warrant more visibility than being buried in Settings, worth a real decision rather than defaulting both there just because that's where the idea started.

**Backend needs:** Database, Backend API, Communications.
**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Help/FAQ delivery mechanism | Static (bundled) vs. backend-served (Technical Writer-editable without an app release). | Quick |
| Placement of Help/FAQ vs. contact form | Settings fits the contact form naturally; Help/FAQ may need more prominent placement. | Quick |

---

## 11. Web Dashboard (Portal) Branch: Full Feature Breakdown

**Structure:** Web dashboard is the Account Admin Portal side of Farm view, alongside App (Section 9). Unlike App, there is no functional prototype for any of this, the current static prototype has no portal surface at all. A visual mockup now exists (`portal.html`, with a full screen-by-screen design brief), giving this surface a concrete visual reference the way App already has a working prototype, though a mockup and a functional prototype aren't the same thing. Every feature below is still new backend-era design, built from what's already been decided in Sections 2-8, not migrated from existing code.

**On the step-up mechanism:** every feature in this section requires the Owner's elevated session (`auth_level = elevated`) to be active. Ownership of the mechanism itself is covered in Section 9.5; Web dashboard consumes the result, it doesn't produce it.

**Web-based, confirmed, not a native desktop app.** A native app was seriously considered for the device-level security control it could offer, but the real security ceiling turns out to be close to the same either way: **WebAuthn/passkey support** gives a web-delivered Portal the same hardware-backed device binding (Windows Hello, Touch ID, stored in the OS's own secure hardware) that a native app would provide, without the cost. A native app would mean separate Windows, Mac, and Linux builds, code-signing, notarization, and ongoing auto-update infrastructure, a substantial, continuous engineering commitment, plus real compatibility risk (older Windows versions still running on farm equipment, Mac, no browser-level abstraction handling that variance automatically). Portal's actual audience (Bookkeeper, Office Manager, occasional Owner access) is infrequent, business-admin use, not the high-frequency, high-security terminal case that usually justifies dedicated native software's cost. Web-based, with WebAuthn device binding, gets the real security property without that burden.

### 11.1 Farm Identity and Account Settings (Tier 2)
**Purpose:** Farm name, immutable account number, billing/contact email, physical address, subscription tier (view), the Owner-editable fields defined in Section 2.2's Owner portal bundle. This contact email is also the one place email survives as a security/billing-notification channel, used specifically for Tier 3 failed-authentication escalation and subscription cancellation (Sections 6.1, 11.2), a deliberately restrictive, farm-level use, not a personal notification channel for any individual.
**Backend needs:** Database, Backend API, Authentication and identity (the Portal itself requires step-up re-authentication to enter at all, per Section 2.3).
**Deferred items:** none yet.

### 11.2 Subscription and Billing (Tier 1)
**Purpose:** View plus manage (upgrade/downgrade/cancel), the primary domain for the Bookkeeper role (Section 2.4); Owner can also act here. Also where **seat/user count limits** are surfaced (view-only, plan-derived, not independently editable, since they come from the subscription tier itself). **Invoices and receipts are Portal documents, not mailed paper.** Stripe (Section 13.4) generates these automatically; the Portal surfaces them as easy one-click download and print, PDF format, no physical mail involved. This avoids the added cost and complexity of a mailing service while still giving a farm a real, printable paper copy for its own records whenever it wants one.
**Backend needs:** Database, Backend API, Communications, Authentication and identity, **Billing and payments** (Section 13.4, actual payment processing, new Infrastructure branch identified from this feature's requirements).
**Workflow correction:** the earlier design only specified "notify the Owner," which read as email-only, that contradicts the low-trust-email principle from Section 6.7 (email should never be the sole channel for anything urgent). A subscription cancellation is exactly the kind of event that principle was written for: someone who never sees the farm's security posture unilaterally shutting off the service the Owner depends on. This uses SMS + in-app push (Section 6.2's urgent delivery tier) plus the Farm's on-file contact email (Section 11.1), a third named exception to the email-elimination rule, alongside Tier 3 failed-authentication escalation, since losing the service entirely is severe enough to warrant it. It should also create a **persistent entry in Oversight, Review, and Audit Trail (Section 11.6) requiring explicit acknowledgment**, not just a transient notification the Owner could miss or dismiss without ever seeing it.
**Deferred items:** none yet.

### 11.3 Business Apps and Accounts (Tier 2)
**Purpose:** The full-edit counterpart to what the App shows read-only (Section 9.3), banking, feed/seed ordering, Amazon business, MFA tracking, renewal/cost. Office Manager's primary domain (Section 2.4); Owner can also edit.
**Backend needs:** Database, Backend API. This is the canonical source of truth: the App's Apps and Backups (view) feature reads from here, never the other way around.
**Deferred items:** none yet.

### 11.4 Account Administration for People (Tier 1)
**Purpose:** Broadened from an earlier, narrower scope of "Portal-only roles", this feature now covers **sensitive account-level settings for any person, regardless of which surface their role lives on.** The unifying logic: these are all actions that need the Owner's Portal step-up specifically, not day-to-day role/permission management (that stays in the App's Team and roles, Section 9.4). Concretely, this feature covers:
- Viewing and managing who currently holds the Bookkeeper, Office Manager, and Onboarding/Offboarding Administrator roles (Section 2.4), the third Portal-only role, added later in this design process and missing from an earlier version of this list.
- Granting or revoking **any** `PermissionGrant` (Section 3.1), `MessageReview` was the originally planned first concrete example, though that's now parked alongside the Messaging feature itself (Section 9.6a); the entity itself remains general (any `resource_type`, any one-off extra beyond a role's default bundle), and this feature is where all of it gets managed whenever a real example does need it. Every grant here carries its mandatory reason and lands in the audit trail (Section 11.6), same as any other account-administration action.

**Note, scope correction:** an earlier version of this feature also covered setting/changing any person's `notification_email`. That field was eliminated entirely (Section 6.7), so this capability no longer applies. There's nothing left to manage there, for anyone.

**This is a management view only. It does not have its own invite mechanism.** Confirmed decision: invitations for any role, App or Portal, go through the one unified Invitation flow in Section 5. This feature is where the Owner sees and adjusts account-level settings for people who already exist, not where an invite gets sent.
**Backend needs:** Database, Backend API, Authentication and identity.
**Deferred items:** none, Section 5 (the invitation edge cases that apply here, since the flow is shared with the App) is now fully resolved: new invite supersedes old, Owner can revoke with a required reason, and incomplete MFA blocks all access with a 10-day auto-cleanup for abandoned enrollment.

### 11.5 Notification Routing (Tier 2)
**Purpose:** Configuring `NotificationRoute` entries (Section 6.6), role-based CC (e.g., the Bookkeeper automatically copied on billing changes) or ad hoc external recipients (e.g., an outside auditor), each requiring a reason and, for external recipients, a recommended expiration.
**Backend needs:** Database, Communications.
**Deferred items:** none yet.

### 11.6 Oversight, Review, and Audit Trail (Tier 1)
**Purpose:** The step-up-gated review queue for `SecurityAlert` (Section 6.4), fully active, and `MessageReview`, which is **parked alongside the Messaging feature itself** (Section 9.6a) and not being built until/unless that's reactivated. **Plus general audit-trail browsing scoped to Portal-relevant events**: who changed the billing email, when a permission grant was issued, when the subscription was last modified, changes made in Account Administration for People (Section 11.4). Also carries **persistent, acknowledgment-requiring entries for Bookkeeper-initiated subscription cancellations or downgrades** (Section 11.2). These are urgent enough to need a confirmed "the Owner saw this," not just a passive log line. This is distinct from the App's Reports and Audit (Section 9.7), which covers device/network hygiene reporting, not account-administration history. All of it draws from the same underlying `AuditLog` (Section 3.1). This feature is simply the Portal-scoped lens onto it, the same way Reports and Audit is the App-scoped lens. **Download/export is a first-class part of this feature, not an afterthought:** any view here, a date range, an event type, the full history, can be exported (PDF for a formatted record, CSV for raw data), since this is exactly the kind of record a farm needs to produce for an insurance claim or a compliance audit, not just review on-screen. The same filtering (date range, event type) is a real on-screen feature too, not just an export-time detail, so nobody has to scroll the full unfiltered history to find something specific.
**Backend needs:** Database, Authentication and identity, Communications.
**Step-up scope, confirmed, resolved:** step-up gates entry to Portal **as a whole**, not per-action within it. Once someone's stepped up, browsing around inside, including just looking at the log-only SecurityAlert feed or the audit trail, doesn't require a second gate. Re-checking on every click would just be re-litigating trust already granted at the door; the step-up's actual job is deciding whether someone's in Portal at all, not micromanaging what they look at once they're there. This was deliberately left open earlier, before Web dashboard had real shape (real billing/PCI-scoped payment data, Account Administration for People, the audit trail itself). Revisited now that it does.

### 11.7 Managed Email Administration (Parked)
**Purpose:** Creating farm mailboxes, assigning them to people, billing, the administrative half of the parked AgriGuardian-managed email idea (Section 6.8). Daily use (the lightweight SSO access point) lives in the App, not here. This feature is purely the admin side.
**Backend needs:** Communications, Backend API.
**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Whole feature | Parked pending the build-vs-reseller decision already noted in Section 6.8, not worth detailing further until that's resolved. | Parked |

### 11.8 Device Group Management (Tier 2)

**Purpose:** bulk management for devices that function together as one system, a master controller and its moisture sensors, say, rather than treating each device as fully independent when the reality is a real, retirable-together group. Solves a genuine gap: a whole-system swap (an entire sensing approach replaced with a fundamentally different one, not a like-for-like device exchange) doesn't fit cleanly into a one-to-one device replacement model, and forcing it there would misrepresent how messy the actual transition often is.

**Portal-only, deliberately.** Bulk actions affecting a whole group can have a real, outsized impact on farm operations, so this lives behind the Portal's existing step-up friction on purpose, the same speed-bump principle already used elsewhere in this design (Mixed-use device restraint, Section 9.2; Portal step-up generally, Section 2.3). This isn't just "where the tooling happens to be built," it's a deliberate match between the friction and the real stakes of the action.

**Both granularities are real, confirmed:** a group can be acted on as a whole (archive the entire retired system, stand up a whole new group in its place), or an individual device within the group can still be archived or replaced on its own, exactly as it already works outside a group. Membership doesn't lock a device into only-group-level actions.

**Exclusive membership, confirmed (Section 3.1):** one device belongs to at most one group at a time. A device needing a different kind of grouping later (by season, by maintenance schedule) would be a genuinely separate concept from this operational Device Group, not a reason to make this one non-exclusive.

**Backend needs:** Database, Backend API, Authentication and identity (Portal step-up, per Section 2.3).
**Deferred items:** none yet.

---

## 12. Vendor Dashboard Branch: Initial Feature Breakdown

**Structure:** Vendor dashboard is the AgriGuardian-staff-facing side of the backend, confirmed as internal-only and never seen by farm customers. A visual mockup now exists (`vendor.html`), the same kind of reference Portal has (Section 11). The backend design itself remains genuinely new territory: most of what follows was identified in this session, not carried forward from prior design work, and should be expected to keep developing as real questions surface (confirmed explicitly when the Managed/Self-Serve distinction was discussed).

### 12.1 Staff Identity and Access Model (Tier 1)
**Confirmed as its own genuine gap, not a minor missing detail:** everything built so far in this section describes *what* Vendor dashboard's users can do (client roster management, Implementation Specialist write-access, risk monitoring), but never who they are as system identities, how they authenticate, how they get onboarded, or what session/device security applies to them. This deserved its own dedicated identity model, the same way Section 2 built one for the farm side.

**Why this arguably needs *stricter* treatment than anything designed for the farm side, not the same or looser:** a compromised Vendor dashboard account has a much larger blast radius than a compromised farm account. One farm's Owner account being breached exposes that one farm; one Internal Admin account being breached potentially exposes every farm on the platform.

**Staff are a structurally separate entity from `Person`, confirmed, not a flag on the existing model.** `Person` (Section 3.1) was deliberately built farm-agnostic specifically to allow someday belonging to multiple farms, but Internal Admin doesn't belong to any farm at all, and Implementation Specialist's relationship to a farm is fundamentally different in kind (temporary work assignment, not membership). Stretching `Person` to also cover "works for the vendor across every client" would blur two genuinely different concepts under one entity. Keeping staff in their own table is also a real defense-in-depth wall: a breach of one population's identity table doesn't automatically compromise the other, the same instinct already behind separate App/Portal session tokens and the separate `PlatformSecurityEvent` table.

**New entities:**
- **`VendorStaff`**: name, contact info, `staff_role` (Internal Admin / Implementation Specialist, its own small role catalog, separate from the farm-side one in Section 2.4), status. Not a `Person`.
- **`StaffFarmAssignment`**: the mechanism that makes "Implementation Specialist access is scoped only to farms currently assigned to them" (Section 12.3) actually real, rather than just a sentence. Internal Admin doesn't need this at all, their access is blanket by design.

**Flagged, not yet resolved:** `AuditLog` (Section 3.1) currently assumes every actor is a `Person`. Now that `VendorStaff` exists as a separate entity, every log entry needs to reference *either* a Person *or* a VendorStaff, a real technical detail to work out, not a blocker to the identity-model decision itself.

**Staff authentication method, confirmed, resolved: a real company identity provider (Google Workspace, Okta, or similar), not the farm-side phone+password+MFA model.** The reasoning: phone+password+MFA exists for farm users specifically because they have no existing corporate identity to lean on, a Farm Hand's phone is genuinely the only trustworthy anchor available. AgriGuardian's own staff are the opposite case: W-2 employees or contractors who either already have or should have a company identity of some kind. Reusing the farm-side model for staff would mean building a second, bespoke authentication system for internal use only, recreating what mature identity providers already do well (employee lifecycle management, centralized MFA enforcement, instant deprovisioning on departure, conditional-access and device-compliance features built in). This also reinforces the `VendorStaff`/`Person` separation at the infrastructure level, not just the data-model level. Staff authenticate through a genuinely different system, not just a different table using the same login mechanism.

**Staff onboarding mechanism, confirmed, resolved: no bespoke flow needed, follows through directly from the identity-provider decision.** Two-step model, mirroring how any company onboards a new employee:
1. **The identity-provider account is the real onboarding event**: when AgriGuardian hires someone, IT/HR creates their Google Workspace or Okta account the normal way, entirely outside this system. That's the actual "this person now exists" moment, same as any new hire getting a company email.
2. **An Internal Admin creates the corresponding `VendorStaff` record**: linking to that already-existing identity-provider account (selected from the company directory, not typed freeform) and assigning `staff_role` (Internal Admin or Implementation Specialist), plus any initial `StaffFarmAssignment`s if starting as an Implementation Specialist.

This doesn't need its own invitation system the way the farm side does (Section 5), because the reason that flow exists, a farm has no pre-existing relationship with AgriGuardian to lean on, so it has to create identity from scratch via SMS and credential setup, doesn't apply to staff. The identity-provider account already establishes who they are before this system is ever involved; the `VendorStaff` record just recognizes an existing identity and attaches a role; it doesn't create one.

**Staff session/device security, confirmed, resolved: yes, stricter than the farm side, via the identity provider's own built-in conditional-access features, not a custom-built mechanism.** Google Workspace and Okta both ship conditional access/device-compliance policies as standard, requiring a managed device, enforcing MFA on every login rather than once, shortening session lifetimes, restricting by location, blocking unrecognized devices entirely. This is exactly the stricter treatment the blast-radius argument called for, already mature and well-documented in these products. This reframes the work from "design a new security model" to "configure the identity provider's existing settings once a specific provider is selected", an operational/IT setup task, not a further design question. Genuinely different in kind from the PCI-DSS and Shared-device-Portal-access items (Section 9.2/10.4), those needed an outside compliance professional's judgment call; this is a standard, well-trodden configuration task any competent admin of that platform can execute directly.

**Section 12.1 is now fully resolved.** Every question this thread raised (staff-as-separate-entity, authentication method, onboarding mechanism, session/device security) has a confirmed answer.

### 12.2 Client Roster and Service-Level Management (Tier 2)
**Purpose:** Viewing every farm client, Managed or Self-Serve, and changing a farm's `service_level` (Section 3.1) over time, confirmed that a farm can move in either direction, not a permanent choice made at signup. **A real portfolio view for Implementation Specialists is a confirmed need here**: seeing every assigned client farm's status at once, not opening each one's dashboard individually, depends on server-side bulk reporting (Section 9.7).
**Backend needs:** Database, Backend API.
**Deferred items:** none yet beyond the bulk-reporting dependency already tracked in Section 9.7, this branch is too new to have surfaced other real open questions beyond its basic existence.

### 12.3 Implementation Specialist Operations (Tier 2)
**Purpose:** On-site setup and ongoing support for Managed farms. An Implementation Specialist (Section 2.2), deliberately not called "Technician," to avoid colliding with the farm-side role of the same name, needs real write access to a Managed farm's device, network, and team data, scoped only to farms currently assigned to them.
**Backend needs:** Database, Backend API, Authentication and identity.
**Write-access visibility, confirmed, resolved:** Implementation Specialist actions show the **real actor** in the farm's own audit trail, "Implementation Specialist [name] added this device", never fabricated to read as if the Owner or Manager did it. This is the only option consistent with non-repudiation as a hard principle throughout this design; making an AgriGuardian employee's action read as someone else's would be a fabricated audit trail, not a simplified one. A Managed farm chose this service specifically to have someone else handle setup, so seeing the Specialist's name attached to that work is an accurate reflection of the service, not a confusing surprise.

### 12.4 Third-Party Risk Monitoring and Alert Relay (Tier 2)
**Purpose:** Continuous, cross-farm monitoring of third-party feeds (NVD, CISA, potentially others later) with automated matching against **every farm's** registered device inventory, pushing relevant findings down as alerts, regardless of service tier. Distinct from the App's on-demand Vulnerability Checks (Section 9.8), that's farm-initiated and single-farm; this is Vendor-side, proactive, and watches every farm at once. Confirmed to be largely automated. The system does the matching; human involvement is for exceptions and oversight, not a dedicated headcount-per-farm role. **A real dependency on server-side bulk reporting (Section 9.7)**: when a new finding hits, asking "which client farms have this device" as a single cross-farm query is exactly what that reporting capability needs to exist for.
**Backend needs:** Database, Backend API, Integrations, Communications.
**Coverage, confirmed, resolved: applies to Managed farms too, not just Self-Serve.** Since this monitoring is automated, there's no real cost or effort difference in extending it to every client, and the purpose of the whole product is cyber hygiene, which makes withholding a known-vulnerability alert from anyone, regardless of service tier, directly counter to that purpose. Implementation Specialist support for Managed farms is a genuinely different kind of coverage (hands-on setup and ongoing account support), not a substitute for automated feed-matching against known threats. The two aren't interchangeable.

**Deferred items:**
| Item | Note | Tag |
|---|---|---|
| Additional third-party feeds | Which sources beyond NVD/CISA might get added over time (other national vulnerability databases were mentioned as a possibility). | Parked |

---

### 12.5 Support Ticket Triage (Tier 2)

**Purpose:** the receiving side of the App's new account contact form (Section 9.13). A real inbox/triage view for `SupportTicket` (Section 3.1) records, since account-specific issues (login trouble, MFA stuck, account behavior that seems wrong) route straight to AgriGuardian, not through the farm. Internal Admin sees incoming tickets, assigns them (to themselves or another Internal Admin), and tracks status through to resolution.
**Backend needs:** Database, Backend API, Communications.
**Deferred items:** none yet, this is a newly-identified feature, too new to have surfaced open questions beyond its basic existence.

---

## 13. Infrastructure Branch: Deferred Items

Infrastructure's seven sub-branches (Database, Backend API, Authentication and identity, Communications, Integrations, Hosting and secrets, Billing and payments) don't get a full feature-by-feature breakdown yet, per standing decision. That level of detail gets added only as real conversations produce it, not pre-emptively. The items below are the real items to surface so far, several moved here from an App or Web dashboard feature where they had been living under a feature-level label rather than their actual infrastructure home. Each affected feature keeps a "See Infrastructure" pointer card rather than a duplicate entry, so there's one place status/details actually live.

### 13.1 Authentication and Identity
**No deferred items.** The one item previously here (Owner notification email change) is now moot. `notification_email` was eliminated entirely for everyone with a login, App or Portal, Owner included (Section 6.7). There was never a mechanism left to design.

### 13.2 Communications

**Transactional SMS and email providers, confirmed, a real gap this document never actually closed.** SMS is used constantly and load-bearingly throughout this design (invitation tokens, MFA codes, lockout escalation, every notification); email to the Farm's contact address is used for two specific severe cases (Section 6.1, Section 11.2). Neither had an actual named provider anywhere in this document, despite being among the most depended-upon real infrastructure in the whole system.

- **SMS: Twilio.** The dominant, well-documented standard for exactly this use case, verification codes and transactional messaging. Mature Python SDK, the same "reputable, well-documented, standard default" reasoning already applied to choosing Stripe for payments (Section 13.4).
- **Email: SendGrid.** A standard, well-documented transactional email provider with a mature Python SDK and low onboarding friction, the same reasoning already applied to choosing Python itself (Section 14.1). Not tied to a specific cloud host, since Hosting and secrets hasn't been decided yet; this choice holds regardless of where the backend eventually runs.

| Item | Note | Tag |
|---|---|---|
| AgriGuardian-managed email service | A reseller-based professional email add-on (Google Workspace/Microsoft 365 under the hood, Section 6.8), reframed as a cyber-hygiene mission (moving farms off risky personal webmail), not just a revenue idea, though revenue is a reasonable side effect. Referenced from 9.6. A genuinely different thing from the transactional SMS/email providers above, this is farms' own business email, not AgriGuardian's backend sending texts and notifications. | Parked |

### 13.3 Integrations
| Item | Note | Tag |
|---|---|---|
| Production-grade hygiene scoring | Replace today's demo-only percentage-average placeholder with real CVSS scores, NVD data, manufacturer lifecycle APIs, and network topology, including designing the actual weighting/aggregation formula itself. **Confirmed direction, still needs real research:** the same finding shouldn't always carry the same weight, MFA absence or a default login can matter more or less depending on the device's purpose and context (a payment-adjacent system versus a simple field sensor, say), not a flat severity table applied uniformly everywhere. This is a genuine research project, well-suited to a GRC-track contributor rather than engineering alone: mapping real severity factors against actual device context, the same kind of risk-assessment work already described in `CYBERSECURITY-LEARNING-MAP.md`'s Oversee and Govern category. Feeds Devices and Network (9.2) and Vulnerability Checks (9.8) in the App. Referenced from both. | Deep-eval |

### 13.4 Billing and Payments
**New branch, identified while building out Web dashboard's Subscription and Billing feature (Section 11.2).** Upgrade/downgrade/cancel means actual money moving: a payment gateway, invoicing/receipts, and PCI-DSS compliance considerations, none of which fit naturally under Integrations (which is specifically security data feeds, NVD, CISA, a different compliance domain entirely from handling payments). Deliberately kept as its own branch rather than folded into Integrations, so the two very different regulatory contexts (vulnerability data vs. financial transaction processing) don't blur together.

**Architecture, confirmed:** **Stripe** (or an equivalent reputable gateway), using its **hosted tokenization** (Stripe Elements/Checkout) rather than handling raw card data directly. Building payment processing in-house was never a real option at this company's size. Real payment infrastructure (card networks, fraud detection, chargebacks, international compliance) takes years and dedicated teams; a reputable gateway is the standard default. Stripe specifically fits well because it has built-in subscription/recurring-billing support out of the box, matching what Subscription and Billing actually needs. With hosted tokenization, **raw card numbers never touch AgriGuardian's own servers at all.** The card form is rendered by Stripe inside the page, the data goes straight to Stripe, and AgriGuardian only ever receives a token. This collapses PCI-DSS scope to its lightest tier, SAQ A (Self-Assessment Questionnaire A, the lowest-burden compliance level, available specifically because AgriGuardian's own servers never touch card data), by architecture, not through careful manual handling.

| Item | Note | Tag |
|---|---|---|
| PCI-DSS compliance confirmation | Formal confirmation that the Stripe-hosted-tokenization architecture actually satisfies PCI-DSS for this specific setup is a real compliance sign-off, not something to decide from best-practice knowledge alone. **Same underlying need as the Shared device Portal access item (Section 9.2)**, both are genuinely the same kind of outside cybersecurity/compliance consultation, worth bringing to the same professional in one engagement rather than as two separate conversations. | Expert |

Database, Backend API, and Hosting and secrets have no deferred items yet, genuinely blank, not under-tagged. They'll get entries here the same way, only once a real one comes up. Note also: Hosting and secrets' vault scope explicitly includes third-party credentials stored in Business Apps and Accounts (Section 11.3, banking logins, Amazon business logins), not just AgriGuardian's own internal API keys.


---

## 14. Technology Stack Decisions

**Status: confirmed as a working default, explicitly open to revision.** These are real decisions, not placeholders, but they're made without a security-background engineer/mentor in the room yet (see `GOVERNANCE.md` for the mentor role and escalation path). If a mentor or advisor with real production security experience makes a stronger case for a different choice once they're on board, that argument should win. This section documents *why* the current call was made, specifically so that future discussion has something concrete to argue with or against, not so it's treated as unchangeable.

### 14.1 Backend language and framework: Python + FastAPI

**Decided,** for three converging reasons, no single one would have been enough alone:

- **Supply-chain security, backed by current data, not general reputation.** As of the 2025 reporting year, npm now accounts for roughly 90–99% of all open-source malware detected across major package registries (Sonatype, ReversingLabs), while PyPI malware volume actually *declined* about 43% after PyPI rolled out mandatory two-factor authentication and "trusted publishing" for maintainers. This isn't a case of "Python is inherently safer than JavaScript". It's that the two registries currently have different real-world attack volume, and PyPI's registry-level controls are demonstrably working better right now. Since Section 1.1's core principles already treat "defense in depth" and "fail-safe defaults" as non-negotiable, and since the single biggest realistic risk to a small team's codebase is a compromised dependency (not a mistake in code the team wrote itself), this is a genuinely material factor, not a tie-breaker.
- **Secure-by-default framework behavior.** FastAPI uses Pydantic to validate every piece of incoming data against an explicitly defined shape before it ever reaches application logic. A student can't accidentally skip input validation the way it's easy to in a loosely-configured Express/Node setup, because the framework requires the shape to be declared up front. That directly supports keeping real rigor without it becoming a barrier to students learning here.
- **Lowest onboarding friction for the intended contributor base.** Python is now the dominant first-taught language at top CS departments nationally (roughly 80% of top-10 CS programs, ~69% of top-39, per 2025/2026 ACM-sourced data), meaning most students who'd plausibly join this project already have a foundation in it before ever touching this codebase.

**Explicitly not decided on "Python is a more secure language than JavaScript" as a blanket claim.** That claim isn't well-supported and isn't the actual argument here. The argument is current registry attack data plus framework defaults plus contributor fit, together.

### 14.2 Database: PostgreSQL

**Decided,** for reasons tied directly to this document's own data model (Section 3):

- **Native Row-Level Security (RLS)**: Postgres can enforce "a query can only ever see rows belonging to the requesting farm" as a database-level rule, not just an application-layer filter. This is a direct, concrete instance of the "security boundaries are structural, not just query filters" principle already stated in Section 1.1. It means even a bug in application code that forgets to scope a query by `farm_id` still can't leak another farm's data, because the database itself refuses to return those rows. MySQL/MariaDB has no equivalent native feature.
- **Strong fit for this document's relational integrity rules**: the append-only `AuditLog`, the never-delete-only-`revoked_at` pattern on `RoleAssignment`, and the cross-referencing between `Person`, `PersonFarmMembership`, `RoleAssignment`, and `PermissionGrant` (Section 3.1) all depend on strict foreign-key relationships and transactional integrity, which Postgres handles maturely and predictably.
- **Mature, free, widely hosted**: supported natively by most cloud providers (AWS RDS, Render, Railway, Supabase), well-documented, large community, no licensing cost.

### 14.3 Standards and tooling

- **Style/formatting:** PEP 8, enforced automatically via **Black** (auto-formatter) and **Ruff** or **Flake8** (linter), removes formatting debates entirely, which matters for a rotating group of student contributors with different habits.
- **Type checking:** Python type hints, checked with **mypy**, not as strict as TypeScript's compiler by default, but closes a meaningful gap versus untyped Python, and pairs with FastAPI/Pydantic's runtime validation for defense in depth (static check *and* runtime check, not just one).
- **Security-specific linting:** **Bandit**, flags common Python security mistakes (hardcoded secrets, unsafe deserialization, etc.) automatically on every change, regardless of who wrote it.
- **Dependency scanning:** **pip-audit** or **Dependabot**, run automatically, directly addresses the supply-chain risk that was the primary reason for choosing this ecosystem in the first place; picking Python doesn't mean this risk goes away. It means the baseline exposure is currently lower and the tooling to keep it that way is mature.

**Revisit trigger:** this whole section should be actively revisited, not just passively open, the moment a mentor/advisor with real production security experience joins and has a considered opinion. That conversation should happen before any significant amount of code is written against these choices, not after.

---

*This document should be uploaded into project knowledge manually, same as delivered zips, so future sessions can reference it directly rather than relying on conversation history.*

Last revised: 0710261518
