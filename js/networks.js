/* AgriGuardian: network UI and CRUD */
function renderNetworkList() {
  const list = document.getElementById('network-list');
  if (!list) return;
  if (networks.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#7A8F80;font-style:italic;padding:8px 0">' + t('noNetworksYet') + '</p>';
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
        (canArchiveDevices() ? (
          (n.archived
            ? '<button class="device-action-btn" onclick="unarchiveNetwork(' + n.id + ')" title="'+t('restore')+'"><i class="ti ti-arrow-back-up" aria-hidden="true"></i><span class="sr-only">'+t('restore')+'</span></button>'
            : '<button class="device-action-btn" onclick="archiveNetwork(' + n.id + ')" title="'+t('archive')+'"><i class="ti ti-archive" aria-hidden="true"></i><span class="sr-only">'+t('archive')+'</span></button>') +
          (canHardDelete() ? '<button class="device-action-btn danger" onclick="deleteNetwork(' + n.id + ')" title="'+t('delete')+'"><i class="ti ti-trash" aria-hidden="true"></i><span class="sr-only">'+t('delete')+'</span></button>' : '')
        ) : '') +
      '</div>' +
    '</div>';
  }).join('');
}


function netTimelineHTML(n) {
  var events = [];
  if (n.addedDate) events.push({ date: n.addedDate, icon: 'ti-plus', color: '#1A5FA8', label: t('netEvtAdded') });
  var risk = getNetRisk(n);
  if (!n.resolved && risk !== 'green') {
    events.push({ date: n.flaggedDate || '', icon: 'ti-alert-triangle',
      color: (risk === 'red' ? '#E24B4A' : '#D4C000'),
      label: (risk === 'red' ? t('netEvtFlaggedHigh') : t('netEvtFlaggedAttention')) });
  }
  if (n.resolved) {
    events.push({ date: n.savedDate || '', icon: 'ti-circle-check', color: '#2E7A4E',
      label: t('netEvtResolved') + (n.resolveStatus ? ' — ' + tResolveStatus(n.resolveStatus, 'net') : '') });
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
          '<div style="font-size:13px;color:#111111">' + e.label + '</div>' +
          (e.date ? '<div style="font-size:11px;color:#7A8F80">' + e.date + '</div>' : '') +
        '</div>' +
      '</div>';
  }).join('');
  return rows;
}

function getNetRecAction(n) {
  if (n.resolved) return t('netRecNone');
  var risk = getNetRisk(n);
  if (risk === 'green') return t('netRecGood');
  if (n.pw === 'no' && n.encrypted === 'no') return t('netRecBoth');
  if (n.pw === 'no') return t('netRecPw');
  if (n.encrypted === 'no') return t('netRecEnc');
  return t('netRecReview');
}

// ─── Animated accordion helper for the network detail screen ───────────────
// Uses a nested wrapper (outer = overflow/max-height/transition only, inner =
// actual padding/border/content) so max-height:0 fully collapses the section
// with no residual padding gap, and measures real scrollHeight at toggle time
// so it works correctly regardless of how long a given network's notes,
// history, etc. actually are (unlike a hardcoded guess).
function netAccSection(key, netId, iconClass, title, previewHTML, bodyHTML, startOpen) {
  var bodyId = 'net-acc-body-' + key + '-' + netId;
  var btnId = 'net-acc-btn-' + key + '-' + netId;
  var chevId = 'net-acc-chev-' + key + '-' + netId;
  return '<div style="border:1px solid #CBD8CB;border-radius:10px;margin-bottom:8px;overflow:hidden">' +
    '<button type="button" id="' + btnId + '" onclick="toggleNetAcc(\'' + key + '\',' + netId + ')" aria-expanded="' + (startOpen?'true':'false') + '" style="width:100%;display:flex;align-items:center;gap:8px;padding:13px 12px;background:' + (startOpen?'#E2EFE8':'#fff') + ';border:none;text-align:left;cursor:pointer;min-height:44px;transition:background-color 0.2s ease;font-family:inherit">' +
      '<i class="ti ' + iconClass + '" style="font-size:16px;color:#1F4D2E;flex-shrink:0"></i>' +
      '<span style="font-size:13px;font-weight:500;color:#111111;flex-shrink:0">' + title + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:#7A8F80;white-space:nowrap;flex-shrink:1;padding-left:6px;overflow:hidden;text-overflow:ellipsis;max-width:150px">' + (previewHTML||'') + '</span>' +
      '<i id="' + chevId + '" class="ti ti-chevron-down" style="font-size:15px;color:#7A8F80;flex-shrink:0;display:inline-block;transform:rotate(' + (startOpen?'180deg':'0deg') + ');transition:transform 0.25s ease"></i>' +
    '</button>' +
    '<div id="' + bodyId + '" data-open="' + (startOpen?'true':'false') + '" style="overflow:hidden;transition:max-height 0.3s ease;max-height:0px">' +
      '<div style="padding:0 14px 12px;border-top:1px solid #E4EEE4">' + bodyHTML + '</div>' +
    '</div>' +
  '</div>';
}
// Called once after showNetDetail() sets innerHTML — measures each section's
// real content height so open-by-default sections render at the right size
// and closed ones start fully collapsed with no residual gap.
function initNetAccordionState(netId) {
  document.querySelectorAll('[id^="net-acc-body-"][id$="-' + netId + '"]').forEach(function(wrap) {
    var isOpen = wrap.getAttribute('data-open') === 'true';
    var inner = wrap.firstElementChild;
    wrap.style.maxHeight = isOpen ? (inner ? inner.scrollHeight : wrap.scrollHeight) + 'px' : '0px';
  });
}
function toggleNetAcc(key, netId) {
  var wrap = document.getElementById('net-acc-body-' + key + '-' + netId);
  var btn = document.getElementById('net-acc-btn-' + key + '-' + netId);
  var chev = document.getElementById('net-acc-chev-' + key + '-' + netId);
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

// Assignment box for network issues — mirrors devices-detail.js's
// assignBoxHTML(), minus the device-only Farm Hand status field (Farm Hand
// has no network access at all, per the existing least-privilege model).
function netAssignBoxHTML(n) {
  const members = assignableMembers();
  if (members.length === 0) {
    return '<p style="font-size:12.5px;color:#777;margin:0">' + t('noAssignableMembers') + '</p>';
  }
  const options = '<option value="">' + t('assignSelectPlaceholder') + '</option>' +
    members.map(function(m) {
      const sel = (n.assignedTo === m.name) ? ' selected' : '';
      const roleTag = m.role ? ' (' + m.role + ')' : '';
      return '<option value="' + m.name.replace(/"/g,'&quot;') + '"' + sel + '>' + m.name + roleTag + '</option>';
    }).join('');
  const primaryLabel = n.assignedTo ? t('reassignBtn') : t('assignBtn');
  const isReassign = !!n.assignedTo;
  return '<p style="font-size:11px;color:#7A8F80;margin:0 0 8px">' + t('assignDesc') + '</p>' +
    '<select id="net-assign-select-' + n.id + '" style="width:100%;font-size:13px;padding:9px 10px;border:1px solid #CBD8CB;border-radius:8px;background:#FFFFFF;font-family:inherit;margin-bottom:8px">' + options + '</select>' +
    '<label style="font-size:11px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('assignNoteLabel') + ' <span style="color:#A32D2D">*' + t('required') + '</span></label>' +
    '<textarea id="net-assign-note-' + n.id + '" rows="2" placeholder="' + t('assignNotePlaceholder') + '" style="width:100%;font-size:12.5px;padding:8px 10px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:8px"></textarea>' +
    '<div style="display:flex;gap:8px">' +
      '<button onclick="assignNetIssue(' + n.id + ')" style="flex:1;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:9px;font-size:12.5px;font-weight:500">' + primaryLabel + '</button>' +
      (isReassign ? '<button onclick="unassignNetIssue(' + n.id + ')" style="flex:0 0 auto;background:#FFFFFF;color:#A32D2D;border:1px solid #E0B4B4;border-radius:8px;padding:9px 14px;font-size:12.5px;font-weight:500">' + t('unassignBtn') + '</button>' : '') +
    '</div>';
}

function showNetDetail(id, keepScreen) {
  currentDetailView = { type: 'network', id: id };
  const n = networks.find(x => x.id === id);
  if (!n) return;
  logAction({key: 'logViewedNetwork', params: {network: (n.label || n.type) || t('networksLabel')}});
  const panel = document.getElementById('net-detail-content');
  if (!panel) return;
  panel.setAttribute('data-net-id', id);

  const risk = getNetRisk(n);
  const canSee = canSeeNetworkIssue();
  const canAct = canResolveIssues(n) && canSee;
  const canAssign = canAssignIssues() && canSee;
  const isAssignee = !!(n.assignedTo && currentUser.name && n.assignedTo === currentUser.name);
  const canReturn = canReturnNetIssue(n);
  const canActOnReturn = canActOnReturnedNet(n);
  const iconMap = { red:'ti-alert-circle', yellow:'ti-alert-triangle', green:'ti-circle-check' };

  panel.innerHTML =
    '<div class="device-name-large">' + n.label + '</div>' +
    '<div class="device-sub">' + n.type + '</div>' +

    (!canSee && !n.resolved && risk !== 'green' ?
      '<div class="risk-detail" style="background:#FFFFFF;border:1px solid #d9dee3"><div class="risk-detail-title" style="color:#111111"><i class="ti ti-lock"></i>' + t('restrictedLabel') + '</div><p style="color:#111111">' + t('notAssignedNetBody') + '</p></div>' :
      n.resolved ?
        '<div class="risk-detail risk-detail-green"><div class="risk-detail-title t-green"><i class="ti ti-circle-check"></i>' + t('lookingGood') + '</div><p>' + (n.savedDate ? t('resolvedBadge') + ' ' + n.savedDate + '. ' : '') + t('netRecNone') + '</p></div>' :
        '<div class="risk-detail risk-detail-' + risk + '"><div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getNetRiskLabel(risk) + '</div><p>' + getNetRiskWhy(n) + '</p></div>'
    ) +

    // Purple "returned to you" banner — parallel to the device escalation
    // banner, but targeted at the specific person who made the assignment
    // rather than a farm-wide Manager/Owner tier.
    ((n.needsOwnerAction && canActOnReturn) ?
      '<div style="background:#EFEAF7;border:1px solid #C4B5FD;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
        '<div style="font-weight:700;color:#5B21B6;font-size:13px;margin-bottom:6px"><i class="ti ti-corner-up-left"></i> ' + t('netReturnedTitle') + '</div>' +
        '<div style="font-size:13px;color:#3B0764;line-height:1.5">' +
          '<div><strong>' + (n.assignedTo || t('teamMemberFallback')) + '</strong> ' + t('netReturnSentNote') + '</div>' +
          '<div style="margin-top:4px;padding:8px 10px;background:#FFFFFF;border-radius:6px;border:1px solid #C4B5FD;font-style:italic">' + (n.returnNote || '') + '</div>' +
        '</div>' +
      '</div>' : '') +

    (canSee ? (

      netAccSection('fix', n.id, 'ti-bulb', t('howToFixTitle'), '', '<p style="font-size:12.5px;color:#111111;line-height:1.6;margin:10px 0 0">' + getNetRecAction(n) + '</p>', false) +

      // Assignment section — visible to whoever can assign (Manager/Owner) or
      // to the current assignee viewing their own assignment.
      ((canAssign || isAssignee) ?
        netAccSection('assign', n.id, 'ti-user-question', t('assignmentTitle'),
          n.assignedTo ? n.assignedTo : t('unassignedLabel'),
          (canAssign ? netAssignBoxHTML(n) :
            '<div style="font-size:12.5px;color:#111111;line-height:1.6;margin-top:10px">' +
              '<div style="margin-bottom:6px"><strong>' + t('assignedToLabel') + ':</strong> ' + (n.assignedTo || '—') + '</div>' +
            '</div>'
          ), false) : '') +

      netAccSection('details', n.id, 'ti-list-details', t('networkDetailsTitle'),
        (n.pw === 'yes' ? '' : t('noPwShort')) + (n.pw !== 'yes' && n.encrypted !== 'yes' ? ' · ' : '') + (n.encrypted === 'yes' ? '' : t('notEncryptedShort')),
        '<div class="detail-row" style="border-bottom:1px solid #E4EEE4;padding:8px 0"><span class="detail-key">' + t('connTypeLabel') + '</span><span class="detail-val">' + n.type + '</span></div>' +
        (n.hwBrand ? '<div class="detail-row" style="border-bottom:1px solid #E4EEE4;padding:8px 0"><span class="detail-key">' + t('hardwareBrand') + '</span><span class="detail-val">' + n.hwBrand + '</span></div>' : '') +
        (n.hwModel ? '<div class="detail-row" style="border-bottom:1px solid #E4EEE4;padding:8px 0"><span class="detail-key">' + t('hardwareModel') + '</span><span class="detail-val">' + n.hwModel + '</span></div>' : '') +
        '<div class="detail-row" style="border-bottom:1px solid #E4EEE4;padding:8px 0"><span class="detail-key">' + t('detailPw') + '</span><span class="detail-val">' + (n.pw === 'yes' ? t('pwYesVal') : t('pwNoVal')) + '</span></div>' +
        '<div class="detail-row" style="padding:8px 0"><span class="detail-key">' + t('encryptedLabel') + '</span><span class="detail-val">' + (n.encrypted === 'yes' ? t('pwYesVal') : t('pwNoVal')) + '</span></div>' +
        ((canAct && (n.hwBrand || n.hwModel)) ? '<div style="margin-top:10px"><button onclick="checkNetVulnerabilities(' + n.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px;font-size:12.5px;cursor:pointer;font-weight:500">' + t('hwVulnCheck') + '</button></div>' : '') +
        '<div id="net-vuln-results-' + n.id + '" style="margin-top:8px"></div>',
        false) +

      (n.notes ? netAccSection('notes', n.id, 'ti-note', t('notes'), n.notes.split('\n')[0], '<div style="font-size:12.5px;color:#111111;line-height:1.5;white-space:pre-line;margin-top:10px">' + n.notes + '</div>', false) : '') +

      (function(){
        var hist = netTimelineHTML(n);
        return hist ? netAccSection('history', n.id, 'ti-history', t('networkHistoryTitle'), '', hist, false) : '';
      })()

    ) : '') +

    (n.resolved ? '<div class="resolved-badge" style="margin-top:14px">✅ ' + t('resolvedBadge') + ' ' + tResolveStatus(n.resolveStatus, 'net') + (n.note ? ' — ' + n.note : '') + (n.savedDate ? '<span style="font-weight:400;margin-left:8px;color:#5F7266">(' + n.savedDate + ')</span>' : '') + '</div>' : '') +

    (canAct ?
      netAccSection('resolve', n.id, 'ti-checklist', t('netRemediationChecklist'), '',
        '<div style="display:flex;flex-direction:column;gap:6px;margin:10px 0 12px">' +
        (Array.isArray(t('netActions')) ? t('netActions') : []).map(function(opt, i) {
          const code = NET_ACTION_CODES[i];
          const checked = actionCodes(n.resolveStatus, 'net').includes(code);
          return '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:6px 10px;border:1px solid #CBD8CB;border-radius:8px;cursor:pointer;background:' + (checked?'#E2EFE8':'#fff') + '">' +
            '<input type="checkbox" value="' + code + '" class="net-action" ' + (checked?'checked':'') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
          '</label>';
        }).join('') +
        '</div>' +
        '<div style="margin-bottom:12px">' +
          '<label style="font-size:11px;font-weight:600;color:#5F7266;display:block;margin-bottom:6px">' + t('additionalNotes') + ' <span style="color:#aaa;font-weight:400">' + t('optional') + '</span></label>' +
          '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
          '<textarea id="net-note-' + id + '" rows="3" placeholder="' + t('netNotePlaceholder') + '" style="width:100%;font-size:12.5px;padding:8px 10px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit">' + (n.note || '') + '</textarea>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button onclick="saveNetwork(' + id + ')" style="flex:1;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:500">' + t('saveBtn') + '</button>' +
          (canReturn ? '<button onclick="returnNetIssue(' + id + ')" style="flex:0 0 auto;background:#FFFFFF;color:#5B21B6;border:1px solid #C4B5FD;border-radius:8px;padding:11px 14px;font-size:13px;font-weight:500">' + t('netReturnBtn') + ' ' + (n.assignedBy || t('unassignedLabel')) + '</button>' : '') +
        '</div>',
        false) : '') +

    ((canSee && !canAct && !n.resolved && risk !== 'green') ?
      '<div class="resolve-box" style="background:#FFFFFF;border:1px solid #d9dee3">' +
        '<p style="font-size:13px;color:#111111;margin:0">🔒 ' + t('viewOnlyIssueNote') + '</p>' +
      '</div>' : '');

  if (!keepScreen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-net-detail').classList.add('active');
  }
  initNetAccordionState(id);
}

// Assign / reassign a network issue to a team member. Mirrors devices-detail.js's
// assignIssue(), minus the device-only Farm Hand status field. Reassigning
// (or assigning fresh) clears any pending return-to-assigner state, since a
// new assignment supersedes it.
function assignNetIssue(id) {
  if (!canAssignIssues()) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const sel = document.getElementById('net-assign-select-' + id);
  const noteEl = document.getElementById('net-assign-note-' + id);
  if (!sel) return;
  const name = sel.value;
  const noteVal = noteEl ? noteEl.value.trim() : '';
  if (!name) { alert(t('assignSelectPlaceholder')); return; }
  if (!noteVal) { alert(t('handoffNoteRequired')); return; }
  const prev = n.assignedTo;
  n.assignedTo = name;
  n.assignedBy = currentUser.name || currentUser.role;
  n.needsOwnerAction = false;
  n.returnedToAssigner = false;
  n.returnNote = '';
  if (!Array.isArray(n.handoffLog)) n.handoffLog = [];
  n.handoffLog.push({ type: prev ? 'reassign' : 'assign', from: currentUser.name || currentUser.role, to: name, note: noteVal, date: localTimestamp() });
  logAction(prev ? 'logReassignedNetworkIssue' : 'logAssignedNetworkIssue', {raw: (n.label || n.type) + ' → ' + name + (prev ? ' (was ' + prev + ')' : '') + ' | ' + noteVal});
  renderDashList();
  renderNetworkList();
  showNetDetail(id);
}

function unassignNetIssue(id) {
  if (!canAssignIssues()) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const prev = n.assignedTo;
  n.assignedTo = '';
  n.assignedBy = '';
  n.needsOwnerAction = false;
  n.returnedToAssigner = false;
  n.returnNote = '';
  logAction('logClearedNetworkAssignment', {raw: (n.label || n.type) + (prev ? ' (was ' + prev + ')' : '')});
  renderDashList();
  renderNetworkList();
  showNetDetail(id);
}

// Assignee hands the issue back to whoever assigned it, carrying forward
// whatever remediation-checklist progress they've made (n.resolveStatus is
// saved exactly like a normal saveNetwork() call would) plus a required note
// explaining what's blocking the rest. This does NOT mark the issue resolved.
function returnNetIssue(id) {
  if (!canReturnNetIssue(networks.find(x => x.id === id))) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const panel = document.getElementById('net-detail-content');
  const ctx = panel || document;
  const checked = ctx.querySelectorAll('.net-action:checked');
  n.resolveStatus = Array.from(checked).map(c => c.value).join(', ');
  if (actionCodes(n.resolveStatus, 'net').includes('pwChanged')) n.pw = 'yes';
  if (actionCodes(n.resolveStatus, 'net').includes('encryption')) n.encrypted = 'yes';
  const noteEl = ctx.querySelector('#net-note-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  if (!note) { alert(t('handoffNoteRequired')); return; }
  n.returnNote = note;
  n.returnedToAssigner = true;
  n.needsOwnerAction = true;
  if (!Array.isArray(n.handoffLog)) n.handoffLog = [];
  n.handoffLog.push({ type: 'return', from: currentUser.name || currentUser.role, to: n.assignedBy, note: note, date: localTimestamp() });
  logAction('logReturnedNetworkIssue', {raw: (n.label || n.type) + ' → ' + (n.assignedBy || '') + (n.resolveStatus ? ' | progress: ' + tResolveStatus(n.resolveStatus, 'net') : '') + ' | ' + note});
  renderDashList();
  renderNetworkList();
  showScreen('network', document.querySelectorAll('.nav-btn')[2]);
}

function checkNetVulnerabilities(netId) {
  const n = networks.find(x => x.id === netId);
  if (!n) return;
  const resultsEl = document.getElementById('net-vuln-results-' + netId);
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div style="padding:8px;font-size:12px;color:#7A8F80;text-align:center">' + t('checkingDatabases') + '</div>';
  const brand = (n.hwBrand || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const model = (n.hwModel || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  Promise.all([
    checkCISA(brand, model),
    nvdApiKey ? checkNVD(brand, model) : Promise.resolve(null)
  ]).then(function(results) {
    renderVulnResults(resultsEl, results[0], results[1], { brand: n.hwBrand, model: n.hwModel });
  }).catch(function() {
    resultsEl.innerHTML = '<div style="padding:8px;font-size:12px;color:#A32D2D">' + t('errorCheckingDb') + '</div>';
  });
}

function archiveNetwork(id) {
  if (!canArchiveDevices()) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  if (!confirm(t('confirmArchiveNet', {label: n.label}))) return;
  n.archived = true;
  logAction('logNetworkArchived', {raw: (n.label || n.type || 'Network')});
  renderNetworkList();
  renderDashList();
}

function unarchiveNetwork(id) {
  if (!canArchiveDevices()) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  n.archived = false;
  var wasReplaced = /replaced/i.test(n.archiveReason || '') ||
    actionCodes(n.resolveStatus, 'net').includes('routerReplaced');
  n.archiveReason = '';
  if (!n.resolved || wasReplaced) {
    n.resolved = false;
    n.resolveStatus = '';
    n.resolvedDate = '';
    n.verifiedDate = '';
    if (!n.flaggedDate) n.flaggedDate = localTimestamp();
    logAction('logNetworkRestoredUnresolved', {raw: (n.label||n.type) + ' restored from archive; issue reopened'});
  } else {
    logAction('logNetworkRestored', {raw: (n.label||n.type) + ' restored from archive'});
  }
  renderNetworkList();
  renderDashList();
}

function deleteNetwork(id) {
  if (!canHardDelete()) return;
  const n = networks.find(x => x.id === id);
  if (!n) return;
  const hasHistory = n.resolveStatus || n.note || n.resolved;
  if (hasHistory) {
    if (!confirm(t('confirmDeleteNetWarn'))) return;
  } else {
    if (!confirm(t('confirmDeleteNetPermanent', {label: n.label}))) return;
  }
  networks = networks.filter(x => x.id !== id);
  logAction('logNetworkDeleted', {raw: (n.label || n.type || 'Network') + ' permanently removed'});
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
  if (actionCodes(n.resolveStatus, 'net').includes('pwChanged')) n.pw = 'yes';
  if (actionCodes(n.resolveStatus, 'net').includes('encryption')) n.encrypted = 'yes';
  const noteEl = ctx.querySelector('#net-note-' + id);
  n.note = noteEl ? noteEl.value.trim() : '';
  n.savedDate = localTimestamp();
  if (n.resolved) {
    n.resolvedDate = n.savedDate;
    logAction('logNetworkIssueAddressed', {raw: (n.label || n.type || 'Network') + (n.resolveStatus ? ' — ' + tResolveStatus(n.resolveStatus, 'net') : '') + (n.note ? ' (' + n.note + ')' : '')});
  } else {
    logAction('logNetworkUpdated', {raw: (n.label || n.type || 'Network') + (n.note ? ' — ' + n.note : '')});
  }
  renderDashList();
  renderNetworkList();
  showScreen('network', document.querySelectorAll('.nav-btn')[2]);
}

function selectNetPw(el) { // CL4: unused 2nd arg dropped
  document.querySelectorAll('input[name="net-pw"]').forEach(r => r.closest('label').classList.remove('selected'));
  el.classList.add('selected');
}

function selectNetEnc(el) { // CL4: unused 2nd arg dropped
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
    // Translate the whole form declaratively (covers the wrapped label+hint
    // spans and every option via their data-i18n attributes).
    applyI18n(form);
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
    // lbl-router-brand is a wrapped label+hint span handled by applyI18n(form)
    // above — overwriting its textContent here would strip the hint span.
    safeF('lbl-net-model', t('modelNumLabel') + ' ');
    safeF('lbl-vuln-lookups', t('usedForVulnLookups'));
    safeF('lbl-net-pw', t('hasPwChanged'));
    safeF('lbl-net-pw-yes', t('pwYes'));
    safeF('lbl-net-pw-no', t('pwNo'));
    safeF('lbl-net-enc', t('isEncrypted'));
    safeF('lbl-net-enc-yes', t('yesEncrypted'));
    safeF('lbl-net-enc-no', t('pwNo'));
    // lbl-net-notes-label is a wrapped label+hint span handled by applyI18n(form).
    safeF('lbl-net-notes-opt', t('optional'));
    safeF('lbl-add-net-btn', t('addNetworkBtn'));
    safeF('opt-net-select-brand', t('selectBrandNet'));
    safeF('opt-net-other-brand', t('otherNotListed'));
    safePh('net-label', t('netNamePlaceholder'));
    safePh('net-hw-brand', t('enterBrandPlaceholder'));
    safePh('net-hw-model', t('netModelPlaceholder'));
  }
  // Hide/show network list and sort row.
  // BUG FIX (2026-07-07): this used to select the sort row via
  // `document.querySelector('#screen-network div[style*="align-items:center"]')`
  // — a fragile match-by-inline-style selector. The title/button row directly
  // above (holding "+ Add network" itself) also contains "align-items:center"
  // in its style, and comes first in the DOM, so querySelector grabbed THAT
  // instead of the intended sort row. Once the form was opened once, the
  // title/button row got hidden and stayed hidden (its style.display isn't
  // reset by screen navigation — the static markup persists across tab
  // switches), making "+ Add network" appear to vanish permanently after the
  // first visit. Fixed by giving the sort row a real id and targeting that.
  const netList = document.getElementById('network-list');
  const filterRow = document.getElementById('net-filter-row');
  const sortContainer = document.getElementById('net-sort-row');
  if (netList) netList.style.display = isOpen ? '' : 'none';
  if (filterRow) filterRow.style.display = isOpen ? '' : 'none';
  if (sortContainer) sortContainer.style.display = isOpen ? '' : 'none';
}

function addNetwork() {
  // RBAC (C2): parity with addDevice() — needs the addDevices permission.
  if (!currentPerms().addDevices) return;
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
  logAction('logNetworkAdded', {raw: label + ' (' + type + ')' + (pw === 'no' ? ' — default password flagged' : '') + (enc === 'no' ? ' — encryption off' : '')});
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
