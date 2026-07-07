# AgriGuardian — How the code is organized

**The short version:** the app is one big file split into ~23 small files. The small files
are the real thing you edit. There is no longer a single `app.js` — do not bring it back.

---

## The three folders

```
index.html              ← the page; loads every module in order (see below)
styles.css              ← all styling
lib/
  jspdf.min.js          ← the PDF library. Vendored — never edit this.
js/
  risk.js  reports.js  hygiene.js  dashboard.js  devices-list.js  audit.js
  permissions.js  accessibility.js  vulnerabilities.js  devices-detail.js
  settings.js  networks-data.js  networks.js  apps.js  team.js  auth-ui.js
  report-viewers.js  auth-flow.js  session.js  devices-resolve.js  nav-drawer.js
  i18n/
    lang-data.js        ← all EN/ES translation strings (the LANG object)
    core.js             ← translation helpers + build timestamp
    set-lang.js         ← switches the language on screen
```

## What each file does

| File | Responsible for |
|---|---|
| `i18n/lang-data.js` | Every English/Spanish string |
| `i18n/core.js` | `t()` translation helper, build timestamp |
| `i18n/set-lang.js` | Re-render the UI when language changes |
| `risk.js` | Risk scoring + the demo device data |
| `reports.js` | PDF / email reports |
| `hygiene.js` | Hygiene score |
| `dashboard.js` | Dashboard alerts and list |
| `devices-list.js` | Device list, archive, filters |
| `audit.js` | Activity / audit log |
| `permissions.js` | Roles, permissions, escalation |
| `accessibility.js` | Accessibility settings |
| `vulnerabilities.js` | CISA / NVD checks |
| `devices-detail.js` | Device detail screen, add device, assign (also the collapsible-section helper) |
| `settings.js` | Farm settings + team management |
| `networks-data.js` | Network + app risk data |
| `networks.js` | Network screens + add/edit/delete |
| `apps.js` | Apps inventory + backup screen |
| `team.js` | Team invites + farm config |
| `auth-ui.js` | Login steps + entering the app |
| `report-viewers.js` | In-app report viewers |
| `auth-flow.js` | Registration + MFA send |
| `session.js` | Session timeout + verify |
| `devices-resolve.js` | Verify / resolve / replacement flow |
| `nav-drawer.js` | Right-side navigation slide-out (open / drag / close) |

---

## Why load order matters

These files are **plain scripts sharing one global space** — there are no imports.
A function defined in one file is just available to the others once the page has loaded.
So the order the files load in `index.html` must match `module-load-order.json`.
If the two ever disagree, fix them to match.

---

## Retire the big file (do this once)

Verified state of the project: **`app.js` is already gone** — good, nothing to do there.
The only leftovers to clear are the three split scripts:

1. Delete or move **`split-app.py`**, **`split-app.js`**, **`split-app.ps1`** out of the project.
   (These chopped the old big file into modules. Running any of them now would
   overwrite your module edits with a stale copy — that's the exact problem we're ending.)
2. Keep `module-load-order.json` — it documents the load order.

Once those three scripts are gone, the project is modules-only. From now on, edit the
small files directly — there is no big file to keep in sync.

---

## Everyday workflow

- **Change behavior?** Edit the relevant `js/…` file directly.
- **Change wording?** Edit `js/i18n/lang-data.js` (keep the EN and ES sides in step).
- **Before you package or share a build,** run the checker:

  ```
  python3 validate-split.py
  ```

  It confirms every file still parses, nothing is declared twice, and every button
  is wired to a function that exists. Green = safe to ship.

## Adding a brand-new module

1. Create `js/your-file.js`.
2. Add `<script src="js/your-file.js"></script>` to `index.html` in the right spot.
3. Add the same path to `module-load-order.json` in the same spot.
4. Run `validate-split.py`.

---

## Known tidy-up (not urgent)

There are currently two separate collapsible-section systems: Settings uses
`toggleSettingsSection`, while the device and network detail screens use the newer
`collapsibleSection` / `toggleCollapse`. Both work; they could be merged into one later.
