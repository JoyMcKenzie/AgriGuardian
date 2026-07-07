/* AgriGuardian: dashboard alerts and list */
// Devices with at least one observation reported by a view-only role that
// hasn't been resolved yet. Farm Hand/Viewer's only contribution to the
// workflow is reporting something — this is what makes sure it actually
// gets seen instead of only existing if someone happens to open that exact
// device's page or go looking in the audit log.
function observedDevices() {
  return devices.filter(d =>
    !d.archived && !d.resolved &&
    Array.isArray(d.handoffLog) &&
    d.handoffLog.some(e => e.type === 'observation')
  );
}

function renderDashList() {
  const activeDevices = [...devices].filter(d => !d.archived);
  const redDevices = activeDevices.filter(d => !d.resolved && getRisk(d.brand,d.pw,d.healthStatus)==='red' && canSeeIssue(d) && canSeeDetailedRisk());
  const yellowDevices = activeDevices.filter(d => !d.resolved && getRisk(d.brand,d.pw,d.healthStatus)==='yellow' && canSeeIssue(d) && canSeeDetailedRisk());
  const netRed = canSeeNetworkIssue() ? networks.filter(n => !n.resolved && !n.archived && getNetRisk(n) === 'red') : [];
  const netYellow = canSeeNetworkIssue() ? networks.filter(n => !n.resolved && !n.archived && getNetRisk(n) === 'yellow') : [];
  const deviceProblems = redDevices.length + yellowDevices.length;
  const networkProblems = netRed.length + netYellow.length;

  const safe = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  safe('count-total', activeDevices.length);
  safe('count-networks', networks.length);
  safe('count-issues', deviceProblems + networkProblems);

  const hc = a11ySettings.highContrast;
  const r = currentUser.role;

  // ── Traffic-light tab card (Owner dashboard) ──────────────────────────────
  function tabCard(label, risk, count, navFn) {
    const colors = { green: '#1F4D2E', yellow: '#7A6514', red: '#A32D2D' };
    const bgs    = { green: '#EAF3EC', yellow: '#FBF6E9', red: '#FCEBEB' };
    const borders = { green: '#BBD8C2', yellow: '#E6D8AE', red: '#F09595' };
    const dots   = { green: '#2E7A4E', yellow: '#D4C000', red: '#E24B4A' };
    const c = colors[risk] || '#333';
    const bg = bgs[risk] || '#fff';
    const bd = borders[risk] || '#e3e3e3';
    const dot = dots[risk] || '#aaa';
    return '<button onclick="' + navFn + '" style="width:100%;text-align:left;background:' + bg + ';border:1px solid ' + bd + ';border-radius:10px;padding:14px 16px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="width:12px;height:12px;border-radius:50%;background:' + dot + ';flex-shrink:0"></div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:700;color:' + c + '">' + label + '</div>' +
          (count > 0 ? '<div style="font-size:12px;color:' + c + ';opacity:0.8">' + count + ' ' + (count === 1 ? t('issuesSingular') : t('issuesPlural')) + '</div>' : '<div style="font-size:12px;color:' + c + ';opacity:0.8">' + t('noIssues') + '</div>') +
        '</div>' +
      '</div>' +
      '<i class="ti ti-chevron-right" style="font-size:18px;color:#9a9a9a"></i>' +
    '</button>';
  }

  // ── Standard problem card ─────────────────────────────────────────────────
  function card(label, count, navFn) {
    const hasIssue = count > 0;
    const accent = hasIssue ? (hc ? '#CC0000' : '#A32D2D') : (hc ? '#006600' : '#1F4D2E');
    const bg = '#fff';
    const bd = hc ? '3px solid #000' : '1px solid #e3e3e3';
    return '<button onclick="' + navFn + '" style="width:100%;text-align:left;background:' + bg + ';border:' + bd + ';border-radius:10px;padding:16px 18px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04)">' +
      '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:14px;font-weight:600;color:#111">' + label + '</span>' +
      '<span style="font-size:28px;font-weight:800;color:' + accent + ';line-height:1">' + count + '</span></div>' +
      '<i class="ti ti-chevron-right" style="font-size:20px;color:#9a9a9a"></i>' +
    '</button>';
  }

  const navDevices = "showScreen('devices', document.querySelectorAll('.nav-btn')[1])";
  const navNetwork = "showScreen('network', document.querySelectorAll('.nav-btn')[2])";
  const navApps    = "showScreen('apps', document.getElementById('nav-btn-apps'))";
  const navBackups = "showScreen('backups', document.getElementById('nav-btn-backups'))";

  let html = '';

  // ── OWNER dashboard ────────────────────────────────────────────────────────
  if (r === 'Owner') {
    // Traffic-light cards for each tab
    const devRisk = deviceProblems === 0 ? 'green' : (redDevices.length > 0 ? 'red' : 'yellow');
    const netRisk2 = networkProblems === 0 ? 'green' : (netRed.length > 0 ? 'red' : 'yellow');
    html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('dashFarmStatus') + '</p>';
    html += tabCard(t('navDevices'), devRisk, deviceProblems, navDevices);
    html += tabCard(t('navNetwork'), netRisk2, networkProblems, navNetwork);
    if (canSeeApps()) {
      const activeApps = apps.filter(a => !a.archived);
      const appProblems = activeApps.filter(a => getAppRisk(a) !== 'green').length;
      const appRiskLevel = appProblems === 0 ? 'green' : activeApps.some(a => getAppRisk(a) === 'red') ? 'red' : 'yellow';
      html += tabCard(t('navApps'), appRiskLevel, appProblems, navApps);
    }
    if (canSeeBackups()) {
      const bkRisk = getBackupRisk();
      const bkCount = bkRisk === 'green' ? 0 : 1;
      html += tabCard(t('navBackups'), bkRisk, bkCount, navBackups);
    }
    // Escalated items — exclude partially-resolved ones (they show in the purple section below)
    const escDevs = escalatedDevices().filter(d => !d.partiallyResolved);
    if (escDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px"><i class="ti ti-flag" style="font-size:12px;color:#3B0764;vertical-align:-1px" aria-hidden="true"></i> ' + t('escDashLabel') + '</p>';
      html += escDevs.map(function(d) {
        return '<div style="background:#FAF5FF;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#5B21B6">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#5B21B6">' + d.brand + (d.escalation && d.escalation.reason ? ' — ' + d.escalation.reason : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#9a9a9a;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    // Observations reported by Farm Hand/Viewer roles — the only way those
    // reports surface without someone happening to open the exact device.
    const obsDevs = observedDevices();
    if (obsDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px"><i class="ti ti-eye" style="font-size:12px;color:#1A3A6B;vertical-align:-1px" aria-hidden="true"></i> ' + t('obsDashLabel') + '</p>';
      html += obsDevs.map(function(d) {
        const lastObs = [...d.handoffLog].reverse().find(e => e.type === 'observation');
        return '<div style="background:#F0F6FF;border:1px solid #92B4E3;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#1A3A6B">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#1A3A6B">' + (lastObs ? lastObs.from + ' — ' + lastObs.note : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#9a9a9a;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    // Returned-to-tech items visible to Owner
    const returnedDevs = activeDevices.filter(d => d.returnedToTech && !d.resolved);
    if (returnedDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">↩️ ' + t('returnedDashLabel') + '</p>';
      html += returnedDevs.map(function(d) {
        return '<div style="background:#FFF3E0;border:1px solid #E6823A;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#7A3200">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#5A3200">' + (d.assignedTo || '') + (d.returnNote ? ' — ' + d.returnNote.slice(0,60) + (d.returnNote.length > 60 ? '…' : '') : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#9a9a9a;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    // Partially resolved — escalated part needs Owner/Manager decision
    // This section covers ALL partial+escalated devices including ones Carlos is handling
    const partialDevs = activeDevices.filter(d => d.partiallyResolved && d.needsOwnerAction && !d.resolved);
    if (partialDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">⚡ ' + t('partialDashLabel') + '</p>';
      html += partialDevs.map(function(d) {
        return '<div style="background:#F3EEFF;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#5B21B6">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#3B0764">' + t('partialFixByLabel') + ': ' + (d.partialResolveBy || '—') + (d.escalation && d.escalation.reason ? ' · ' + d.escalation.reason : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#9a9a9a;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    const allEsc = escalatedDevices();
    if (deviceProblems + networkProblems === 0 && allEsc.length === 0 && partialDevs.length === 0) {
      html += '<div style="background:#EAF3EC;border:1px solid #BBD8C2;border-radius:8px;padding:12px 14px;font-size:13px;color:#1F4D2E;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('allGoodMsg') + '</span></div>';
    }

  // ── MANAGER dashboard ──────────────────────────────────────────────────────
  } else if (r === 'Manager') {
    html += card(t('dashDeviceProblems'), deviceProblems, navDevices);
    html += card(t('dashNetworkProblems'), networkProblems, navNetwork);
    // Excludes partially-resolved devices — those get their own dedicated
    // purple "needs decision" section below (mgrPartialDevs), so counting
    // them here too would show the same device twice, once as a bare number
    // and once with full context. Matches the same exclusion already applied
    // on the Owner dashboard branch above.
    const escDevs = escalatedDevices().filter(d => !d.partiallyResolved);
    if (escDevs.length > 0) {
      html += card('<i class="ti ti-flag" style="font-size:13px;color:#3B0764;vertical-align:-1px" aria-hidden="true"></i> ' + t('escDashLabel'), escDevs.length, 'showEscalatedOnly()');
    }
    const obsDevs = observedDevices();
    if (obsDevs.length > 0) {
      html += card('<i class="ti ti-eye" style="font-size:13px;color:#1A3A6B;vertical-align:-1px" aria-hidden="true"></i> ' + t('obsDashLabel'), obsDevs.length, navDevices);
    }
    // All assigned work
    const allAssigned = activeDevices.filter(d => d.assignedTo && !d.resolved);
    if (allAssigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashAssignedWork') + '</p>';
      html += allAssigned.map(function(d) {
        const risk = getRisk(d.brand, d.pw, d.healthStatus);
        return alertRow(risk, (d.label || d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: d.assignedTo });
      }).join('');
    }
    // Unassigned open issues
    const unassigned = activeDevices.filter(d => !d.assignedTo && !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green');
    if (unassigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashUnassigned') + '</p>';
      html += unassigned.map(function(d) {
        return alertRow(getRisk(d.brand,d.pw,d.healthStatus), (d.label||d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: '' });
      }).join('');
    }
    // Partially resolved — waiting on Manager decision
    const mgrPartialDevs = activeDevices.filter(d => d.partiallyResolved && d.needsOwnerAction && !d.resolved);
    if (mgrPartialDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">⚡ ' + t('partialDashLabel') + '</p>';
      html += mgrPartialDevs.map(function(d) {
        return '<div style="background:#F3EEFF;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#5B21B6">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#3B0764">' + t('partialFixByLabel') + ': ' + (d.partialResolveBy || '—') + (d.escalation && d.escalation.reason ? ' · ' + d.escalation.reason : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#9a9a9a;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    if (deviceProblems + networkProblems === 0) {
      html += '<div style="background:#fff;border:1px solid #e8e8e8;border-radius:8px;padding:12px 14px;font-size:13px;color:#333;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('allGoodMsg') + '</span></div>';
    }

  // ── TECHNICIAN dashboard ───────────────────────────────────────────────────
  } else if (r === 'Technician') {
    const myName = currentUser.name || '';
    // My assigned work (including returned items)
    const myDevices = activeDevices.filter(d => d.assignedTo === myName && !d.resolved);
    if (myDevices.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('dashMyWork') + '</p>';
      html += myDevices.map(function(d) {
        const risk = getRisk(d.brand, d.pw, d.healthStatus);
        const returnedTag = d.returnedToTech ? ' ↩️' : '';
        return alertRow(risk, (d.label || d.type) + ' — ' + d.brand + returnedTag, 'showDetail(' + d.id + ')', { assignedTo: myName });
      }).join('');
    }
    // Unassigned open issues (available to pick up)
    const unassigned = activeDevices.filter(d => !d.assignedTo && !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green');
    if (unassigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashUnassigned') + '</p>';
      html += unassigned.map(function(d) {
        return alertRow(getRisk(d.brand,d.pw,d.healthStatus), (d.label||d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: '' });
      }).join('');
    }
    if (myDevices.length === 0 && unassigned.length === 0) {
      html += '<div style="background:#EAF3EC;border:1px solid #BBD8C2;border-radius:8px;padding:12px 14px;font-size:13px;color:#1F4D2E;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('techNoWorkMsg') + '</span></div>';
    }

  // ── DEFAULT (Farm Hand, Viewer) ────────────────────────────────────────────
  } else {
    // No separate "N problems" count card here — it would color its number
    // by severity (red if >0), the same leak the per-device notes below are
    // built to avoid. The device list itself, with neutral per-device notes,
    // is the complete picture; a count on top of it adds a cue, not information.
    html += '<p style="font-size:14px;font-weight:700;color:#111;margin:0 0 10px">' + t('dashYourDevices') + '</p>';
    if (activeDevices.length === 0) {
      html += '<p style="font-size:13px;color:#888;font-style:italic">' + t('noDevicesFound') + '</p>';
    } else {
      html += activeDevices.map(function(d) {
        const dRisk = getRisk(d.brand, d.pw, d.healthStatus);
        // Three states only (2026-07-06, explicit): Fine / Known issue / Use
        // with caution. "Do-not-use" as a 4th state is retired — themed but
        // deliberately calm colors (no red/alarm), reusing the app's existing
        // brand green and neutral amber rather than inventing new hues.
        const isCaution = d.farmHandStatus === 'use-caution' || d.farmHandStatus === 'do-not-use';
        const isFine = d.farmHandStatus === 'keep-using' || (dRisk === 'green' && !d.farmHandStatus);
        const fh = isCaution
          ? { label: t('fhBadgeCaution'), icon: 'ti-alert-triangle', color: '#7A6514', bg: '#FBF6E9', border: '#F5E9B8' }
          : isFine
          ? { label: t('fhBadgeFine'), icon: 'ti-thumb-up', color: '#14381F', bg: '#CFE8D6', border: '#8FC49F' }
          : { label: t('fhBadgeKnownIssue'), icon: 'ti-info-circle', color: '#334155', bg: '#DCE3EA', border: '#B9C4CE' };
        return '<div style="background:#fff;border:1px solid #e8e8e8;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<span style="font-size:13px;color:#333">' + (d.label || d.type) + '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:' + fh.color + ';background:' + fh.bg + ';border:1px solid ' + fh.border + ';border-radius:20px;padding:3px 10px"><i class="ti ' + fh.icon + '" style="font-size:12px" aria-hidden="true"></i> ' + fh.label + '</span>' +
        '</div>';
      }).join('');
    }
  }

  const container = document.getElementById('dash-summary-cards');
  if (container) container.innerHTML = html;

  const dlBtn = document.getElementById('btn-download-report');
  if (dlBtn) dlBtn.style.display = canExportReports() ? 'flex' : 'none';
  const actBtn = document.getElementById('btn-download-activity');
  if (actBtn) actBtn.style.display = canExportReports() ? 'flex' : 'none';
  const emailBtn = document.getElementById('btn-email-report');
  if (emailBtn) emailBtn.style.display = canExportReports() ? 'flex' : 'none';
  const emailActBtn = document.getElementById('btn-email-activity');
  if (emailActBtn) emailActBtn.style.display = canExportReports() ? 'flex' : 'none';
  const rptDiv = document.getElementById('report-buttons');
  if (rptDiv) rptDiv.style.display = canExportReports() ? 'flex' : 'none';
}

function alertRow(level, msg, navFn, meta) {
  if (a11ySettings.colorBlind) msg = (level === 'red' ? '⛔ ' : level === 'info' ? 'ℹ️ ' : '⚠️ ') + msg;
  const hc = a11ySettings.highContrast;
  const isInfo = (level === 'info');
  const dotColor = level === 'red'
    ? (hc ? '#CC0000' : '#E24B4A')
    : isInfo
      ? (hc ? '#005577' : '#5B8DB8')
      : (hc ? '#888800' : '#D4C000');
  const borderColor = hc ? '#000' : '#e8e8e8';
  const borderWidth = hc ? '3px' : '1px';
  const dotSize = hc ? '14px' : '10px';
  // Assignment status line — only for device issues (networks aren't assignable)
  var assignLine = '';
  if (meta && !meta.isNetwork && !meta.isStale) {
    assignLine = meta.assignedTo
      ? '<div style="align-self:flex-start;display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#1F4D2E;background:#EAF3EC;border:1px solid #BBD8C2;border-radius:10px;padding:1px 8px"><i class="ti ti-user-check" style="font-size:12px"></i>' + t('assignedToLabel') + ': ' + meta.assignedTo + '</div>'
      : '<div style="align-self:flex-start;display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#7A6514;background:#FBF6E9;border:1px solid #E6D8AE;border-radius:10px;padding:1px 8px"><i class="ti ti-user-question" style="font-size:12px"></i>' + t('unassignedLabel') + '</div>';
  }
  return '<div class="alert-row alert-row-' + level + '" style="background:#fff;border:' + borderWidth + ' solid ' + borderColor + ';border-radius:8px;">' +
    '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
      '<div class="risk-dot" style="flex-shrink:0;width:' + dotSize + ';height:' + dotSize + ';border-radius:50%;background:' + dotColor + (hc ? ';border:2px solid #000' : '') + '"></div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">' +
        '<span style="color:#333;font-weight:' + (hc ? '700' : '400') + '">' + msg + '</span>' +
        assignLine +
      '</div>' +
    '</div>' +
    '<button onclick="' + navFn + '" class="alert-fix-btn" style="background:' + (isInfo ? '#5B8DB8' : '#111') + ';color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;padding:4px 10px;white-space:nowrap;flex-shrink:0">' + (isInfo ? t('reviewBtn') : t('fixBtn')) + '</button>' +
  '</div>';
}

