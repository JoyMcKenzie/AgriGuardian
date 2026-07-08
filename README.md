# AgriGuardian

## Project Status & Legal Notice

This is an individual student project developed by Joy McKenzie for academic and portfolio purposes. All Rights Reserved. See the [LICENSE](./LICENSE) file for full terms.

***

A farm cyber-hygiene tool that reframes cybersecurity as routine maintenance — tracking the digital health of devices, networks, apps, and backups the same way a farm already tracks equipment upkeep.

[**Live demo →**](https://joymckenzie.github.io/AgriGuardian/)

> ⚠️ This is a front-end prototype ("scale model") for demo and pitch purposes. There is no backend — all data is realistic but pre-loaded and in-memory.

## What it is

AgriGuardian answers a simple question: what does a practical cybersecurity tool look like when it's built for farms? Instead of abstract threats, it presents cyber-hygiene as concrete, familiar problems — a device still on its factory password, a cloud account missing MFA, a backup that's never been restore-tested. The security concepts underneath (least privilege, defense in depth, audit logging) are all there; they're just expressed in the language of farm work.

## Features

* **Dashboard** — summary cards for device, network, app, and backup problems, plus a "Returned to you" count for supervisors. Each number links straight to the relevant tab.
* **Devices** — connected-equipment inventory with color-coded status based on default passwords, manufacturer support, known CVEs, and update habits. Resolving an issue requires recording what was actually done.
* **Network** — record network segments (admin, guest, IoT, camera) and encourage segmentation of trusted traffic.
* **Apps** — a farm-software inventory tracking MFA, password-manager use, account owners, and last-reviewed dates.
* **Backups** — status against the 3-2-1 rule (three copies, two media types, one offsite), with stale restore-verification flagged.
* **Hygiene report & activity log** — printable/exportable summaries of the farm's digital health and a record of who did what.
* **Role-based access** — Owner, Manager, Technician, and Farm Hand each see a tailored subset of screens and permissions.
* **Invite flow** — SMS-style onboarding where an Owner invites a worker by name, phone, and role.
* **English / Spanish** language toggle and accessibility modes (high-contrast, color-blind-friendly).

## Security principles demonstrated

The prototype is designed to show cybersecurity discipline, not just UI:

* **Least privilege** — roles see different tabs; only Owners can hard-delete records or change global settings.
* **Defense in depth** — risk is scored across devices, networks, apps, and backups, not a single layer.
* **Audit logging** — sign-ins, fixes, returns, updates, backup checks, and invites are all recorded.
* **Escalation & ownership** — workers can _return_ work they can't finish, with a reason, so issues get handed up rather than dropped.
* **Non-repudiation** — resolving an issue requires recording the specific action taken.
* **Backup discipline** — untested backups are treated as risk, not comfort.
* **Session hygiene** — idle sessions show a countdown and can sign out, protecting shared farm devices.

## Try the demo

Open the [live demo](https://joymckenzie.github.io/AgriGuardian/) and choose any path from the login screen:

* **Sign in** with a demo account to see a specific role:
  * Owner — Angus MacDonald
  * Manager — Carlos Mendez
  * Technician — Sarah Tully
  * Technician — Joni Dear
  * Farm Hand — Jamie Ortiz
* **I have an invite** — enter code `987654` to see how a new worker (Casey Aitch) joins a farm.

No real phone number or password is required. All sign-in paths go through a unified MFA flow.

## What this is not

* Not a production app — no real backend, live device scanning, or persistent database.
* Not connected to actual farm equipment, cloud accounts, or backup systems.
* Not a vulnerability scanner — it's a manual tracking and accountability tool that helps farms organize security work they already know they should do.

## Timeline

A running log of major milestones. Full technical detail for every change lives in [CHANGELOG.md](./CHANGELOG.md); this is the high-level view.

* **2026-07-08**: favicon, Open Graph, and Twitter share-card tags added, so the live demo link shows a proper title, description, and preview image when shared.
* **2026-07-07 (night)**: owner-only report email field fixed, and the app packaged through several version snapshots (v15 through v17).
* **2026-07-07**: Spanish localization rebuilt on a single translation architecture, every UI string now routes through one lookup, so English and Spanish stay in sync.
* **2026-07-07**: full visual redesign, sage color theme, right-side slide-out navigation drawer, standardized color palette, and a visual style guide added to the repo.
* **2026-07-07 (early hours)**: device detail screen rebuilt with collapsible sections and a single consolidated decision flow for Managers and Technicians.
* **2026-07-06**: Farm Hand role experience audit, several role-based access control gaps fixed, and the network detail screen rebuilt with the same collapsible pattern.

****

_Work in progress. Features, layout, and wording may change as the concept evolves._
