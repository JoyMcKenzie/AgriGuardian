/* AgriGuardian: verify, resolve, replacement */

// Returns true when a device's last verification is older than ~6 months (or never verified).
function verifyIsStale(d) {
  if (!d.verifiedDate) return true;
  var parsed = new Date(d.verifiedDate);
  if (isNaN(parsed.getTime())) return false; // unparseable → treat as recent, don't nag
  var sixMonthsMs = 1000 * 60 * 60 * 24 * 182;
  return (Date.now() - parsed.getTime()) > sixMonthsMs;
}

// Verify box: quiet "verified" line when recent, prominent button when never verified or stale.
function verifyBoxHTML(d) {
  var stale = verifyIsStale(d);
  if (d.verifiedDate && !stale) {
    return '<div class="resolve-box" style="background:#F3F8F2;border:1px solid #E2EFE8;display:flex;align-items:center;justify-content:space-between;gap:10px">' +
      '<span style="font-size:13px;color:#1F4D2E;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-circle-check" style="font-size:16px"></i>' + t('verifiedOn') + ' ' + d.verifiedDate + '</span>' +
      '<a href="#" onclick="markVerified(' + d.id + ');return false;" style="font-size:12px;color:#1F4D2E;text-decoration:underline;white-space:nowrap">' + t('verifyAgain') + '</a>' +
    '</div>';
  }
  return '<div class="resolve-box">' +
    '<div class="resolve-title">' + t('verifyDeviceSecure') + '</div>' +
    (stale && d.verifiedDate ? '<p style="font-size:12px;color:#7A6514;background:#FBF6E9;border:1px solid #E6D8AE;border-radius:6px;padding:6px 10px;margin-bottom:8px">' + t('verifyStaleNote') + ' ' + d.verifiedDate + '</p>' : '') +
    '<button class="resolve-btn" onclick="markVerified(' + d.id + ')" style="background:#2E7A4E;">' + t('verifyTodayBtn') + '</button>' +
  '</div>';
}

function markVerified(id, silent) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  d.verifiedDate = localTimestamp();
  if (!silent) {
    logAction('Device verified', (d.label||d.type) + ' (' + d.brand + ')');
    renderDashList(); renderDeviceList(); showDetail(id);
  }
}

function saveAll(id) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  // Gate: only allowed if user can resolve this specific device
  if (!canResolveIssues(d) || !canSeeIssue(d)) return;
  // Gate: if the device is in an active escalation (waiting on Manager/Owner),
  // the resolve form shouldn't be accessible — the partial-resolve path handles this.
  if (d.needsOwnerAction && !canClearEscalation()) return;

  const panel = document.getElementById('detail-content');
  const ctx = panel || document;

  // Health status required
  const sel = ctx.querySelector('input[name="health-' + id + '"]:checked');
  const warningEl = document.getElementById('health-warning-' + id);
  if (!sel) {
    if (warningEl) { warningEl.textContent = '⚠️ Please select a device software update status before saving.'; warningEl.style.display = 'flex'; warningEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return;
  }
  if (warningEl) warningEl.style.display = 'none';

  // Save health status
  d.healthStatus = sel.value;
  d.healthDate = localTimestamp();

  // Save resolution — scope to detail panel
  const checked = ctx.querySelectorAll('.resolve-action:checked');
  let statusParts = Array.from(checked).map(c => c.value);
  const otherChk = ctx.querySelector('#resolve-other-check-' + id);
  const otherTxt = ctx.querySelector('#resolve-other-text-' + id);
  if (otherChk && otherChk.checked && otherTxt && otherTxt.value.trim()) {
    statusParts.push('Other: ' + otherTxt.value.trim());
  }
  // Real bug found via user report: with no requirement here, clicking "Mark
  // as resolved" with zero boxes checked used to silently set d.resolved =
  // false and reset the form anyway — looking like success while doing
  // nothing. At least one action is now required, same as health-status.
  if (statusParts.length === 0) {
    if (warningEl) {
      warningEl.textContent = '⚠️ Select at least one action that addresses this issue before marking it resolved.';
      warningEl.style.display = 'flex';
      warningEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('Select at least one action that addresses this issue before marking it resolved.');
    }
    return;
  }
  d.resolved = true;
  d.resolveStatus = statusParts.join(', ');
  if (d.resolved && !d.resolvedDate) d.resolvedDate = localTimestamp();
  if (!d.resolved) d.resolvedDate = '';
  // Once fully resolved, clear all workflow state
  if (d.resolved) {
    if (d.assignedTo) d.assignedTo = '';
    if (d.partiallyResolved) {
      d.partiallyResolved = false;
      d.partialResolveNote = '';
      d.partialResolveBy = '';
      d.partialResolveDate = '';
    }
    if (d.returnedToTech) { d.returnedToTech = false; d.returnNote = ''; d.returnedBy = ''; d.returnedDate = ''; }
    if (d.needsOwnerAction) clearEscalation(d, 'Fully resolved by ' + (currentUser.name || currentUser.role));
    // Append full resolution to handoff log
    if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
    const noteEl2 = ctx.querySelector('#resolve-note');
    d.handoffLog.push({
      type: 'resolved',
      from: currentUser.name || currentUser.role,
      to: '',
      note: (noteEl2 ? noteEl2.value.trim() : '') || statusParts.join(', '),
      date: localTimestamp()
    });
  }

  // Save note
  const noteEl = ctx.querySelector('#resolve-note');
  if (noteEl) { d.resolveNote = noteEl.value.trim(); d.healthNote = d.resolveNote; }

  // ── Audit log — captures the full picture BEFORE clearing ──
  // Records: what was recommended, what was done, when flagged, when addressed.
  var risk = getRisk(d.brand, d.pw, d.healthStatus);
  var actionWas = getRiskAction(risk, d.pw, d.brand);
  var auditDetail = (d.label || d.type) + ' (' + d.brand + ')';
  if (d.flaggedDate) auditDetail += ' | Flagged: ' + d.flaggedDate;
  auditDetail += ' | Addressed: ' + localTimestamp();
  auditDetail += ' | Recommended action was: ' + actionWas;
  if (d.resolveStatus) auditDetail += ' | Actions taken: ' + d.resolveStatus;
  if (d.resolveNote) auditDetail += ' | Note: ' + d.resolveNote;
  if (d.healthStatus) auditDetail += ' | Update status: ' + d.healthStatus;
  logAction(d.resolved ? 'Issue addressed' : 'Device updated', auditDetail);

  // ── Device replaced → archive the old device & prompt for replacement ──
  // Lifecycle hygiene: a decommissioned device shouldn't keep counting toward
  // the hygiene score. Archive (not delete) preserves history & audit trail.
  var wasReplaced = statusParts.some(function(s){ return s === 'Device replaced' || s === 'Dispositivo reemplazado'; });
  var replacedSnapshot = wasReplaced ? { id: d.id, label: d.label || d.type, type: d.type, location: d.location, brand: d.brand } : null;
  if (wasReplaced) {
    d.archived = true;
    d.archiveReason = 'Replaced with new device';
    logAction('Device replaced — archived', (d.label||d.type) + ' (' + d.brand + ') archived; awaiting replacement entry');
  }

  // Reset form fields to blank — ready for next use.
  ctx.querySelectorAll('.resolve-action').forEach(function(cb) { cb.checked = false; });
  const otherChkReset = ctx.querySelector('#resolve-other-check-' + id);
  const otherTxtReset = ctx.querySelector('#resolve-other-text-' + id);
  if (otherChkReset) otherChkReset.checked = false;
  if (otherTxtReset) { otherTxtReset.value = ''; otherTxtReset.style.display = 'none'; }
  if (noteEl) noteEl.value = '';
  // Clear health radio so it prompts fresh (Fix 1)
  const healthSelReset = ctx.querySelector('input[name="health-' + id + '"]:checked');
  if (healthSelReset) healthSelReset.checked = false;

  renderDashList();
  renderDeviceList();
  if (replacedSnapshot) {
    promptReplacementDevice(replacedSnapshot);
  } else if (d.resolved) {
    // Resolution complete — return to the Devices tab (parity with network fix).
    showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
  } else {
    showDetail(id);
  }
}

// Open Add Device form pre-filled as a replacement for an archived device.
// Demo-only: the link between old and new device lives in audit + contactNotes.
function promptReplacementDevice(oldDev) {
  var msg = 'The old device "' + oldDev.label + '" has been archived.\n\nAdd the replacement device now?';
  var addNow = window.confirm(msg);
  if (!addNow) {
    showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
    return;
  }
  showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
  setTimeout(function() {
    showAddForm();
    setTimeout(function() {
      var inline = document.getElementById('add-device-inline');
      if (!inline) return;
      if (!inline.querySelector('.replacement-banner')) {
        var banner = document.createElement('div');
        banner.className = 'replacement-banner';
        banner.style.cssText = 'background:#E6F0FA;border:1px solid #92B4E3;color:#1A5FA8;border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:13px;font-weight:600;';
        banner.textContent = 'Replacement for: ' + oldDev.label + ' (archived)';
        inline.insertBefore(banner, inline.firstChild);
      }
      var notes = inline.querySelector('#device-contact-notes');
      if (notes && !notes.value) {
        notes.value = 'Replaces: ' + oldDev.label + ' (' + oldDev.brand + ')';
      }
      var locSel = inline.querySelector('#location-select');
      if (locSel && oldDev.location) {
        for (var i = 0; i < locSel.options.length; i++) {
          if (locSel.options[i].value === oldDev.location || locSel.options[i].text === oldDev.location) {
            locSel.selectedIndex = i;
            break;
          }
        }
      }
    }, 60);
  }, 80);
}


