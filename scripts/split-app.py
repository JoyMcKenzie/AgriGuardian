"""Split monolithic app.js into lib/ + js/ modules. Run: python scripts/split-app.py"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "app.js").read_text(encoding="utf-8")
lines = src.splitlines(keepends=True)
total = len(lines)

def slice_lines(start: int, end: int) -> str:
    return "".join(lines[start - 1 : end])

def write(rel: str, header: str, start: int, end: int) -> None:
    full = ROOT / rel
    full.parent.mkdir(parents=True, exist_ok=True)
    content = header + slice_lines(start, end)
    full.write_text(content, encoding="utf-8")
    print(f"wrote {rel} ({content.count(chr(10))} lines)")

modules = [
    ("lib/jspdf.min.js", 1, 399, "/* AgriGuardian — bundled jsPDF (do not edit) */\n"),
    ("js/i18n/lang-data.js", 401, 1689, "/* AgriGuardian i18n — translation strings */\n"),
    ("js/i18n/core.js", 1690, 1731, "/* AgriGuardian i18n — runtime helpers (t, timestamps) */\n"),
    ("js/risk.js", 1733, 1797, "/* AgriGuardian — risk scoring & demo devices */\n"),
    ("js/reports.js", 1799, 2049, "/* AgriGuardian — PDF / email reports */\n"),
    ("js/hygiene.js", 2050, 2145, "/* AgriGuardian — hygiene score */\n"),
    ("js/dashboard.js", 2146, 2394, "/* AgriGuardian — dashboard alerts & list */\n"),
    ("js/devices-list.js", 2395, 2538, "/* AgriGuardian — device list, archive, filters */\n"),
    ("js/audit.js", 2539, 2564, "/* AgriGuardian — audit log */\n"),
    ("js/permissions.js", 2565, 2943, "/* AgriGuardian — roles, permissions, escalation */\n"),
    ("js/accessibility.js", 2944, 3069, "/* AgriGuardian — accessibility settings */\n"),
    ("js/vulnerabilities.js", 3070, 3208, "/* AgriGuardian — CISA / NVD checks */\n"),
    ("js/devices-detail.js", 3209, 3894, "/* AgriGuardian — device detail, add, assign */\n"),
    ("js/settings.js", 3895, 4166, "/* AgriGuardian — farm settings & team */\n"),
    ("js/networks-data.js", 4167, 4310, "/* AgriGuardian — network & app risk data */\n"),
    ("js/networks.js", 4311, 4653, "/* AgriGuardian — network UI & CRUD */\n"),
    ("js/apps.js", 4656, 5071, "/* AgriGuardian — apps inventory & backup screen */\n"),
    ("js/team.js", 5072, 5267, "/* AgriGuardian — team invites & farm config */\n"),
    ("js/auth-ui.js", 5268, 5490, "/* AgriGuardian — login steps & enter app */\n"),
    ("js/report-viewers.js", 5491, 5584, "/* AgriGuardian — in-app report viewers */\n"),
    ("js/auth-flow.js", 5585, 5631, "/* AgriGuardian — registration & MFA send */\n"),
    ("js/session.js", 5632, 5770, "/* AgriGuardian — session timeout & verify */\n"),
    ("js/i18n/set-lang.js", 5772, total, "/* AgriGuardian i18n — setLang + device verify/resolve */\n"),
]

# set-lang.js was supposed to end at 6249 and devices-resolve separate — fix:
# Re-split last two modules properly
modules[-1] = ("js/i18n/set-lang.js", 5772, 6249, "/* AgriGuardian i18n — setLang (UI refresh) */\n")
modules.append(("js/devices-resolve.js", 6251, total, "/* AgriGuardian — verify, resolve, replacement */\n"))

for rel, start, end, header in modules:
    write(rel, header, start, end)

order = [m[0] for m in modules]
(ROOT / "scripts" / "module-load-order.json").write_text(
    json.dumps(order, indent=2) + "\n", encoding="utf-8"
)
print("\nDone.", len(modules), "modules written.")
