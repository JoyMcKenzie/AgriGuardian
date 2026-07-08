/* AgriGuardian: apps inventory and backup screen */
var appFilter = 'active';

function setAppFilter(filter, btn) {
  appFilter = filter;
  document.querySelectorAll('#app-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAppsList();
}

// ─── Backup screen render + save ────────────────────────────────────────────
function renderBackupScreen() {
  const el = document.getElementById('backup-screen-content');
  if (!el || !canSeeBackups()) return;
  const risk = getBackupRisk();
  const iconMap = { red: 'ti-alert-circle', yellow: 'ti-alert-triangle', green: 'ti-circle-check' };

  const checkRow = function(checked, labelKey, noteVal, noteKey, noteId) {
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #E4EEE4">' +
      '<span style="font-size:20px;flex-shrink:0;margin-top:1px">' + (checked ? '✅' : '⬜') + '</span>' +
      '<div style="flex:1">' +
        '<div style="font-size:13px;font-weight:600;color:#222">' + t(labelKey) + '</div>' +
        (noteVal ? '<div style="font-size:12px;color:#5F7266;margin-top:2px">' + noteVal + '</div>' : '') +
      '</div>' +
    '</div>';
  };

  el.innerHTML =
    // Risk banner
    '<div class="risk-detail risk-detail-' + risk + '" style="margin-bottom:14px">' +
      '<div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getBackupRiskLabel() + '</div>' +
      '<p>' + getBackupRiskWhy() + '</p>' +
    '</div>' +

    '<div class="action-box" style="margin-bottom:16px">' +
      '<div class="action-label">' + t('recommendedAction') + '</div>' +
      '<div class="action-text">' + getBackupRecAction() + '</div>' +
    '</div>' +

    // 3-2-1 status at a glance
    '<p class="section-title">' + t('backup321Title') + '</p>' +
    '<div style="background:#F3F8F2;border:1px solid #D7E4D7;border-radius:10px;padding:0 12px;margin-bottom:16px">' +
      checkRow(farmBackup.hasPrimary,   'backup321Copy1Label', farmBackup.primaryNote,   'backup321Copy1Note', 'primary') +
      checkRow(farmBackup.hasSecondary, 'backup321Copy2Label', farmBackup.secondaryNote, 'backup321Copy2Note', 'secondary') +
      '<div style="border-bottom:none">' +
        checkRow(farmBackup.hasOffsite, 'backup321Copy3Label', farmBackup.offsiteNote,   'backup321Copy3Note', 'offsite') +
      '</div>' +
    '</div>' +

    // Last verified
    (farmBackup.lastVerified ?
      '<div class="detail-row" style="margin-bottom:14px"><span class="detail-key">' + t('backupLastVerified') + '</span><span class="detail-val">' + farmBackup.lastVerified + (isBackupVerifyStale() ? ' <span style="color:#D4C000">(' + t('staleVerifyBadge') + ')</span>' : '') + '</span></div>' : '') +

    // Notes
    (farmBackup.notes ?
      '<div style="background:#F3F8F2;border-radius:8px;padding:10px 12px;margin-bottom:16px">' +
        '<div style="font-size:11px;font-weight:600;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + t('notes') + '</div>' +
        '<div style="font-size:13px;color:#22372A;white-space:pre-line">' + farmBackup.notes + '</div>' +
      '</div>' : '') +

    // Edit form
    '<div class="resolve-box">' +
      '<div class="resolve-title">' + t('backupUpdateTitle') + '</div>' +

      // Copy 1
      '<p style="font-size:12px;font-weight:700;color:#1F4D2E;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('backup321Copy1Label') + '</p>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 10px;border:1px solid #CBD8CB;border-radius:8px;cursor:pointer;margin-bottom:8px">' +
        '<input type="checkbox" id="bk-primary" ' + (farmBackup.hasPrimary ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('backupHaveThisCopy') +
      '</label>' +
      '<input type="text" id="bk-primary-note" value="' + (farmBackup.primaryNote||'').replace(/"/g,'&quot;') + '" placeholder="' + t('backup321Copy1Placeholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;margin-bottom:14px">' +

      // Copy 2
      '<p style="font-size:12px;font-weight:700;color:#1F4D2E;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('backup321Copy2Label') + '</p>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 10px;border:1px solid #CBD8CB;border-radius:8px;cursor:pointer;margin-bottom:8px">' +
        '<input type="checkbox" id="bk-secondary" ' + (farmBackup.hasSecondary ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('backupHaveThisCopy') +
      '</label>' +
      '<input type="text" id="bk-secondary-note" value="' + (farmBackup.secondaryNote||'').replace(/"/g,'&quot;') + '" placeholder="' + t('backup321Copy2Placeholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;margin-bottom:14px">' +

      // Copy 3
      '<p style="font-size:12px;font-weight:700;color:#1F4D2E;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('backup321Copy3Label') + '</p>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 10px;border:1px solid #CBD8CB;border-radius:8px;cursor:pointer;margin-bottom:8px">' +
        '<input type="checkbox" id="bk-offsite" ' + (farmBackup.hasOffsite ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('backupHaveThisCopy') +
      '</label>' +
      '<input type="text" id="bk-offsite-note" value="' + (farmBackup.offsiteNote||'').replace(/"/g,'&quot;') + '" placeholder="' + t('backup321Copy3Placeholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;margin-bottom:14px">' +

      // Last verified date
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('backupLastVerified') + '</label>' +
        '<input type="date" id="bk-verified" value="' + (farmBackup.lastVerified||'') + '" style="width:100%;font-size:14px;padding:9px 12px;border:1px solid #CBD8CB;border-radius:8px">' +
      '</div>' +

      // Notes
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:6px">' + t('additionalNotes') + ' <span style="color:#A32D2D;font-weight:400">*' + t('required') + '</span></label>' +
        '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
        '<textarea id="bk-notes" rows="3" placeholder="' + t('backupNotesPlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit">' + (farmBackup.notes||'') + '</textarea>' +
      '</div>' +

      '<button class="resolve-btn" onclick="saveBackup()" style="background:#1F4D2E;font-size:15px;padding:13px">' + t('saveBtn') + '</button>' +
    '</div>';
}

function saveBackup() {
  if (!canSeeBackups()) return;
  // Notes are mandatory: the owner must record WHERE each backup lives.
  var bkNoteEl = document.getElementById('bk-notes');
  if (!bkNoteEl || !bkNoteEl.value.trim()) {
    alert(t('backupNotesRequired'));
    if (bkNoteEl) bkNoteEl.focus();
    return;
  }
  farmBackup.hasPrimary   = document.getElementById('bk-primary')?.checked   || false;
  farmBackup.hasSecondary = document.getElementById('bk-secondary')?.checked || false;
  farmBackup.hasOffsite   = document.getElementById('bk-offsite')?.checked   || false;
  farmBackup.primaryNote   = document.getElementById('bk-primary-note')?.value.trim()   || '';
  farmBackup.secondaryNote = document.getElementById('bk-secondary-note')?.value.trim() || '';
  farmBackup.offsiteNote   = document.getElementById('bk-offsite-note')?.value.trim()   || '';
  farmBackup.lastVerified  = document.getElementById('bk-verified')?.value || '';
  farmBackup.notes         = document.getElementById('bk-notes')?.value.trim() || '';
  logAction('logBackupStatusUpdated', {raw: '3-2-1: primary=' + farmBackup.hasPrimary + ' secondary=' + farmBackup.hasSecondary + ' offsite=' + farmBackup.hasOffsite});
  renderBackupScreen();
}

function renderAppsList() {
  const list = document.getElementById('apps-list');
  if (!list) return;
  if (!canSeeApps()) { list.innerHTML = ''; return; }
  if (apps.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#7A8F80;font-style:italic;padding:8px 0">' + t('noAppsYet') + '</p>';
    return;
  }
  let filtered = apps;
  if (appFilter === 'active') filtered = apps.filter(a => !a.archived);
  if (appFilter === 'archived') filtered = apps.filter(a => a.archived);
  const riskOrder = {red:0, yellow:1, green:2};
  const sorted = [...filtered].sort((a,b) => riskOrder[getAppRisk(a)] - riskOrder[getAppRisk(b)]);
  list.innerHTML = sorted.map(function(a) {
    const risk = getAppRisk(a);
    return '<div class="device-card" style="margin-bottom:10px;cursor:pointer" onclick="showAppDetail(' + a.id + ')">' +
      '<div class="risk-dot dot-' + risk + '"></div>' +
      '<div class="device-info">' +
        '<div class="device-name">' + a.name + '</div>' +
        '<div class="device-brand">' + (a.vendor || '') + '</div>' +
      '</div>' +
      '<div class="device-actions" onclick="event.stopPropagation()">' +
        (a11ySettings.colorBlind ? '<span class="risk-badge badge-' + risk + '" style="margin-right:2px">' + ({red:'⛔',yellow:'⚠️',green:'✅'}[risk]||'') + '</span>' : '') +
        (a.archived
          ? '<button class="device-action-btn" onclick="restoreApp(' + a.id + ')" title="' + t('restore') + '"><i class="ti ti-arrow-back-up" aria-hidden="true"></i><span class="sr-only">' + t('restore') + '</span></button>'
          : '<button class="device-action-btn" onclick="archiveApp(' + a.id + ')" title="' + t('archive') + '"><i class="ti ti-archive" aria-hidden="true"></i><span class="sr-only">' + t('archive') + '</span></button>') +
        '<button class="device-action-btn danger" onclick="deleteApp(' + a.id + ')" title="' + t('delete') + '"><i class="ti ti-trash" aria-hidden="true"></i><span class="sr-only">' + t('delete') + '</span></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function getAppRecAction(a) {
  if (a.flaggedInsecure) return t('appRecActionFlagged');
  if (a.reviewed !== 'yes' || !a.lastReviewedDate) return t('appRecActionReview');
  if (a.mfaEnabled !== 'yes') return t('appRecActionNoMfa');
  if (isAppReviewStale(a)) return t('appRecActionStale');
  return t('appRecActionGood');
}

// ─── Animated accordion helper for the app detail screen ───────────────────
// Same pattern as devices-detail.js's deviceAccSection()/networks.js's
// netAccSection() — nested wrapper so max-height:0 fully collapses with no
// residual padding gap, real scrollHeight measured at toggle time. Kept
// app-scoped (distinct DOM id prefix) to avoid any cross-screen bleed.
// All sections default collapsed — no actionability-based auto-open (that
// pattern was tried on devices/networks earlier and caused multiple sections
// to open simultaneously for roles who could act on almost everything;
// removed there, never introduced here in the first place).
function appAccSection(key, appId, iconClass, title, previewHTML, bodyHTML) {
  var bodyId = 'app-acc-body-' + key + '-' + appId;
  var btnId = 'app-acc-btn-' + key + '-' + appId;
  var chevId = 'app-acc-chev-' + key + '-' + appId;
  return '<div style="border:1px solid #CBD8CB;border-radius:10px;margin-bottom:8px;overflow:hidden">' +
    '<button type="button" id="' + btnId + '" onclick="toggleAppAcc(\'' + key + '\',' + appId + ')" aria-expanded="false" style="width:100%;display:flex;align-items:center;gap:8px;padding:13px 12px;background:#F3F8F2;border:none;text-align:left;cursor:pointer;min-height:44px;transition:background-color 0.2s ease;font-family:inherit">' +
      '<i class="ti ' + iconClass + '" style="font-size:16px;color:#1F4D2E;flex-shrink:0"></i>' +
      '<span style="font-size:13px;font-weight:500;color:#22372A;flex-shrink:0">' + title + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:#7A8F80;white-space:nowrap;flex-shrink:1;padding-left:6px;overflow:hidden;text-overflow:ellipsis;max-width:150px">' + (previewHTML||'') + '</span>' +
      '<i id="' + chevId + '" class="ti ti-chevron-down" style="font-size:15px;color:#7A8F80;flex-shrink:0;display:inline-block;transform:rotate(0deg);transition:transform 0.25s ease"></i>' +
    '</button>' +
    '<div id="' + bodyId + '" data-open="false" style="overflow:hidden;transition:max-height 0.3s ease;max-height:0px">' +
      '<div style="padding:0 14px 12px;border-top:1px solid #E4EEE4">' + bodyHTML + '</div>' +
    '</div>' +
  '</div>';
}
function initAppAccordionState(appId) {
  document.querySelectorAll('[id^="app-acc-body-"][id$="-' + appId + '"]').forEach(function(wrap) {
    wrap.style.maxHeight = '0px';
  });
}
function toggleAppAcc(key, appId) {
  var wrap = document.getElementById('app-acc-body-' + key + '-' + appId);
  var btn = document.getElementById('app-acc-btn-' + key + '-' + appId);
  var chev = document.getElementById('app-acc-chev-' + key + '-' + appId);
  if (!wrap || !btn) return;
  var inner = wrap.firstElementChild;
  var isOpen = wrap.getAttribute('data-open') === 'true';
  if (isOpen) {
    wrap.style.maxHeight = '0px';
    wrap.setAttribute('data-open', 'false');
    btn.style.backgroundColor = '#fff';
  } else {
    wrap.style.maxHeight = (inner ? inner.scrollHeight : wrap.scrollHeight) + 'px';
    wrap.setAttribute('data-open', 'true');
    btn.style.backgroundColor = '#E2EFE8';
  }
  if (chev) chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  btn.setAttribute('aria-expanded', String(!isOpen));
}

function showAppDetail(id, keepScreen) {
  if (!canSeeApps()) return;
  currentDetailView = { type: 'app', id: id };
  const a = apps.find(x => x.id === id);
  if (!a) return;
  const panel = document.getElementById('app-detail-content');
  if (!panel) return;
  panel.setAttribute('data-app-id', id);

  const risk = getAppRisk(a);
  const iconMap = { red: 'ti-alert-circle', yellow: 'ti-alert-triangle', green: 'ti-circle-check' };

  panel.innerHTML =
    '<div class="device-name-large">' + a.name + '</div>' +
    '<div class="device-sub">' + (a.vendor || '') + '</div>' +

    '<div class="risk-detail risk-detail-' + risk + '"><div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getAppRiskLabel(risk) + '</div><p>' + getAppRiskWhy(a) + '</p></div>' +

    appAccSection('fix', a.id, 'ti-bulb', t('howToFixTitle'), '',
      '<div class="action-box" style="margin:10px 0 0">' +
        '<div class="action-label">' + t('recommendedAction') + '</div>' +
        '<div class="action-text">' + getAppRecAction(a) + '</div>' +
      '</div>') +

    appAccSection('details', a.id, 'ti-list-details', t('appDetailsTitle'), '',
      '<div class="detail-row" style="margin-top:10px"><span class="detail-key">' + t('appPurposeLabel') + '</span><span class="detail-val">' + (a.purpose || '') + '</span></div>' +
      (a.accountOwner ? '<div class="detail-row"><span class="detail-key">' + t('appAccountOwnerLabel') + '</span><span class="detail-val">' + a.accountOwner + '</span></div>' : '') +
      '<div class="detail-row"><span class="detail-key">' + t('appMfaLabel') + '</span><span class="detail-val">' + (a.mfaEnabled === 'yes' ? t('pwYesVal') : t('pwNoVal')) + '</span></div>' +
      '<div class="detail-row"><span class="detail-key">' + t('appPwManagerLabel') + '</span><span class="detail-val">' + (a.pwManagerUsed === 'yes' ? (a.pwManagerName ? a.pwManagerName : t('pwYesVal')) : t('pwNoVal')) + '</span></div>' +
      '<div class="detail-row"><span class="detail-key">' + t('appReviewedLabel') + '</span><span class="detail-val">' + (a.reviewed === 'yes' ? t('pwYesVal') : t('pwNoVal')) + '</span></div>' +
      (a.lastReviewedDate ? '<div class="detail-row"><span class="detail-key">' + t('appLastReviewedLabel') + '</span><span class="detail-val">' + a.lastReviewedDate + (isAppReviewStale(a) ? ' <span style="color:#D4C000">(' + t('staleVerifyBadge') + ')</span>' : '') + '</span></div>' : '') +
      (a.renewal ? '<div class="detail-row"><span class="detail-key">' + t('appRenewalLabel') + '</span><span class="detail-val">' + a.renewal + '</span></div>' : '')) +

    (a.notes ? appAccSection('notes', a.id, 'ti-note', t('notes'), a.notes.split('\n')[0],
      '<div style="font-size:13px;color:#22372A;white-space:pre-line;margin-top:10px">' + a.notes + '</div>') : '') +

    appAccSection('review', a.id, 'ti-checklist', t('appReviewBoxTitle'), '',
      '<div style="margin-top:10px">' +
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('appAccountOwnerLabel') + '</label>' +
        '<input type="text" id="app-owner-' + id + '" value="' + (a.accountOwner || '').replace(/"/g,'&quot;') + '" placeholder="' + t('appAccountOwnerPlaceholder') + '" style="width:100%;font-size:14px;padding:9px 12px;border:1px solid #CBD8CB;border-radius:8px">' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('appRenewalLabel') + ' <span style="color:#aaa;font-weight:400;font-size:11px">(' + t('optional') + ')</span></label>' +
        '<input type="text" id="app-renewal-' + id + '" value="' + (a.renewal || '').replace(/"/g,'&quot;') + '" placeholder="' + t('appRenewalPlaceholder') + '" style="width:100%;font-size:14px;padding:9px 12px;border:1px solid #CBD8CB;border-radius:8px">' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('appMfaLabel') + '</label>' +
        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">' +
          '<label class="radio-opt" onclick="selectAppMfa(this,\'yes\')"><input type="radio" name="app-mfa-' + id + '" value="yes" ' + (a.mfaEnabled === 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwYesVal') + '</label>' +
          '<label class="radio-opt" onclick="selectAppMfa(this,\'no\')"><input type="radio" name="app-mfa-' + id + '" value="no" ' + (a.mfaEnabled !== 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwNoVal') + '</label>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('appPwManagerQuestion') + '</label>' +
        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">' +
          '<label class="radio-opt" onclick="selectAppPwManager(this,\'yes\',' + id + ')"><input type="radio" name="app-pwmgr-' + id + '" value="yes" ' + (a.pwManagerUsed === 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwYesVal') + '</label>' +
          '<label class="radio-opt" onclick="selectAppPwManager(this,\'no\',' + id + ')"><input type="radio" name="app-pwmgr-' + id + '" value="no" ' + (a.pwManagerUsed !== 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwNoVal') + '</label>' +
        '</div>' +
        '<div id="app-pwmgr-name-row-' + id + '" style="margin-top:8px;display:' + (a.pwManagerUsed === 'yes' ? 'block' : 'none') + '">' +
          '<input type="text" id="app-pwmgr-name-' + id + '" value="' + (a.pwManagerName || '').replace(/"/g,'&quot;') + '" placeholder="' + t('appPwManagerNamePlaceholder') + '" style="width:100%;font-size:14px;padding:9px 12px;border:1px solid #CBD8CB;border-radius:8px">' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:10px">' +
        '<label class="form-label">' + t('appReviewedLabel') + '</label>' +
        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">' +
          '<label class="radio-opt" onclick="selectAppReviewed(this,\'yes\')"><input type="radio" name="app-reviewed-' + id + '" value="yes" ' + (a.reviewed === 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwYesVal') + '</label>' +
          '<label class="radio-opt" onclick="selectAppReviewed(this,\'no\')"><input type="radio" name="app-reviewed-' + id + '" value="no" ' + (a.reviewed !== 'yes' ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + t('pwNoVal') + '</label>' +
        '</div>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 10px;border:1px solid #CBD8CB;border-radius:8px;cursor:pointer;margin-bottom:12px;background:' + (a.flaggedInsecure ? '#FCEBEB' : '#fff') + '">' +
        '<input type="checkbox" id="app-flag-insecure-' + id + '" ' + (a.flaggedInsecure ? 'checked' : '') + ' style="width:auto;accent-color:#A32D2D"> ' + t('appFlagInsecureLabel') +
      '</label>' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:6px">' + t('additionalNotes') + ' <span style="color:#aaa;font-weight:400">' + t('optional') + '</span></label>' +
        '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
        '<textarea id="app-note-' + id + '" rows="3" placeholder="' + t('appNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit">' + (a.notes || '') + '</textarea>' +
      '</div>' +
      '<button class="resolve-btn" onclick="saveAppReview(' + id + ')" style="background:#1F4D2E;font-size:15px;padding:13px">' + t('saveBtn') + '</button>' +
      '</div>');

  if (!keepScreen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-app-detail').classList.add('active');
  }
  initAppAccordionState(id);
}

function selectAppReviewed(el, val) {
  el.closest('.form-group').querySelectorAll('.radio-opt').forEach(l => l.classList.remove('selected'));
  el.classList.add('selected');
}

function selectAppMfa(el, val) {
  el.closest('.form-group').querySelectorAll('.radio-opt').forEach(l => l.classList.remove('selected'));
  el.classList.add('selected');
}

function selectAppPwManager(el, val, id) {
  el.closest('.form-group').querySelectorAll('.radio-opt').forEach(l => l.classList.remove('selected'));
  el.classList.add('selected');
  const nameRow = document.getElementById('app-pwmgr-name-row-' + id);
  if (nameRow) nameRow.style.display = val === 'yes' ? 'block' : 'none';
}

function saveAppReview(id) {
  if (!canSeeApps()) return; // RBAC (W4): parity with archive/restore/delete
  const a = apps.find(x => x.id === id);
  if (!a) return;
  const panel = document.getElementById('app-detail-content');
  const ctx = panel || document;
  const reviewedRadio = ctx.querySelector('input[name="app-reviewed-' + id + '"]:checked');
  a.reviewed = reviewedRadio ? reviewedRadio.value : a.reviewed;
  if (a.reviewed === 'yes') a.lastReviewedDate = new Date().toISOString().slice(0,10);
  const mfaRadio = ctx.querySelector('input[name="app-mfa-' + id + '"]:checked');
  a.mfaEnabled = mfaRadio ? mfaRadio.value : a.mfaEnabled;
  const pwMgrRadio = ctx.querySelector('input[name="app-pwmgr-' + id + '"]:checked');
  a.pwManagerUsed = pwMgrRadio ? pwMgrRadio.value : a.pwManagerUsed;
  const pwMgrNameEl = ctx.querySelector('#app-pwmgr-name-' + id);
  a.pwManagerName = (a.pwManagerUsed === 'yes' && pwMgrNameEl) ? pwMgrNameEl.value.trim() : '';
  const ownerEl = ctx.querySelector('#app-owner-' + id);
  a.accountOwner = ownerEl ? ownerEl.value.trim() : a.accountOwner;
  const renewalEl = ctx.querySelector('#app-renewal-' + id);
  a.renewal = renewalEl ? renewalEl.value.trim() : a.renewal;
  const flagEl = ctx.querySelector('#app-flag-insecure-' + id);
  a.flaggedInsecure = flagEl ? flagEl.checked : a.flaggedInsecure;
  const noteEl = ctx.querySelector('#app-note-' + id);
  a.notes = noteEl ? noteEl.value.trim() : a.notes;
  logAction('logAppReviewed', {raw: a.name + ' — ' + (a.reviewed === 'yes' ? 'reviewed' : 'not reviewed') + (a.flaggedInsecure ? ' (flagged insecure)' : '') + (a.mfaEnabled !== 'yes' ? ' (MFA off)' : '')});
  renderAppsList();
  showScreen('apps', document.getElementById('nav-btn-apps'));
}

function populateAppPicker() {
  const sel = document.getElementById('app-picker');
  if (!sel || sel.getAttribute('data-populated') === 'true') return;
  const otherOpt = sel.querySelector('option[value="__other_app__"]');
  APP_CATALOG.forEach(function(cat) {
    const og = document.createElement('optgroup');
    og.label = cat.groupKey ? t(cat.groupKey) : cat.group;
    cat.items.forEach(function(item) {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      og.appendChild(opt);
    });
    sel.insertBefore(og, otherOpt);
  });
  sel.setAttribute('data-populated', 'true');
}

function toggleAppAddForm() {
  const form = document.getElementById('app-add-form');
  if (!form) return;
  const isOpen = form.style.display === 'block';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    populateAppPicker();
    const customRow = document.getElementById('app-name-custom-row');
    if (customRow) customRow.style.display = 'block';
  }
  const appList = document.getElementById('apps-list');
  const filterRow = document.getElementById('app-filter-row');
  if (appList) appList.style.display = isOpen ? '' : 'none';
  if (filterRow) filterRow.style.display = isOpen ? '' : 'none';
}

function handleAppPickerSelect(sel) {
  const customRow = document.getElementById('app-name-custom-row');
  if (sel.value === '__other_app__') {
    if (customRow) customRow.style.display = 'block';
  } else {
    if (customRow) customRow.style.display = 'none';
    const nameInput = document.getElementById('app-name');
    if (nameInput && sel.value) nameInput.value = sel.value;
  }
}

function addApp() {
  if (!canSeeApps()) return; // RBAC (W4): Apps area is Owner-only
  const picker = document.getElementById('app-picker');
  let name = document.getElementById('app-name').value.trim();
  if (picker && picker.value && picker.value !== '__other_app__') name = picker.value;
  const vendor = document.getElementById('app-vendor').value.trim();
  const purpose = document.getElementById('app-purpose').value.trim();
  const accountOwner = document.getElementById('app-owner-new').value.trim();
  const renewal = document.getElementById('app-renewal-new').value.trim();
  const mfaEnabled = document.querySelector('input[name="app-add-mfa"]:checked')?.value || 'no';
  const pwManagerUsed = document.querySelector('input[name="app-add-pwmgr"]:checked')?.value || 'no';
  const pwManagerNameEl = document.getElementById('app-pwmgr-name-new');
  const pwManagerName = (pwManagerUsed === 'yes' && pwManagerNameEl) ? pwManagerNameEl.value.trim() : '';
  const reviewed = document.querySelector('input[name="app-add-reviewed"]:checked')?.value || 'no';
  if (!name || !purpose) { alert(t('fillAllFields')); return; }
  const today = new Date().toISOString().slice(0,10);
  apps.push({
    id: nextAppId++, archived: false, name, vendor: vendor || '', purpose,
    accountOwner: accountOwner || '', mfaEnabled, pwManagerUsed, pwManagerName, renewal: renewal || '',
    reviewed, flaggedInsecure: false,
    lastReviewedDate: reviewed === 'yes' ? today : '',
    notes: ''
  });
  logAction('logAppAdded', {raw: name + (vendor ? ' (' + vendor + ')' : '')});
  if (picker) picker.value = '';
  document.getElementById('app-name').value = '';
  document.getElementById('app-vendor').value = '';
  document.getElementById('app-purpose').value = '';
  document.getElementById('app-owner-new').value = '';
  document.getElementById('app-renewal-new').value = '';
  if (pwManagerNameEl) pwManagerNameEl.value = '';
  const pwMgrNameRow = document.getElementById('app-pwmgr-name-row-new');
  if (pwMgrNameRow) pwMgrNameRow.style.display = 'none';
  const customRow = document.getElementById('app-name-custom-row');
  if (customRow) customRow.style.display = 'none';
  document.querySelectorAll('input[name="app-add-reviewed"], input[name="app-add-mfa"], input[name="app-add-pwmgr"]').forEach(r => { r.checked = false; r.closest('label').classList.remove('selected'); });
  const form = document.getElementById('app-add-form');
  if (form) form.style.display = 'none';
  const appList = document.getElementById('apps-list');
  if (appList) appList.style.display = '';
  const filterRow = document.getElementById('app-filter-row');
  if (filterRow) filterRow.style.display = '';
  renderAppsList();
}

function selectAppPwManagerNew(el, val) {
  el.parentElement.querySelectorAll('.radio-opt').forEach(l => l.classList.remove('selected'));
  el.classList.add('selected');
  const nameRow = document.getElementById('app-pwmgr-name-row-new');
  if (nameRow) nameRow.style.display = val === 'yes' ? 'block' : 'none';
}

function archiveApp(id) {
  if (!canSeeApps()) return;
  const a = apps.find(x => x.id === id);
  if (!a) return;
  if (!confirm(t('archiveAppConfirm').replace('{name}', a.name))) return;
  a.archived = true;
  logAction('logAppArchived', {raw: a.name});
  renderAppsList();
}

function restoreApp(id) {
  if (!canSeeApps()) return;
  const a = apps.find(x => x.id === id);
  if (!a) return;
  a.archived = false;
  logAction('logAppRestored', {raw: a.name});
  renderAppsList();
}

function deleteApp(id) {
  if (!canSeeApps()) return;
  const a = apps.find(x => x.id === id);
  if (!a) return;
  const hasHistory = a.notes || a.reviewed === 'yes';
  if (hasHistory) {
    if (!confirm(t('deleteAppWarn'))) return;
  } else {
    if (!confirm(t('deleteAppConfirm').replace('{name}', a.name))) return;
  }
  apps = apps.filter(x => x.id !== id);
  logAction('logAppDeleted', {raw: a.name + ' permanently removed'});
  renderAppsList();
}
