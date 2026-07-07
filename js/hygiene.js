/* AgriGuardian: hygiene score */
function computeHygiene() {
  const active = devices.filter(d => !d.archived);
  const nets = networks;
  const activeApps = apps.filter(a => !a.archived);

  // Password hygiene: % of devices whose default password has been changed.
  // Resolved issues count as good (the user has confirmed they addressed it).
  let pwTotal = active.length, pwGood = active.filter(d => d.resolved || d.pw === 'yes').length;

  // Update hygiene: % of devices on a healthy update footing.
  // Healthy = auto-updates, or no negative health flag. Unhealthy = "I update it myself"
  // or "No updates available", which getRisk treats as yellow.
  // Resolved issues count as good.
  let upTotal = active.length, upGood = active.filter(function(d) {
    if (d.resolved) return true;
    const h = d.healthStatus || '';
    const bad = h.includes('I update it myself') || h.includes('No updates available') ||
                h.includes('actualizo yo') || h.includes('Sin actualizaciones');
    return !bad;
  }).length;

  // Network hygiene: % of networks that are green.
  let netTotal = nets.length, netGood = nets.filter(n => getNetRisk(n) === 'green').length;

  // Apps hygiene: % of in-use apps that are green (reviewed, not stale, not flagged).
  let appTotal = activeApps.length, appGood = activeApps.filter(a => getAppRisk(a) === 'green').length;

  // Backup hygiene: green if full 3-2-1 + recently verified, yellow if complete
  // but stale/unverified, red if any copy is missing. Only counts when the Owner
  // has engaged with the backup screen (i.e. at least one field is set).
  var backupEngaged = farmBackup.hasPrimary || farmBackup.hasSecondary || farmBackup.hasOffsite || !!farmBackup.lastVerified;
  var backupRisk = getBackupRisk();
  var backupPct = !backupEngaged ? 100 : backupRisk === 'green' ? 100 : backupRisk === 'yellow' ? 60 : 20;

  const pct = (good, total) => total === 0 ? 100 : Math.round((good / total) * 100);
  const pwPct = pct(pwGood, pwTotal);
  const upPct = pct(upGood, upTotal);
  const netPct = pct(netGood, netTotal);
  const appPct = pct(appGood, appTotal);

  const parts = [pwPct, upPct];
  if (netTotal > 0) parts.push(netPct);
  if (appTotal > 0) parts.push(appPct);
  if (backupEngaged) parts.push(backupPct);
  const overall = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  return { overall, password: pwPct, update: upPct, network: netPct, hasNetworks: netTotal > 0, apps: appPct, hasApps: appTotal > 0, backup: backupPct, hasBackup: backupEngaged };
}

// renderHygieneScore() removed (CL1) — was dead (no #hygiene-score-card in
// index.html, no callers). computeHygiene() kept (used by reports/report-viewers).
