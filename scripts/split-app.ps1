# Split monolithic app.js into lib/ + js/ modules (preserves exact source)
$Root = Split-Path -Parent $PSScriptRoot
$lines = [System.IO.File]::ReadAllLines((Join-Path $Root "app.js"))

function Write-Slice($rel, $start, $end, $header) {
    $full = Join-Path $Root $rel
    $dir = Split-Path $full -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $chunk = $lines[($start - 1)..($end - 1)] -join "`n"
    if ($chunk.Length -gt 0) { $chunk += "`n" }
    [System.IO.File]::WriteAllText($full, $header + $chunk, [System.Text.UTF8Encoding]::new($false))
    Write-Host "wrote $rel ($($end - $start + 1) lines)"
}

$total = $lines.Count
Write-Host "app.js total lines: $total"

Write-Slice "lib/jspdf.min.js" 1 399 "/* AgriGuardian: bundled jsPDF (do not edit) */`n"
Write-Slice "js/i18n/lang-data.js" 401 1689 "/* AgriGuardian i18n: translation strings */`n"
Write-Slice "js/i18n/core.js" 1690 1731 "/* AgriGuardian i18n: runtime helpers */`n"
Write-Slice "js/risk.js" 1733 1797 "/* AgriGuardian: risk scoring and demo devices */`n"
Write-Slice "js/reports.js" 1799 2049 "/* AgriGuardian: PDF and email reports */`n"
Write-Slice "js/hygiene.js" 2050 2145 "/* AgriGuardian: hygiene score */`n"
Write-Slice "js/dashboard.js" 2146 2394 "/* AgriGuardian: dashboard alerts and list */`n"
Write-Slice "js/devices-list.js" 2395 2538 "/* AgriGuardian: device list, archive, filters */`n"
Write-Slice "js/audit.js" 2539 2564 "/* AgriGuardian: audit log */`n"
Write-Slice "js/permissions.js" 2565 2943 "/* AgriGuardian: roles, permissions, escalation */`n"
Write-Slice "js/accessibility.js" 2944 3069 "/* AgriGuardian: accessibility settings */`n"
Write-Slice "js/vulnerabilities.js" 3070 3208 "/* AgriGuardian: CISA and NVD checks */`n"
Write-Slice "js/devices-detail.js" 3209 3894 "/* AgriGuardian: device detail, add, assign */`n"
Write-Slice "js/settings.js" 3895 4166 "/* AgriGuardian: farm settings and team */`n"
Write-Slice "js/networks-data.js" 4167 4310 "/* AgriGuardian: network and app risk data */`n"
Write-Slice "js/networks.js" 4311 4653 "/* AgriGuardian: network UI and CRUD */`n"
Write-Slice "js/apps.js" 4656 5071 "/* AgriGuardian: apps inventory and backup screen */`n"
Write-Slice "js/team.js" 5072 5267 "/* AgriGuardian: team invites and farm config */`n"
Write-Slice "js/auth-ui.js" 5268 5490 "/* AgriGuardian: login steps and enter app */`n"
Write-Slice "js/report-viewers.js" 5491 5584 "/* AgriGuardian: in-app report viewers */`n"
Write-Slice "js/auth-flow.js" 5585 5631 "/* AgriGuardian: registration and MFA send */`n"
Write-Slice "js/session.js" 5632 5770 "/* AgriGuardian: session timeout and verify */`n"
Write-Slice "js/i18n/set-lang.js" 5772 6249 "/* AgriGuardian i18n: setLang UI refresh */`n"
Write-Slice "js/devices-resolve.js" 6251 $total "/* AgriGuardian: verify, resolve, replacement */`n"

$order = @(
    "lib/jspdf.min.js",
    "js/i18n/lang-data.js", "js/i18n/core.js",
    "js/risk.js", "js/reports.js", "js/hygiene.js", "js/dashboard.js",
    "js/devices-list.js", "js/audit.js", "js/permissions.js", "js/accessibility.js",
    "js/vulnerabilities.js", "js/devices-detail.js", "js/settings.js",
    "js/networks-data.js", "js/networks.js", "js/apps.js", "js/team.js",
    "js/auth-ui.js", "js/report-viewers.js", "js/auth-flow.js", "js/session.js",
    "js/i18n/set-lang.js", "js/devices-resolve.js"
)
$order | ConvertTo-Json | Set-Content (Join-Path $Root "scripts/module-load-order.json") -Encoding UTF8
Write-Host "`nDone."
