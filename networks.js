/* AgriGuardian: network UI and CRUD */
function renderNetworkList() {
  const list = document.getElementById('network-list');
  if (!list) return;
  if (networks.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#888;font-style:italic;padding:8px 0">No network connections added yet.</p>';
    return;
  }
  let filtered = networks;
  if (netFilter === 'active') filtered = networks.filter(n => !n.archived);
  if (netFilter === 'archived') filtered = networks.filter(n => n.archived);
  const riskOrder = {red:0, yellow:1, green:2};
  const netSort = document.getElementById('net-sort-select') ? document.getElementById('net-sort-select').value : 'risk';
  const sorted = [...filtered].sort((a,b) => {
    if (netSort === 'risk') return riskOrder[a.resolved?'green':getNetRisk(a)] - riskOrder[b.resolved?'green':getNetRisk(b)];
    if (netSort === 'type') return (a.type||'').localeCompare(b.type||'');
    if (netSort === 'label') return (a.label||'').localeCompare(b.label||'');
    return 0;
  });
  list.innerHTML = sorted.map(function(n) {
    const risk = getNetRisk(n);
    // Archived networks retain their underlying risk; "Archived" tag conveys lifecycle.
    const displayRisk = (n.resolved && !n.archived) ? 'green' : risk;
    return '<div class="device-card" style="margin-bottom:10px;cursor:pointer" onclick="showNetDetail(' + n.id + ')">' +
      '<div class="risk-dot dot-' + displayRisk + '"></div>' +
      '<div class="device-info">' +
        '<div class="device-name">' + n.label + '</div>' +
        '<div class="device-brand">' + n.type + '</div>' +
      '</div>' +
      '<div class="device-actions" onclick="event.stopPropagation()">' +
        (a11ySettings.colorBlind ? '<span class="risk-badge badge-' + displayRisk + '" style="margin-right:2px">' + ({red:'⛔',yellow:'⚠️',green:'✅'}[displayRisk]||'') + '</span>' : '') +
        (canArchiveDevices()
          ? (n.archived
              ? '<button class="device-action-btn" onclick="unarchiveNetwork(' + n.id + ')">Restore</button>'
              : '<button class="device-action-btn" onclick="archiveNetwork(' + n.id + ')">'+t('archive')+'</button>') +
            '<button class="device-action-btn danger" onclick="deleteNetwork(' + n.id + ')">'+t('delete')+'</button>'
          : '') +
      '</div>' +
    '</div>';
  }).join('');
}


function netTimelineHTML(n) {
  var events = [];
  if (n.addedDate) events.push({ date: n.addedDate, icon: 'ti-plus', color: '#5B8DB8', label: 'Network added' });
  var risk = getNetRisk(n);
  if (!n.resolved && risk !== 'green') {
    events.push({ date: n.flaggedDate || '', icon: 'ti-alert-triangle',
      color: (risk === 'red' ? '#C0392B' : '#C9A400'),
      label: (risk === 'red' ? 'Flagged: high risk' : 'Flagged: needs attention') });
  }
  if (n.resolved) {
    events.push({ date: n.savedDate || '', icon: 'ti-circle-check', color: '#2E7A4E',
      label: 'Resolved' + (n.resolveStatus ? ' — ' + n.resolveStatus : '') });
  }
  if (events.length === 0) return '';
  var rows = events.map(function(e, i) {
    var isLast = (i === events.length - 1);
    return '<div style="display:flex;gap:10px;position:relative">' +
        '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">' +
          '<div style="width:24px;height:24px;border-radius:50%;background:' + e.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ' + e.icon + '" style="color:#fff;font-size:14px"></i></div>' +
          (isLast ? '' : '<div style="width:2px;flex:1;background:#e0e0e0;margin:2px 0"></div>') +
        '</div>' +
        '<div style="padding-bottom:' + (isLast ? '0' : '14px') + ';flex:1;min-width:0">' +
          '<div style="font-size:13px;color:#333">' + e.label + '</div>' +
          (e.date ? '<div style="font-size:11px;color:#999">' + e.date + '</div>' : '') +
        '</div>' +
      '</div>';
  }).join('');
  return '<p class="section-title" style="margin-top:18px">Network history</p>' +
    '<div style="padding:4px 2px">' + rows + '</div>';
}

function getNetRecAction(n) {
  if (n.resolved) return 'No action needed. Continue monitoring this connection.';
  var risk = getNetRisk(n);
  if (risk === 'green') return 'Looking good. Keep the password updated and review encryption settings periodically.';
  if (n.pw === 'no' && n.encrypted === 'no') return 'Change the default router password and enable WPA2 or WPA3 encryption on this network as soon as possible.';
  if (n.pw === 'no') return 'Change the default router password and store the new password in a password manager.';
  if (n.encrypted === 'no') return 'Enable WPA2 or WPA3 encryption on this network so traffic between devices and the router is protected.';
  return 'Review this network connection.';
}

function showNetDetail(id, keepScreen) {
  currentDetailView = { type: 'network', id: id };
  const n = networks.find(x => x.id === id);
  if (!n) return;
  logAction(t('logViewedNetwork').replace('{network}', (n.label || n.type) || 'Network connection'), '');
  const panel = document.getElementById('net-detail-content');
  if (!panel) return;
  panel.setAttribute('data-net-id', id);

  const risk = getNetRisk(n);
  const canSee = canSeeNetworkIssue();
  const canAct = canResolveIssues() && canSee;
  const iconMap = { red:'ti-alert-circle', yellow:'ti-alert-triangle', green:'ti-circle-check' };

  panel.innerHTML =
    '<div class="device-name-large">' + n.label + '</div>' +
    '<div class="device-sub">' + n.type + '</div>' +

    (!canSee && !n.resolved && risk !== 'green' ?
      '<div class="risk-detail" style="background:#F4F6F8;border:1px solid #d9dee3"><div class="risk-detail-title" style="color:#555"><i class="ti ti-lock"></i>Restricted</div><p style="color:#555">Security details for this network connection are only shown to Owners, Managers, and Technicians.</p></div>' :
      n.resolved ?
        '<div class="risk-detail risk-detail-green"><div class="risk-detail-title t-green"><i class="ti ti-circle-check"></i>' + t('lookingGood') + '</div><p>' + (n.savedDate ? 'Marked resolved ' + n.savedDate + '. ' : '') + 'Continue monitoring this connection.</p></div>' :
        '<div class="risk-detail risk-detail-' + risk + '"><div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getNetRiskLabel(risk) + '</div><p>' + getNetRiskWhy(n) + '</p></div>'
    ) +

    (canSee ?
      '<div class="action-box">' +
        '<div class="action-label">' + t('recommendedAction') + '</div>' +
        '<div class="action-text">' + getNetRecAction(n) + '</div>' +
      '</div>' : '') +

    collapsibleSection('netdetails-' + n.id, 'Network details', (
    '<div class="detail-row"><span class="detail-key">Connection type</span><span class="detail-val">' + n.type + '</span></div>' +
    (n.hwBrand ? '<div class="detail-row"><span class="detail-key">' + t('hardwareBrand') + '</span><span class="detail-val">' + n.hwBrand + '</span></div>' : '') +
    (n.hwModel ? '<div class="detail-row"><span class="detail-key">' + t('hardwareModel') + '</span><span class="detail-val">' + n.hwModel + '</span></div>' : '') +
    '<div class="detail-row"><span class="detail-key">Default password changed</span><span class="detail-val">' + (n.pw === 'yes' ? 'Yes' : 'No / not sure') + '</span></div>' +
    '<div class="detail-row"><span class="detail-key">Encrypted</span><span class="detail-val">' + (n.encrypted === 'yes' ? 'Yes' : 'No / not sure') + '</span></div>' +
    ((canAct && (n.hwBrand || n.hwModel)) ? '<div class="detail-row" style="margin-top:4px"><button onclick="checkNetVulnerabilities(' + n.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-weight:500">' + t('hwVulnCheck') + '</button></div>' : '') +
    '<div id="net-vuln-results-' + n.id + '" style="margin-top:8px"></div>'
    ), false) +

    (n.notes ? '<div style="background:#f7f7f5;border-radius:8px;padding:10px 12px;margin:14px 0"><div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + t('notes') + '</div><div style="font-size:13px;color:#333;white-space:pre-line">' + n.notes + '</div></div>' : '') +

    (canSee ? netTimelineHTML(n) : '') +

    (n.resolved ? '<div class="resolved-badge" style="margin-top:14px">✅ Marked resolved: ' + n.resolveStatus + (n.note ? ' — ' + n.note : '') + (n.savedDate ? '<span style="font-weight:400;margin-left:8px;color:#555">(' + n.savedDate + ')</span>' : '') + '</div>' : '') +

    (canAct ?
      '<div class="resolve-box">' +
        '<div class="resolve-title">' + t('whatWasDone') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">' +
        (Array.isArray(t('netActions')) ? t('netActions') : []).map(function(opt) {
          const checked = n.resolveStatus && n.resolveStatus.includes(opt);
          return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 10px;border:1px solid #ddd;border-radius:8px;cursor:pointer;background:' + (checked?'#f0f9f3':'#fff') + '">' +
            '<input type="checkbox" value="' + opt + '" class="net-action" ' + (checked?'checked':'') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
          '</label>';
        }).join('') +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px">' + t('additionalNotes') + ' <span style="color:#aaa;font-weight:400">' + t('optional') + '</span></label>' +
          '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
          '<textarea id="net-note-' + id + '" rows="3" placeholder="' + t('netNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;resize:none;font-family:inherit">' + (n.note || '') + '</textarea>' +
        '</div>' +
        '<button class="resolve-btn" onclick="saveNetwork(' + id + ')" style="background:#1F4D2E;font-size:15px;padding:13px">' + t('saveBtn') + '</button>' +
      '</div>' : '') +

    ((canSee && !canAct && !n.resolved && risk !== 'green') ?
      '<div class="resolve-box" style="background:#F4F6F8;border:1px solid #d9dee3">' +
        '<p style="font-size:13px;color:#555;margin:0">🔒 ' + t('viewOnlyIssueNote') + '</p>' +
      '</div>' : '');

  if (!keepScreen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-net-detail').classList.add('active');
  }
}

function checkNetVulnerabilities(netId) {
  const n = networks.find(x => x.id === netId);
  if (!n) return;
  const resultsEl = document.getElementById('net-vuln-results-' + netId);
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div style="padding:8px;font-size:12px;color:#888;text-align:center">🔍 Checking databases...</div>';
  const brand = (n.hwBrand || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const model = (n.hwModel || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  Promise.all([
    checkCISA(brand, model),
    nvdApiKey ? checkNVD(brand, model) : Promise.resolve(null)
  ]).then(function(results) {
    renderVulnResults(resultsEl, results[0], results[1], { brand: n.hwBrand, model: n.hwModel });
  }).catch(function() {
    resultsEl.innerHTML = '<div style="padding:8px;font-size:12px;color:#A32D2D">Error checking databases. Check your connection and try again.</div>';
  });
}

function archiveNetwork(id) {
  if (!canArchiveDevices()) { alert("You do not have permission to archive networks."); return; }
  const n = networks.find(x => x.id === id);
  if (!n) return;
  if (!confirm('Archive ' + n.label + '? It will be hidden from your active list but its history will be kept. You can restore it later.')) return;
  n.archived = true;
  logAction('Network archived', (n.label || n.type || 'Network'));
  renderNetworkList();
  renderDashList();
}

function unarchiveNetwork(id) {
  if (!canArchiveDevices()) { alert("You do not have permission to restore networks."); return; }
  const n = networks.find(x => x.id === id);
  if (!n) return;
  n.archived = false;
  var wasReplaced = /replaced/i.test(n.archiveReason || '') ||
    (typeof n.resolveStatus === 'string' && /Router replaced|Enrutador reemplazado/i.test(n.resolveStatus));
  n.archiveReason = '';
  if (!n.resolved || wasReplaced) {
    n.resolved = false;
    n.resolveStatus = '';
    n.resolvedDate = '';
    n.verifiedDate = '';
    if (!n.flaggedDate) n.flaggedDate = localTimestamp();
    logAction('Network restored — unresolved', (n.label||n.type) + ' restored from archive; issue reopened');
  } else {
    logAction('Network restored', (n.label||n.type) + ' restored from archive');
  }
  renderNetworkList();
  renderDashList();
}

function deleteNetwork(id) {
  if (!canArchiveDevices()) { alert("You do not have permission to delete networks."); return; }
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const hasHistory = n.resolveStatus || n.note || n.resolved;
  if (hasHistory) {
    if (!confirm('WARNING: This network connection has existing records.\n\nDeleting it will permanently erase all history and notes.\n\nWe strongly recommend Archive instead — it removes the connection from your active list but keeps all records.\n\nTap OK to permanently delete anyway.\nTap Cancel to go back (then use Archive).')) return;
  } else {
    if (!confirm('Permanently delete ' + n.label + '? This cannot be undone.')) return;
  }
  networks = networks.filter(x => x.id !== id);
  logAction('Network deleted', (n.label || n.type || 'Network') + ' permanently removed');
  renderNetworkList();
  renderDashList();
}

function saveNetwork(id) {
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const panel = document.getElementById('net-detail-content');
  const ctx = panel || document;
  const checked = ctx.querySelectorAll('.net-action:checked');
  n.resolveStatus = Array.from(checked).map(c => c.value).join(', ');
  n.resolved = checked.length > 0;
  if (n.resolveStatus.includes('Password changed')) n.pw = 'yes';
  if (n.resolveStatus.includes('Encryption enabled')) n.encrypted = 'yes';
  const noteEl = ctx.querySelector('#net-note-' + id);
  n.note = noteEl ? noteEl.value.trim() : '';
  n.savedDate = localTimestamp();
  if (n.resolved) {
    n.resolvedDate = n.savedDate;
    logAction('Network issue addressed', (n.label || n.type || 'Network') + (n.resolveStatus ? ' — ' + n.resolveStatus : '') + (n.note ? ' (' + n.note + ')' : ''));
  } else {
    logAction('Network updated', (n.label || n.type || 'Network') + (n.note ? ' — ' + n.note : ''));
  }
  renderDashList();
  renderNetworkList();
  showScreen('network', document.querySelectorAll('.nav-btn')[2]);
}

function selectNetPw(el, val) {
  document.querySelectorAll('input[name="net-pw"]').forEach(r => r.closest('label').classList.remove('selected'));
  el.classList.add('selected');
}

function selectNetEnc(el, val) {
  document.querySelectorAll('input[name="net-enc"]').forEach(r => r.closest('label').classList.remove('selected'));
  el.classList.add('selected');
}

function handleNetBrandSelect(sel) {
  document.getElementById('net-brand-custom-row').style.display =
    sel.value === '__other_net_brand__' ? 'block' : 'none';
}

var netFilter = 'active';

function setNetFilter(filter, btn) {
  netFilter = filter;
  document.querySelectorAll('#net-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderNetworkList();
}

function toggleNetAddForm() {
  const form = document.getElementById('net-add-form');
  if (!form) return;
  const isOpen = form.style.display === 'block';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Translate form when opening
    const safeF = (id, val) => { const el = form.querySelector('[id="'+id+'"]'); if(el) el.textContent = val; };
    const safePh = (id, val) => { const el = form.querySelector('[id="'+id+'"]'); if(el) el.placeholder = val; };
    safeF('lbl-add-net-title', t('addANetwork'));
    safeF('lbl-net-conn-type', t('connTypeLabel'));
    safeF('opt-net-select-type', t('selectType'));
    safeF('opt-net-conn-wifi', t('connWifi'));
    safeF('opt-net-conn-eth', t('connEthernet'));
    safeF('opt-net-conn-cell', t('connCellular'));
    safeF('opt-net-conn-sat', t('connSatellite'));
    safeF('opt-net-conn-bt', t('connBluetooth'));
    safeF('opt-net-conn-lora', t('connLoRa'));
    safeF('opt-net-conn-unk', t('connUnknown'));
    safeF('lbl-net-name', t('nameOrLabel'));
    safeF('lbl-router-brand', t('routerBrand') + ' ');
    safeF('lbl-net-model', t('modelNumLabel') + ' ');
    safeF('lbl-vuln-lookups', t('usedForVulnLookups'));
    safeF('lbl-net-pw', t('hasPwChanged'));
    safeF('lbl-net-pw-yes', t('pwYes'));
    safeF('lbl-net-pw-no', t('pwNo'));
    safeF('lbl-net-enc', t('isEncrypted'));
    safeF('lbl-net-enc-yes', t('yesEncrypted'));
    safeF('lbl-net-enc-no', t('pwNo'));
    safeF('lbl-net-notes-label', t('netNotesLabel') + ' ');
    safeF('lbl-net-notes-opt', t('optional'));
    safeF('lbl-add-net-btn', t('addNetworkBtn'));
    safeF('opt-net-select-brand', t('selectBrandNet'));
    safeF('opt-net-other-brand', t('otherNotListed'));
    safePh('net-label', t('netNamePlaceholder'));
    safePh('net-hw-brand', t('enterBrandPlaceholder'));
    safePh('net-hw-model', t('netModelPlaceholder'));
  }
  // Hide/show network list and sort row
  const netList = document.getElementById('network-list');
  const filterRow = document.getElementById('net-filter-row');
  const sortContainer = document.querySelector('#screen-network div[style*="align-items:center"]');
  if (netList) netList.style.display = isOpen ? '' : 'none';
  if (filterRow) filterRow.style.display = isOpen ? '' : 'none';
  if (sortContainer) sortContainer.style.display = isOpen ? '' : 'none';
}

function addNetwork() {
  const type = document.getElementById('net-type').value;
  const label = document.getElementById('net-label').value.trim();
  const pw = document.querySelector('input[name="net-pw"]:checked')?.value;
  const enc = document.querySelector('input[name="net-enc"]:checked')?.value;
  if (!type || !label || !pw || !enc) { alert(t('fillAllFields')); return; }
  let hwBrand = document.getElementById('net-hw-brand').value;
  if (hwBrand === '__other_net_brand__') hwBrand = document.getElementById('net-hw-brand-custom').value.trim();
  const hwModel = document.getElementById('net-hw-model').value.trim();
  const netNotes = document.getElementById('net-notes') ? document.getElementById('net-notes').value.trim() : '';
  networks.push({ id: nextNetId++, type, label, pw, encrypted: enc, hwBrand: hwBrand || '', hwModel: hwModel || '', notes: netNotes });
  logAction('Network added', label + ' (' + type + ')' + (pw === 'no' ? ' — default password flagged' : '') + (enc === 'no' ? ' — encryption off' : ''));
  document.getElementById('net-type').value = '';
  document.getElementById('net-label').value = '';
  document.getElementById('net-hw-brand').value = '';
  if (document.getElementById('net-notes')) document.getElementById('net-notes').value = '';
  document.getElementById('net-hw-model').value = '';
  document.getElementById('net-brand-custom-row').style.display = 'none';
  document.querySelectorAll('input[name="net-pw"], input[name="net-enc"]').forEach(r => { r.checked = false; r.closest('label').classList.remove('selected'); });
  const form = document.getElementById('net-add-form');
  if (form) form.style.display = 'none';
  // Restore list visibility
  const netList = document.getElementById('network-list');
  if (netList) netList.style.display = '';
  renderNetworkList();
}

// ─── Apps inventory: render, filter, add, archive/restore, delete ──────────