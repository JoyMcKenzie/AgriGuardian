#!/usr/bin/env python3
"""
AgriGuardian — module split validator.

Run from the project root (the folder containing module-load-order.json,
index.html, and the js/ + lib/ subfolders):

    python3 validate-split.py

Confirms the split modules still load and behave as one coherent app:
  A. every module parses as a standalone <script>            (needs node; skipped if absent)
  B. the whole app parses when concatenated in load order    (needs node)
  C. no duplicate top-level declarations
        - const/let/class duplicated across files = hard "already declared" crash
        - function duplicated = silent last-wins override
  D. every on*= event handler resolves to a defined function
  E. lists top-level statements that execute at load (load-order sensitive)

Exit code is non-zero if any hard failure (A, B, C-crash, or D) is found.
No third-party packages required.
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
ORDER_PATH = os.path.join(ROOT, "module-load-order.json")
if not os.path.exists(ORDER_PATH):
    sys.exit("module-load-order.json not found — run this from the project root.")

order = json.load(open(ORDER_PATH, encoding="utf-8"))
jsfiles = [f for f in order if not f.endswith("jspdf.min.js")]  # skip the vendored lib
NODE = shutil.which("node")
hard_fail = False


def rp(rel):
    return os.path.join(ROOT, rel)


# ── A. per-file parse ────────────────────────────────────────────────────────
print("A. Each module parses standalone")
if NODE:
    bad = False
    for rel in jsfiles:
        r = subprocess.run([NODE, "--check", rp(rel)], capture_output=True, text=True)
        if r.returncode != 0:
            bad = hard_fail = True
            print(f"   FAIL  {rel}\n      " + r.stderr.strip().replace("\n", "\n      "))
    print("   ok" if not bad else "   -> fix the syntax errors above")
else:
    print("   skipped (node not found)")

# ── B. bundle parse ──────────────────────────────────────────────────────────
print("B. Full bundle parses in load order")
if NODE:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as tmp:
        for rel in jsfiles:
            tmp.write(open(rp(rel), encoding="utf-8").read() + "\n")
        bundle = tmp.name
    r = subprocess.run([NODE, "--check", bundle], capture_output=True, text=True)
    os.unlink(bundle)
    if r.returncode != 0:
        hard_fail = True
        print("   FAIL\n      " + r.stderr.strip().replace("\n", "\n      "))
    else:
        print("   ok")
else:
    print("   skipped (node not found)")

# ── C. duplicate top-level declarations ──────────────────────────────────────
print("C. No duplicate top-level declarations")
decl_re = re.compile(r"^(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)")
defs = {}
for rel in jsfiles:
    for line in open(rp(rel), encoding="utf-8"):
        m = decl_re.match(line)  # column 0 == top level
        if m:
            defs.setdefault(m.group(2), []).append((rel, m.group(1)))
clean = True
for name, occ in sorted(defs.items()):
    if len(occ) > 1:
        kinds = {k for _, k in occ}
        where = ", ".join(f"{os.path.basename(f)}({k})" for f, k in occ)
        if kinds & {"const", "let", "class"}:
            hard_fail = clean = False
            print(f"   CRASH '{name}' redeclared -> {where}")
        elif kinds == {"function"}:
            clean = False
            print(f"   WARN  function '{name}' defined {len(occ)}x (last wins): {where}")
if clean:
    print("   ok")

# ── build the set of everything callable ─────────────────────────────────────
defined = set(defs)
extra = [
    re.compile(r"\b([A-Za-z_$][\w$]*)\s*=\s*function"),
    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"),
    re.compile(r"\bwindow\.([A-Za-z_$][\w$]*)\s*="),
]
for rel in jsfiles:
    txt = open(rp(rel), encoding="utf-8").read()
    for rx in extra:
        defined.update(rx.findall(txt))

# ── D. handlers resolve ──────────────────────────────────────────────────────
print("D. Every event handler resolves to a definition")
handler_re = re.compile(
    r"on(?:click|change|input|submit|keyup|keydown|focus|blur)\s*=\s*"
    r"""(?:"|\\"|')\s*([A-Za-z_$][\w$]*)\s*\("""
)
refs = {}
scan = ["index.html"] + jsfiles
for rel in scan:
    if os.path.exists(rp(rel)):
        for name in handler_re.findall(open(rp(rel), encoding="utf-8").read()):
            refs.setdefault(name, set()).add(os.path.basename(rel))
missing = [n for n in sorted(refs) if n not in defined]
if missing:
    hard_fail = True
    for n in missing:
        print(f"   MISSING '{n}()' wired in {sorted(refs[n])} but never defined")
else:
    print(f"   ok ({len(refs)} handlers)")

# ── E. top-level executing statements (informational) ────────────────────────
print("E. Top-level statements that execute at load (review for load-order safety)")
skip = re.compile(
    r"^\s*$|^(function|const|let|var|class|if|else|for|while|switch|try|catch|"
    r"finally|return|})|^[\)\]\};,]|^\s*//|^\s*/\*|^\s*\*"
)
call0 = re.compile(r"^([A-Za-z_$][\w$.]*)\s*\(|^[A-Za-z_$][\w$.\[\]]*\s*=")
any_exec = False
for rel in jsfiles:
    for i, line in enumerate(open(rp(rel), encoding="utf-8"), 1):
        if line and line[0] not in " \t\n" and not skip.match(line) and call0.match(line):
            any_exec = True
            print(f"   {rel}:{i}  {line.rstrip()[:80]}")
if not any_exec:
    print("   none")

print("\n" + ("FAILED — see hard failures above." if hard_fail else "PASSED — split is coherent."))
sys.exit(1 if hard_fail else 0)
