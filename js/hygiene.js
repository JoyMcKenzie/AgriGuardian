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

// Renders the Farm Hygiene Score card on the dashboard.
function renderHygieneScore() {
  const el = document.getElementById('hygiene-score-card');
  if (!el) return;
  // Farm Hand and Viewer accounts do not see the farm-wide hygiene score.
  if (!canSeeHygieneScore()) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const h = computeHygiene();
  // Color band for the overall score.
  const band = h.overall >= 80 ? '#2E7A4E' : h.overall >= 50 ? '#C9A400' : '#C0392B';
  const hc = a11ySettings.highContrast;

  function bar(label, value) {
    const c = value >= 80 ? '#2E7A4E' : value >= 50 ? '#C9A400' : '#C0392B';
    return '<div style="margin-bottom:8px">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:3px">' +
        '<span>' + label + '</span><span style="font-weight:600;color:#333">' + value + '%</span>' +
      '</div>' +
      '<div style="height:7px;background:#eee;border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;width:' + value + '%;background:' + c + '"></div>' +
      '</div>' +
    '</div>';
  }

  el.innerHTML =
    '<div style="background:#fff;border:' + (hc ? '3px solid #000' : '1px solid #e8e8e8') + ';border-radius:12px;padding:16px;margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">' +
        '<div style="flex-shrink:0;width:64px;height:64px;border-radius:50%;border:5px solid ' + band + ';display:flex;align-items:center;justify-content:center">' +
          '<span style="font-size:22px;font-weight:700;color:' + band + '">' + h.overall + '</span>' +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:15px;font-weight:600;color:#222">' + t('hygieneTitle') + '</div>' +
          '<div style="font-size:12px;color:#777">' + t('hygieneOutOf') + '</div>' +
        '</div>' +
      '</div>' +
      bar(t('hygienePassword'), h.password) +
      bar(t('hygieneUpdate'), h.update) +
      (h.hasNetworks ? bar(t('hygieneNetwork'), h.network) : '') +
      (h.hasApps && canSeeApps() ? bar(t('hygieneApps'), h.apps) : '') +
      (h.hasBackup && canSeeBackups() ? bar(t('hygieneBackup'), h.backup) : '') +
    '</div>';
}

