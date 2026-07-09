/* AgriGuardian: dashboard alerts and list */
// Devices with at least one observation reported by a view-only role that
// hasn't been resolved yet. Farm Hand/Viewer's only contribution to the
// workflow is reporting something — this is what makes sure it actually
// gets seen instead of only existing if someone happens to open that exact
// device's page or go looking in the audit log.
function observedDevices() {
  return devices.filter(d => !d.archived && (d.observationPending === true || d.observationInvestigating === true || d.knownOperationalIssue === true));
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
  function tabCard(label, redCount, yellowCount, navFn) {
    const cb = (typeof a11ySettings !== 'undefined') && a11ySettings.colorBlind;
    const hc = (typeof a11ySettings !== 'undefined') && a11ySettings.highContrast;
    const total = redCount + yellowCount;
    const bd = hc ? '2px solid #000' : '1px solid #D7E4D7';
    const sub = total > 0
      ? '<div style="font-size:12px;color:#111111;margin-top:2px">' + total + ' ' + (total === 1 ? t('issuesSingular') : t('issuesPlural')) + '</div>'
      : '';
    function chipDot(color, val) {
      return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:#48604F">' +
        '<span style="width:11px;height:11px;border-radius:50%;background:' + color + ';flex-shrink:0"></span>' + val + '</span>';
    }
    function chipShape(icon, color, val) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:' + color + '">' +
        '<i class="ti ' + icon + '" style="font-size:14px" aria-hidden="true"></i>' + val + '</span>';
    }
    let sev;
    if (total === 0) {
      sev = cb
        ? '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#1F6E43"><i class="ti ti-check" style="font-size:14px" aria-hidden="true"></i>' + t('noIssues') + '</span>'
        : chipDot('#2E7A4E', t('noIssues'));
    } else {
      const parts = [];
      if (redCount > 0)    parts.push(cb ? chipShape('ti-alert-triangle', '#1A5FA8', redCount) : chipDot('#E24B4A', redCount));
      if (yellowCount > 0) parts.push(cb ? chipShape('ti-alert-circle', '#B4611A', yellowCount) : chipDot('#D4C000', yellowCount));
      sev = parts.join('<span style="display:inline-block;width:8px"></span>');
    }
    return '<button onclick="' + navFn + '" style="width:100%;text-align:left;background:#FFFFFF;border:' + bd + ';border-left:6px solid #1F4D2E;border-radius:12px;padding:15px 16px;margin-bottom:11px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px">' +
      '<div><div style="font-size:15px;font-weight:500;color:#111111">' + label + '</div>' + sub + '</div>' +
      '<div style="display:flex;align-items:center;gap:14px">' + sev + '<i class="ti ti-chevron-right" style="font-size:18px;color:#7A8F80" aria-hidden="true"></i></div>' +
    '</button>';
  }

  // ── Standard problem card ─────────────────────────────────────────────────
  function card(label, count, navFn) {
    const hasIssue = count > 0;
    const accent = hasIssue ? (hc ? '#CC0000' : '#A32D2D') : (hc ? '#006600' : '#1F4D2E');
    const bg = '#fff';
    const bd = hc ? '3px solid #000' : '1px solid #D7E4D7';
    return '<button onclick="' + navFn + '" style="width:100%;text-align:left;background:' + bg + ';border:' + bd + ';border-radius:10px;padding:16px 18px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04)">' +
      '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:14px;font-weight:600;color:#22372A">' + label + '</span>' +
      '<span style="font-size:28px;font-weight:800;color:' + accent + ';line-height:1">' + count + '</span></div>' +
      '<i class="ti ti-chevron-right" style="font-size:20px;color:#7A8F80"></i>' +
    '</button>';
  }

  const navDevices = "showScreen('devices', document.querySelectorAll('.nav-btn')[1])";
  const navNetwork = "showScreen('network', document.querySelectorAll('.nav-btn')[2])";
  const navApps    = "showScreen('apps', document.getElementById('nav-btn-apps'))";
  const navBackups = "showScreen('backups', document.getElementById('nav-btn-backups'))";

  function farmStatusCards() {
    var out = '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('dashFarmStatus') + '</p>';
    out += tabCard(t('navDevices'), redDevices.length, yellowDevices.length, navDevices);
    out += tabCard(t('navNetwork'), netRed.length, netYellow.length, navNetwork);
    if (canSeeApps()) {
      var aa = apps.filter(function(a){ return !a.archived; });
      out += tabCard(t('navApps'), aa.filter(function(a){ return getAppRisk(a) === 'red'; }).length, aa.filter(function(a){ return getAppRisk(a) === 'yellow'; }).length, navApps);
    }
    if (canSeeBackups()) {
      var bk = getBackupRisk();
      out += tabCard(t('navBackups'), bk === 'red' ? 1 : 0, bk === 'yellow' ? 1 : 0, navBackups);
    }
    return out;
  }
  // Security tips — short, glanceable, rotating. Local default set (the
  // prototype has no backend). In production this maps to the vendor-side
  // Third-Party Risk Monitoring / Alert Relay (BACKEND-ARCHITECTURE-PLANNING.md
  // §12.3) feeding farm-specific findings as SecurityAlerts (§6) — fixed
  // plain-language templates, each pairing a finding with one recommended
  // step. Shown to every role.
  function securityTipsCard() {
    var tips = currentSecurityTips();
    if (!tips.length) return '';
    if (_tipIdx >= tips.length) _tipIdx = 0;
    return '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 8px">' + t('securityTipLabel') + '</p>' +
      '<div style="background:#FFFFFF;border:1px solid #D7E4D7;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">' +
        '<span style="width:30px;height:30px;border-radius:8px;background:#E2EFE8;color:#1F6E43;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0"><i class="ti ti-bulb" aria-hidden="true"></i></span>' +
        '<span id="dash-tip-text" style="flex:1;font-size:13px;color:#111111;line-height:1.4;transition:opacity 0.2s">' + tips[_tipIdx] + '</span>' +
      '</div>';
  }

  let html = '';

  // ── OWNER dashboard ────────────────────────────────────────────────────────
  if (r === 'Owner') {
    html += farmStatusCards();

    // ── Needs your attention: escalations, decisions, returns, and observations,
    //    unified into one calm list. Two accents only: purple = action items,
    //    blue = observations. Icon + sublabel distinguish the type. ──
    const escDevs = escalatedDevices().filter(function(d){ return !d.partiallyResolved; });
    const partialDevs = activeDevices.filter(function(d){ return d.partiallyResolved && d.needsOwnerAction && !d.resolved; });
    const returnedDevs = activeDevices.filter(function(d){ return d.returnedToTech && !d.resolved; });
    const obsDevs = observedDevices();

    function attnCard(id, icon, tintBg, tintFg, title, sub) {
      return '<button onclick="showDetail(' + id + ')" style="width:100%;text-align:left;background:#FFFFFF;border:1px solid #D7E4D7;border-left:6px solid #1F4D2E;border-radius:10px;padding:11px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:11px">' +
        '<span style="width:30px;height:30px;border-radius:8px;background:' + tintBg + ';color:' + tintFg + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0"><i class="ti ' + icon + '" aria-hidden="true"></i></span>' +
        '<span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:500;color:#111111">' + title + '</span>' +
        (sub ? '<span style="display:block;font-size:12px;color:#111111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sub + '</span>' : '') + '</span>' +
        '<i class="ti ti-chevron-right" style="color:#c3d3c6;font-size:16px;flex-shrink:0"></i>' +
      '</button>';
    }

    const PURP_BG = '#EFEAF7', PURP_FG = '#5B21B6', BLUE_BG = '#E6F0FA', BLUE_FG = '#1A5FA8';
    var attn = '';
    escDevs.forEach(function(d){ attn += attnCard(d.id, 'ti-flag', PURP_BG, PURP_FG, (d.label || d.type), t('escDashLabel') + (d.escalation && d.escalation.reason ? ' · ' + d.escalation.reason : '')); });
    partialDevs.forEach(function(d){ attn += attnCard(d.id, 'ti-bolt', PURP_BG, PURP_FG, (d.label || d.type), t('partialFixByLabel') + ': ' + (d.partialResolveBy || '—')); });
    returnedDevs.forEach(function(d){ attn += attnCard(d.id, 'ti-arrow-back-up', PURP_BG, PURP_FG, (d.label || d.type), t('returnedDashLabel') + (d.assignedTo ? ' · ' + d.assignedTo : '')); });
    obsDevs.forEach(function(d){
      var lastObs = Array.isArray(d.handoffLog) ? d.handoffLog.slice().reverse().find(function(e){ return e.type === 'observation'; }) : null;
      var sub = d.knownOperationalIssue ? t('opIssueTitle')
        : d.observationInvestigating ? (t('obsInvestigatingTitle') + (d.assignedTo ? ' · ' + d.assignedTo : ''))
        : (lastObs ? (lastObs.from + ' · ' + lastObs.note) : t('obsDashLabel'));
      attn += attnCard(d.id, 'ti-eye', BLUE_BG, BLUE_FG, (d.label || d.type), sub);
    });
    if (attn) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 8px">' + t('needsAttentionLabel') + '</p>';
      html += attn;
    }

    const allEsc = escalatedDevices();
    if (deviceProblems + networkProblems === 0 && allEsc.length === 0 && partialDevs.length === 0) {
      html += '<div style="background:#E2EFE8;border:1px solid #BBD8C2;border-radius:8px;padding:12px 14px;font-size:13px;color:#1F4D2E;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('allGoodMsg') + '</span></div>';
    }

  // ── MANAGER dashboard ──────────────────────────────────────────────────────
  } else if (r === 'Manager') {
    html += farmStatusCards();
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
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px"><i class="ti ti-eye" style="font-size:12px;color:#1A5FA8;vertical-align:-1px" aria-hidden="true"></i> ' + t('obsDashLabel') + '</p>';
      html += obsDevs.map(function(d) {
        const lastObs = Array.isArray(d.handoffLog) ? [...d.handoffLog].reverse().find(e => e.type === 'observation') : null;
        const card = d.knownOperationalIssue
          ? { bg: '#FBF6E9', border: '#EF9F27', color: '#854F0B', text: t('opIssueTitle') + ' — ' + (d.operationalIssueNote || '') }
          : d.observationInvestigating
          ? { bg: '#E6F0FA', border: '#1A5FA8', color: '#1A5FA8', text: t('obsInvestigatingTitle') + ' — ' + (d.assignedTo || '') }
          : { bg: '#E6F0FA', border: '#92B4E3', color: '#1A5FA8', text: (lastObs ? lastObs.from + ' — ' + lastObs.note : '') };
        return '<div style="background:' + card.bg + ';border:1px solid ' + card.border + ';border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:' + card.color + '">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:' + card.color + '">' + card.text + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#7A8F80;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    // All assigned work
    const allAssigned = activeDevices.filter(d => d.assignedTo && !d.resolved);
    if (allAssigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashAssignedWork') + '</p>';
      html += allAssigned.map(function(d) {
        const risk = getRisk(d.brand, d.pw, d.healthStatus);
        return alertRow(risk, (d.label || d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: d.assignedTo });
      }).join('');
    }
    // Unassigned open issues
    const unassigned = activeDevices.filter(d => !d.assignedTo && !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green');
    if (unassigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashUnassigned') + '</p>';
      html += unassigned.map(function(d) {
        return alertRow(getRisk(d.brand,d.pw,d.healthStatus), (d.label||d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: '' });
      }).join('');
    }
    // Partially resolved — waiting on Manager decision
    const mgrPartialDevs = activeDevices.filter(d => d.partiallyResolved && d.needsOwnerAction && !d.resolved);
    if (mgrPartialDevs.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">⚡ ' + t('partialDashLabel') + '</p>';
      html += mgrPartialDevs.map(function(d) {
        return '<div style="background:#EFEAF7;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="showDetail(' + d.id + ')">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#5B21B6">' + (d.label || d.type) + '</div>' +
            '<div style="font-size:12px;color:#3B0764">' + t('partialFixByLabel') + ': ' + (d.partialResolveBy || '—') + (d.escalation && d.escalation.reason ? ' · ' + d.escalation.reason : '') + '</div>' +
          '</div>' +
          '<i class="ti ti-chevron-right" style="color:#7A8F80;font-size:16px;flex-shrink:0"></i>' +
        '</div>';
      }).join('');
    }
    if (deviceProblems + networkProblems === 0) {
      html += '<div style="background:#FFFFFF;border:1px solid #D7E4D7;border-radius:8px;padding:12px 14px;font-size:13px;color:#111111;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('allGoodMsg') + '</span></div>';
    }

  // ── TECHNICIAN dashboard ───────────────────────────────────────────────────
  } else if (r === 'Technician') {
    const myName = currentUser.name || '';
    // My assigned work (including returned items)
    const myDevices = activeDevices.filter(d => d.assignedTo === myName && !d.resolved);
    if (myDevices.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('dashMyWork') + '</p>';
      html += myDevices.map(function(d) {
        const risk = getRisk(d.brand, d.pw, d.healthStatus);
        const returnedTag = d.returnedToTech ? ' ↩️' : '';
        return alertRow(risk, (d.label || d.type) + ' — ' + d.brand + returnedTag, 'showDetail(' + d.id + ')', { assignedTo: myName });
      }).join('');
    }
    // Unassigned open issues (available to pick up)
    const unassigned = activeDevices.filter(d => !d.assignedTo && !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green');
    if (unassigned.length > 0) {
      html += '<p style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px">' + t('dashUnassigned') + '</p>';
      html += unassigned.map(function(d) {
        return alertRow(getRisk(d.brand,d.pw,d.healthStatus), (d.label||d.type) + ' — ' + d.brand, 'showDetail(' + d.id + ')', { assignedTo: '' });
      }).join('');
    }
    if (myDevices.length === 0 && unassigned.length === 0) {
      html += '<div style="background:#E2EFE8;border:1px solid #BBD8C2;border-radius:8px;padding:12px 14px;font-size:13px;color:#1F4D2E;display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:#2E7A4E;flex-shrink:0"></div><span>' + t('techNoWorkMsg') + '</span></div>';
    }

  // ── DEFAULT (Farm Hand, Viewer) ────────────────────────────────────────────
  } else {
    // No separate "N problems" count card here — it would color its number
    // by severity (red if >0), the same leak the per-device notes below are
    // built to avoid. The device list itself, with neutral per-device notes,
    // is the complete picture; a count on top of it adds a cue, not information.
    html += '<p style="font-size:14px;font-weight:700;color:#22372A;margin:0 0 10px">' + t('dashYourDevices') + '</p>';
    if (activeDevices.length === 0) {
      html += '<p style="font-size:13px;color:#7A8F80;font-style:italic">' + t('noDevicesFound') + '</p>';
    } else {
      html += activeDevices.map(function(d) {
        const dRisk = getRisk(d.brand, d.pw, d.healthStatus);
        // Three states only: Fine / Known issue / Use with caution.
        // "Do-not-use" as a 4th state is retired. Colour-safe palette (no
        // red/yellow/amber for view-only roles): soft green / soft blue /
        // slate, with the icon shape carrying "caution" rather than colour.
        const isCaution = d.farmHandStatus === 'use-caution' || d.farmHandStatus === 'do-not-use';
        const isFine = d.farmHandStatus === 'keep-using' || (dRisk === 'green' && !d.farmHandStatus);
        // Calm, colour-safe states — no amber/yellow/red for view-only roles.
        const fh = isCaution
          ? { label: t('fhBadgeCaution'), icon: 'ti-alert-triangle', color: '#41506A', bg: '#E4E8EE' }
          : isFine
          ? { label: t('fhBadgeFine'), icon: 'ti-thumb-up', color: '#1F6E43', bg: '#E2EFE8' }
          : { label: t('fhBadgeKnownIssue'), icon: 'ti-info-circle', color: '#1A5FA8', bg: '#E6F0FA' };
        return '<div style="background:#FFFFFF;border:1px solid #D7E4D7;border-radius:10px;padding:11px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="showDetail(' + d.id + ')">' +
          '<span style="width:30px;height:30px;border-radius:8px;background:' + fh.bg + ';color:' + fh.color + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0"><i class="ti ti-device-desktop" aria-hidden="true"></i></span>' +
          '<span style="flex:1;min-width:0;font-size:14px;color:#111111">' + (d.label || d.type) + '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:' + fh.color + ';background:' + fh.bg + ';border-radius:20px;padding:4px 10px"><i class="ti ' + fh.icon + '" style="font-size:12px" aria-hidden="true"></i> ' + fh.label + '</span>' +
        '</div>';
      }).join('');
    }
  }

  html += securityTipsCard();
  const container = document.getElementById('dash-summary-cards');
  if (container) container.innerHTML = html;
  startTipTicker();

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

var _tipTimer = null, _tipIdx = 0;
function currentSecurityTips() {
  if (typeof LANG === 'undefined') return [];
  var arr = LANG[currentLang] && LANG[currentLang].securityTips;
  if (!arr || !arr.length) arr = (LANG.en && LANG.en.securityTips) || [];
  return arr || [];
}
function startTipTicker() {
  if (_tipTimer) { clearInterval(_tipTimer); _tipTimer = null; }
  if (typeof a11ySettings !== 'undefined' && a11ySettings.reducedMotion) return;
  var tips = currentSecurityTips();
  if (tips.length < 2) return;
  _tipTimer = setInterval(function() {
    var el = document.getElementById('dash-tip-text');
    if (!el) { clearInterval(_tipTimer); _tipTimer = null; return; }
    _tipIdx = (_tipIdx + 1) % tips.length;
    el.style.opacity = '0';
    setTimeout(function() { el.textContent = tips[_tipIdx]; el.style.opacity = '1'; }, 200);
  }, 6500);
}

function alertRow(level, msg, navFn, meta) {
  if (a11ySettings.colorBlind) msg = (level === 'red' ? '⛔ ' : level === 'info' ? 'ℹ️ ' : level === 'green' ? '✅ ' : '⚠️ ') + msg;
  const hc = a11ySettings.highContrast;
  const isInfo = (level === 'info');
  const dotColor = level === 'red'
    ? (hc ? '#CC0000' : '#E24B4A')
    : isInfo
      ? (hc ? '#005577' : '#1A5FA8')
      : (hc ? '#888800' : '#D4C000');
  const borderColor = hc ? '#000' : '#D7E4D7';
  const borderWidth = hc ? '3px' : '1px';
  const dotSize = hc ? '14px' : '10px';
  // Assignment status line — only for device issues (networks aren't assignable)
  var assignLine = '';
  if (meta && !meta.isNetwork && !meta.isStale) {
    assignLine = meta.assignedTo
      ? '<div style="align-self:flex-start;display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#1F4D2E;background:#E2EFE8;border:1px solid #BBD8C2;border-radius:10px;padding:1px 8px"><i class="ti ti-user-check" style="font-size:12px"></i>' + t('assignedToLabel') + ': ' + meta.assignedTo + '</div>'
      : '<div style="align-self:flex-start;display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#7A6514;background:#FBF6E9;border:1px solid #E6D8AE;border-radius:10px;padding:1px 8px"><i class="ti ti-user-question" style="font-size:12px"></i>' + t('unassignedLabel') + '</div>';
  }
  return '<div class="alert-row alert-row-' + level + '" style="background:#FFFFFF;border:' + borderWidth + ' solid ' + borderColor + ';border-radius:8px;">' +
    '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
      '<div class="risk-dot" style="flex-shrink:0;width:' + dotSize + ';height:' + dotSize + ';border-radius:50%;background:' + dotColor + (hc ? ';border:2px solid #000' : '') + '"></div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">' +
        '<span style="color:#22372A;font-weight:' + (hc ? '700' : '400') + '">' + msg + '</span>' +
        assignLine +
      '</div>' +
    '</div>' +
    '<button onclick="' + navFn + '" class="alert-fix-btn" style="background:' + (isInfo ? '#1A5FA8' : '#111') + ';color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;padding:4px 10px;white-space:nowrap;flex-shrink:0">' + (isInfo ? t('reviewBtn') : t('fixBtn')) + '</button>' +
  '</div>';
}
