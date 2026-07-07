/* AgriGuardian: device list, archive, filters */
function renderDeviceList() {
  // Archived/All expose device history and inventory management that isn't
  // relevant to view-only roles — same least-privilege reasoning as the team
  // members filter. A stale filter value from a previous session can't leak
  // an unauthorized view either, since it's shared global state, not per-user.
  const archivedBtn = document.getElementById('filter-archived');
  const allBtn = document.getElementById('filter-all');
  if (archivedBtn) archivedBtn.style.display = canSeeDetailedRisk() ? '' : 'none';
  if (allBtn) allBtn.style.display = canSeeDetailedRisk() ? '' : 'none';
  if (!canSeeDetailedRisk() && deviceFilter !== 'active') {
    deviceFilter = 'active';
    const activeBtn = document.getElementById('filter-active');
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }
  // Sorting by risk level implies caring about severity ordering, which
  // contradicts treating "known issue" as a single neutral state for
  // view-only roles — same reasoning as the badge colors being removed.
  const sortSelect = document.getElementById('sort-select');
  const sortRiskOpt = document.getElementById('opt-sort-risk');
  if (sortRiskOpt) sortRiskOpt.style.display = canSeeDetailedRisk() ? '' : 'none';
  if (sortSelect && !canSeeDetailedRisk() && sortSelect.value === 'risk') sortSelect.value = 'label';

  let filtered = devices;
  if (deviceFilter === 'active') filtered = devices.filter(d => !d.archived);
  if (deviceFilter === 'archived') filtered = devices.filter(d => d.archived);
  if (escalatedOnlyFilter) filtered = filtered.filter(d => d.needsOwnerAction && !d.resolved && !d.archived && !d.partiallyResolved);
  const sortBy = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'risk';
  const riskOrder = {red:0,yellow:1,green:2};
  filtered = [...filtered].sort((a,b) => {
    // Escalated open items always float to the top so they don't get buried.
    const aEsc = (a.needsOwnerAction && !a.resolved) ? 0 : 1;
    const bEsc = (b.needsOwnerAction && !b.resolved) ? 0 : 1;
    if (aEsc !== bEsc) return aEsc - bEsc;
    if (sortBy === 'risk') return riskOrder[getRisk(a.brand,a.pw,a.healthStatus)] - riskOrder[getRisk(b.brand,b.pw,b.healthStatus)];
    if (sortBy === 'brand') return (a.brand||'').localeCompare(b.brand||'');
    if (sortBy === 'type') return (a.type||'').localeCompare(b.type||'');
    if (sortBy === 'location') return (a.location||'').localeCompare(b.location||'');
    if (sortBy === 'label') return (a.label||'').localeCompare(b.label||'');
    return 0;
  });
  const list = document.getElementById('device-list');
  let notice = '';
  if (escalatedOnlyFilter) {
    notice = '<div style="background:#FAF5FF;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:13px;color:#5B21B6;display:flex;align-items:center;justify-content:space-between;gap:10px"><span><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px" aria-hidden="true"></i> ' + t('escFilterNotice') + '</span><button onclick="clearEscalatedFilter()" style="background:#fff;border:1px solid #C4B5FD;color:#5B21B6;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">' + t('escClearFilter') + '</button></div>';
  }
  if (filtered.length === 0) {
    list.innerHTML = notice + '<p style="font-size:13px;color:#888;font-style:italic;padding:12px 0">No devices ' + (deviceFilter === 'archived' ? 'archived' : 'found') + '.</p>';
  } else {
    list.innerHTML = notice + filtered.map(d => deviceCardHTML(d, true)).join('');
  }
}

function deviceCardHTML(d, showActions) {
  const realRisk = getRisk(d.brand, d.pw, d.healthStatus);
  const canSee = canSeeIssue(d);
  const coarse = canSee && !canSeeDetailedRisk();
  const isPartial = d.partiallyResolved && !d.resolved && d.needsOwnerAction;
  // Coarse (Farm Hand/Viewer) indicator: three states only (2026-07-06,
  // explicit) — Fine / Known issue / Use with caution. "Do-not-use" as a 4th
  // state is retired. Themed but deliberately calm colors (reusing the
  // app's brand green and neutral amber, not a red/alarm palette) rather
  // than the previous plain-gray-text treatment, so it doesn't read as
  // "nothing's happening here" while still not signaling crisis severity.
  const fhCaution = d.farmHandStatus === 'use-caution' || d.farmHandStatus === 'do-not-use';
  const fhFine = d.farmHandStatus === 'keep-using' || (realRisk === 'green' && !d.farmHandStatus);
  const fh = fhCaution
    ? { label: t('fhBadgeCaution'), icon: 'ti-alert-triangle', color: '#7A6514', bg: '#FBF6E9', border: '#F5E9B8' }
    : fhFine
    ? { label: t('fhBadgeFine'), icon: 'ti-thumb-up', color: '#1F4D2E', bg: '#EAF3EC', border: '#BBD8C2' }
    : { label: t('fhBadgeKnownIssue'), icon: 'ti-info-circle', color: '#555', bg: '#F4F6F8', border: '#dde2e6' };
  const risk = !canSee ? 'gray' : isPartial ? 'purple' : (coarse ? 'gray' : realRisk);
  const resolvedFull = d.resolved && canSee && !coarse && !d.archived;
  const badgeClass = resolvedFull ? 'badge-green' : 'badge-' + risk;
  const dotClass = resolvedFull ? 'dot-green' : 'dot-' + risk;
  const fhIcon = fh.icon;
  const badgeLabel = !canSee
    ? 'Restricted'
    : isPartial ? t('partiallyResolvedBadge')
    : (coarse ? fh.label : getRiskBadgeLabel(risk, d.resolved));
  const dotTitle = !canSee ? 'Not assigned to you' : isPartial ? t('partiallyResolvedBadge') : (coarse ? fh.label : '');
  const archivedTag = d.archived ? '<span class="archived-tag">Archived</span>' : '';
  const escalatedTag = (d.needsOwnerAction && !d.resolved && canSee && canSeeDetailedRisk())
    ? '<span style="margin-left:6px;display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#5B21B6;background:#F3EEFF;border:1px solid #C4B5FD;border-radius:10px;padding:1px 7px;vertical-align:middle"><i class="ti ti-flag" style="font-size:10px" aria-hidden="true"></i> ' + t('escPill') + '</span>'
    : '';
  const partialTag = (isPartial && canSee && canSeeDetailedRisk())
    ? '<span style="margin-left:6px;display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#5B21B6;background:#F3EEFF;border:1px solid #C4B5FD;border-radius:10px;padding:1px 7px;vertical-align:middle">⚡ ' + t('partiallyResolvedBadge') + '</span>'
    : '';
  const actions = (showActions && canArchiveDevices()) ? (
    '<div class="device-actions" onclick="event.stopPropagation()">' +
      (d.archived
        ? '<button class="device-action-btn" onclick="unarchiveDevice(' + d.id + ')" title="Restore">Restore</button>'
        : '<button class="device-action-btn" onclick="archiveDevice(' + d.id + ')" title="Archive">'+t('archive')+'</button>') +
      '<button class="device-action-btn danger" onclick="deleteDevice(' + d.id + ')" title="Delete">'+t('delete')+'</button>' +
    '</div>'
  ) : '';
  return '<div class="device-card" onclick="showDetail(' + d.id + ')" style="' + (d.archived ? 'opacity:0.6' : '') + '">' +
    (coarse
      ? '<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0" title="' + dotTitle + '"><i class="ti ' + fhIcon + '" style="font-size:17px;color:' + fh.color + '" aria-hidden="true"></i></div>'
      : '<div class="risk-dot ' + dotClass + '" title="' + dotTitle + '"></div>') +
    '<div class="device-info">' +
      '<div class="device-name">' + (d.label || d.type) + archivedTag + partialTag + escalatedTag + '</div>' +
      '<div class="device-brand">' + d.brand + ' &middot; ' + translateDeviceType(d.type) + '</div>' +
      ((canSee && !coarse && d.assignedTo && !d.resolved && realRisk !== 'green')
        ? '<div style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:#1F4D2E;background:#EAF3EC;border:1px solid #BBD8C2;border-radius:10px;padding:1px 8px"><i class="ti ti-user-check" style="font-size:12px"></i>' + d.assignedTo + '</div>'
        : '') +
    '</div>' +
    (showActions
      ? (coarse
          ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:' + fh.color + ';background:' + fh.bg + ';border:1px solid ' + fh.border + ';border-radius:20px;padding:3px 10px;flex-shrink:0"><i class="ti ' + fh.icon + '" style="font-size:12px" aria-hidden="true"></i>' + fh.label + '</span>'
          : ((a11ySettings.colorBlind ? '<span class="risk-badge ' + badgeClass + '" style="margin-right:4px">' + (!canSee ? '🔒' : ({red:'⛔',yellow:'⚠️',green:'✅'}[d.resolved?'green':risk]||'')) + '</span>' : '') + actions))
      : (coarse
          ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:' + fh.color + ';background:' + fh.bg + ';border:1px solid ' + fh.border + ';border-radius:20px;padding:3px 10px"><i class="ti ' + fh.icon + '" style="font-size:12px" aria-hidden="true"></i>' + fh.label + '</span>'
          : '<span class="risk-badge ' + badgeClass + '">' + badgeLabel + '</span>')) +
  '</div>';
}


var userFilter = 'active';

function setUserFilter(filter, btn) {
  userFilter = filter;
  document.querySelectorAll('#user-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSettings();
}

function archiveDevice(id) {
  if (!canArchiveDevices()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  if (!confirm('Archive this device? It will be hidden from your active dashboard but its history will be kept.')) return;
  d.archived = true;
  logAction('Device archived', (d.label||d.type) + ' (' + d.brand + ')');
  renderDashList();
  renderDeviceList();
  renderNetworkList();
}

function unarchiveDevice(id) {
  if (!canArchiveDevices()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  d.archived = false;
  // If the underlying issue was never actually fixed (device was archived as
  // a replacement, or archived while unresolved), revert to the unresolved
  // state so it re-enters the hygiene queue instead of showing a stale green.
  var wasReplaced = /replaced/i.test(d.archiveReason || '') ||
    (typeof d.resolveStatus === 'string' && /Device replaced|Dispositivo reemplazado/i.test(d.resolveStatus));
  d.archiveReason = '';
  if (!d.resolved || wasReplaced) {
    d.resolved = false;
    d.resolveStatus = '';
    d.resolvedDate = '';
    d.verifiedDate = '';
    if (!d.flaggedDate) d.flaggedDate = localTimestamp();
    logAction('Device restored — unresolved', (d.label||d.type) + ' (' + d.brand + ') restored from archive; issue reopened');
  } else {
    logAction('Device restored', (d.label||d.type) + ' (' + d.brand + ') restored from archive');
  }
  renderDashList();
  renderDeviceList();
}

function deleteDevice(id) {
  if (!canHardDelete()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  const hasHistory = d.resolved || d.resolveNote || d.healthStatus || d.verifiedDate || d.resolvedDate || d.healthDate;
  if (hasHistory) {
    const choice = confirm(
      'WARNING: This device has existing records.\n\n' +
      'Deleting it will permanently erase all its history, risk records, and notes.\n\n' +
      'We strongly recommend Archive instead — it removes the device from your active list but keeps all records.\n\n' +
      'Tap OK to permanently delete anyway.\nTap Cancel to go back (then use Archive).'
    );
    if (!choice) return;
  } else {
    if (!confirm('Permanently delete this device? This cannot be undone.')) return;
  }
  devices = devices.filter(x => x.id !== id);
  logAction('Device deleted', (d.label||d.type) + ' (' + d.brand + ') permanently removed');
  renderDashList();
  renderDeviceList();
}

var deviceFilter = 'active';

// Audit log
