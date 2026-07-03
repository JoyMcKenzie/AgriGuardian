/* AgriGuardian: roles, permissions, escalation */
function canManage() {
  // Managers have nearly all of the Owner's abilities, except they cannot
  // permanently delete the farm or remove the Owner. Use this for shared
  // admin gates (audit log, invites, timezone, team edits, archive).
  return currentUser.role === 'Owner' || currentUser.role === 'Manager';
}

function currentPerms() {
  // Principle of Least Privilege: Owner is the only role with blanket
  // operational rights. Every other role — including Manager — operates from
  // an explicit, narrower permission set. Managers get admin oversight
  // (audit log, invites, timezone, team edits via canManage()), but their
  // device-level rights stay capped: no archive/delete of devices, no hard
  // delete of users or the farm.
  if (currentUser.role === 'Owner') {
    return { addDevices: true, archiveDelete: true, resolveIssues: true, assignIssues: true, exportReports: true, viewOnly: false };
  }
  if (currentUser.role === 'Manager') {
    // Look up the stored Manager entry so the perms shown in Settings match
    // the perms actually enforced. Fall back to a least-privilege default
    // (everything except destructive archive/delete) if not on the team list.
    const meMgr = teamMembers.find(m =>
      (currentUser.phone && m.phone === currentUser.phone) ||
      (currentUser.name && m.name === currentUser.name)
    );
    if (meMgr && meMgr.perms) return meMgr.perms;
    return { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: true, exportReports: true, viewOnly: false };
  }
  const me = teamMembers.find(m =>
    (currentUser.phone && m.phone === currentUser.phone) ||
    (currentUser.name && m.name === currentUser.name)
  );
  if (me && me.perms) return me.perms;
  // Unknown / not on the team: safest default is view-only.
  return { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true };
}

// Hard delete (vs. archive) stays Owner-only. Managers can archive but never
// permanently remove a member, device, or the farm itself.
function canHardDelete() { return currentUser.role === 'Owner'; }

// Only the Owner can edit or archive another Manager — Managers cannot act on
// peers of equal rank. This blocks lateral privilege moves (e.g. one Manager
// archiving another to take over) without needing a full RBAC matrix.
function canActOnMember(m) {
  if (!m) return false;
  if (!canManage()) return false;
  if (m.role === 'Owner') return false; // Owner record is untouchable from team UI
  if (m.role === 'Manager' && currentUser.role !== 'Owner') return false;
  return true;
}

function canResolveIssues(d) {
  const p = currentPerms();
  if (p.viewOnly || !p.resolveIssues) return false;
  if (!d) return true; // backwards-compat: no device context = perm check only
  // If assigned, only the assigned person + Manager + Owner can resolve.
  if (d.assignedTo) {
    const r = currentUser.role;
    if (r === 'Owner' || r === 'Manager') return true;
    return !!(currentUser.name && d.assignedTo === currentUser.name);
  }
  // Unassigned: anyone with resolveIssues perm can act.
  return true;
}
function canAssignIssues() { const p = currentPerms(); return !p.viewOnly && !!p.assignIssues; }
function canExportReports() { const p = currentPerms(); return !p.viewOnly && !!p.exportReports; }

// Returns true when a device has a structural problem that goes beyond what a
// Technician can fix — limited/EOL manufacturer support, known CVEs, or the
// device's health status marks it as needing replacement. These situations
// require an Owner/Manager decision (replace, retire, accept risk) not just a
// password change or software update.
function hasStructuralIssue(d) {
  if (!d) return false;
  const info = getRiskData()[d.brand] || getRiskData()['Other'];
  if (info.support === 'Limited') return true;
  if (info.cve >= 3) return true; // meaningful CVE exposure, not just 1-2 minor
  const h = d.healthStatus || '';
  if (h.includes('No updates available') || h.includes('Sin actualizaciones')) return true;
  return false;
}

// Should the Technician see the combined partial-resolve+escalate box instead
// of the regular resolve form? True when:
//  - They are the assigned person (not Manager/Owner)
//  - The device has a structural issue that needs escalation
//  - The device is not already escalated (already dealt with)
//  - The device is not yet partially resolved (already done)
function shouldShowPartialResolveBox(d) {
  if (!d || d.resolved || d.archived) return false;
  if (d.needsOwnerAction) return false; // already escalated
  if (d.partiallyResolved) return false; // already done partial fix
  const r = currentUser.role;
  if (r === 'Owner' || r === 'Manager') return false; // they use the full form
  if (!d.assignedTo || d.assignedTo !== currentUser.name) return false;
  return hasStructuralIssue(d);
}

// Principle of Least Privilege: security issues are strictly need-to-know.
// PoLP done right: people need enough visibility to do their job.
//  - Owner / Manager / Technician: see every device's real risk so they can
//    triage, manage, and fix. (Manager still can't hard-delete; Technician
//    still can't manage people. Those gates live elsewhere.)
//  - Farm Hand: sees that devices exist so they can operate, but not the
//    detailed risk grade — they only get a "check & report irregularities"
//    cue. Detailed status is for the people who can act on it.
//  - Viewer: assignment-based, like before.
function canSeeIssue(d) {
  if (!d) return false;
  const r = currentUser.role;
  if (r === 'Owner' || r === 'Manager' || r === 'Technician') return true;
  if (r === 'Farm Hand') return true;
  return !!(d.assignedTo && currentUser.name && d.assignedTo === currentUser.name);
}
// Whether to expose the precise red/yellow/green grade and resolution tools.
// Farm Hands and Viewers see a coarse "check for irregularities" cue instead.
function canSeeDetailedRisk() {
  const r = currentUser.role;
  return r === 'Owner' || r === 'Manager' || r === 'Technician';
}
// Network risk: same operational roles as device risk.
function canSeeNetworkIssue() {
  const r = currentUser.role;
  return r === 'Owner' || r === 'Manager' || r === 'Technician';
}

// The farm hygiene score is an aggregate oversight metric. It is reserved
// for Owner, Manager, and Technician roles. Farm Hand and Viewer accounts
// do not see the farm-wide score.
function canSeeHygieneScore() {
  return ['Owner', 'Manager', 'Technician'].includes(currentUser.role);
}

// App inventory (third-party apps/services the farm uses) is Owner-only.
// This is account-level oversight — which vendors have access to farm data —
// not an operational tool other roles need day to day.
function canSeeApps() {
  return currentUser.role === 'Owner';
}



// Team members eligible to receive an assignment (active, not archived, not view-only).
function assignableMembers() {
  return teamMembers.filter(m => !m.archived && m.status === 'Active' && m.perms && !m.perms.viewOnly);
}

// ─── Escalation: "I can't fix this, needs Owner decision" ──────────────────
// A real cyber-hygiene workflow: a worker can identify and document a risk,
// but disposition (replace / retire / accept) belongs to the Owner. Anyone
// who is not Owner or Manager can push an open issue back up the chain;
// only Owner or Manager can clear it.
var escalatedOnlyFilter = false;
function canEscalateIssue(d) {
  if (!d || d.resolved || d.archived) return false;
  // Already escalated upward — block unless returned to them
  if (d.needsOwnerAction && !d.returnedToTech) return false;
  const r = currentUser.role;
  if (r === 'Owner' || r === 'Manager') return false;
  // Must be the assigned person
  if (!d.assignedTo) return false;
  if (!currentUser.name || d.assignedTo !== currentUser.name) return false;
  if (!canSeeIssue(d)) return false;
  // Only show standalone escalate box when there's a structural issue
  // AND the partial-resolve box is NOT handling it (prevents duplication).
  // If shouldShowPartialResolveBox is true, the purple form covers escalation.
  return hasStructuralIssue(d);
}

// Returns 'Manager' if an active, non-archived Manager account exists on the farm,
// otherwise falls back to 'Owner'. This determines who the primary action-taker
// is when an issue is escalated — the Owner is always notified either way.
function escalationTarget() {
  const mgr = teamMembers.find(m => m.role === 'Manager' && !m.archived && m.status === 'Active');
  return mgr ? 'Manager' : 'Owner';
}

function escalationTargetName() {
  const mgr = teamMembers.find(m => m.role === 'Manager' && !m.archived && m.status === 'Active');
  return mgr ? (mgr.name || 'Manager') : 'Owner';
}
function canClearEscalation() {
  return currentUser.role === 'Owner' || currentUser.role === 'Manager';
}

// Is the current user the PRIMARY action-taker for this escalation?
// Manager = primary when a Manager exists. Owner = primary when no Manager.
// Owner always sees it but gets a "step in" option rather than the main action banner
// unless they ARE the primary target.
function isEscalationPrimaryActor(d) {
  if (!d || !d.escalation) return false;
  const target = d.escalation.target || 'Owner';
  return currentUser.role === target;
}

// Owner always sees escalations (as FYI), even when Manager is the primary target.
function canSeeEscalationBanner(d) {
  return canClearEscalation() && d.needsOwnerAction && !d.resolved;
}
function escalatedDevices() {
  return devices.filter(d => d.needsOwnerAction && !d.resolved && !d.archived);
}
function escalateIssue(id) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  if (!canEscalateIssue(d)) { alert(t('escAlreadyOpen')); return; }
  const sel = document.getElementById('esc-reason-' + id);
  const note = document.getElementById('esc-note-' + id);
  const reason = sel ? sel.value : '';
  const noteVal = note ? note.value.trim() : '';
  if (!reason) { alert(t('escSelectReason')); return; }
  if (!noteVal) { alert(t('handoffNoteRequired')); return; }
  const target = escalationTarget();
  const targetName = escalationTargetName();
  d.needsOwnerAction = true;
  d.returnedToTech = false;
  d.returnNote = '';
  d.escalation = {
    target, targetName, reason,
    note: noteVal,
    by: currentUser.name || currentUser.phone || 'Team member',
    date: localTimestamp()
  };
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: 'escalate',
    from: currentUser.name || currentUser.role,
    to: targetName,
    note: noteVal,
    reason: reason,
    date: localTimestamp()
  });
  logAction('Issue escalated to ' + targetName,
    (d.label || d.type) + ' (' + d.brand + ') — ' + reason + ' | ' + noteVal);
  renderDashList();
  renderDeviceList();
  showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
}
function partialResolveAndEscalate(id) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  // Validate both fields before doing anything
  const fixNoteEl = document.getElementById('partial-fix-note-' + id);
  const escReasonEl = document.getElementById('partial-esc-reason-' + id);
  const escNoteEl = document.getElementById('partial-esc-note-' + id);
  const fixNote = fixNoteEl ? fixNoteEl.value.trim() : '';
  const escReason = escReasonEl ? escReasonEl.value : '';
  const escNote = escNoteEl ? escNoteEl.value.trim() : '';
  if (!fixNote) { alert(t('partialFixNoteRequired')); return; }
  if (!escReason) { alert(t('escSelectReason')); return; }
  if (!escNote) { alert(t('handoffNoteRequired')); return; }
  const target = escalationTarget();
  const targetName = escalationTargetName();
  const actor = currentUser.name || currentUser.role;
  const ts = localTimestamp();
  // Record the partial fix
  d.partiallyResolved = true;
  d.partialResolveNote = fixNote;
  d.partialResolveBy = actor;
  d.partialResolveDate = ts;
  // Record the escalation
  d.needsOwnerAction = true;
  d.returnedToTech = false;
  d.returnNote = '';
  d.escalation = { target, targetName, reason: escReason, note: escNote, by: actor, date: ts };
  // Append both events to handoff log
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: 'partialFix',
    from: actor, to: actor,
    note: fixNote,
    date: ts
  });
  d.handoffLog.push({
    type: 'escalate',
    from: actor, to: targetName,
    note: escNote, reason: escReason,
    date: ts
  });
  logAction('Partial fix + escalated to ' + targetName,
    (d.label || d.type) + ' (' + d.brand + ') — fixed: ' + fixNote + ' | escalated: ' + escReason + ' — ' + escNote);
  renderDashList();
  renderDeviceList();
  showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
}

function clearEscalation(d, reason) {
  if (!d || !d.needsOwnerAction) return;
  const prev = d.escalation || {};
  d.needsOwnerAction = false;
  d.escalation = {};
  // partiallyResolved stays true until explicitly fully resolved —
  // it's cleared when the device is marked fully resolved (resolveIssue).
  logAction('Escalation cleared',
    (d.label || d.type) + ' (' + d.brand + ')' +
    (prev.by ? ' — originally flagged by ' + prev.by : '') +
    (reason ? ' | ' + reason : ''));
}
function takeOwnership(id) {
  if (!canClearEscalation()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  const noteEl = document.getElementById('take-ownership-note-' + id);
  const noteVal = noteEl ? noteEl.value.trim() : '';
  if (!noteVal) { alert(t('handoffNoteRequired')); return; }
  const prevAssignee = d.assignedTo;
  const taker = currentUser.name || currentUser.phone || currentUser.role;
  d.assignedTo = taker;
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: 'takeOwnership',
    from: prevAssignee || 'unassigned',
    to: taker,
    note: noteVal,
    date: localTimestamp()
  });
  clearEscalation(d, currentUser.role + ' took ownership — ' + noteVal);
  renderDashList();
  renderDeviceList();
  showDetail(id);
}
function sendBackToTech(id) {
  if (currentUser.role !== 'Manager') return;
  const d = devices.find(x => x.id === id);
  if (!d || !d.needsOwnerAction || d.resolved) return;
  const noteEl = document.getElementById('send-back-note-' + id);
  const noteVal = noteEl ? noteEl.value.trim() : '';
  if (!noteVal) { alert(t('handoffNoteRequired')); return; }
  const sender = currentUser.name || 'Manager';
  const recipient = d.escalation && d.escalation.by ? d.escalation.by : (d.assignedTo || 'Technician');
  d.needsOwnerAction = false;
  d.returnedToTech = true;
  d.returnNote = noteVal;
  d.returnedBy = sender;
  d.returnedDate = localTimestamp();
  d.escalation = {};
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: 'sendBack',
    from: sender,
    to: recipient,
    note: noteVal,
    date: localTimestamp()
  });
  logAction('Escalation returned to tech',
    (d.label || d.type) + ' (' + d.brand + ') — sent back to ' + recipient + ' | ' + noteVal);
  renderDashList();
  renderDeviceList();
  showDetail(id);
}

function showSendBackForm(id) {
  const form = document.getElementById('send-back-form-' + id);
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function toggleHandoffLog(id) {
  const log = document.getElementById('handoff-log-' + id);
  const chevron = document.getElementById('handoff-chevron-' + id);
  if (!log) return;
  const isOpen = log.style.display !== 'none';
  log.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.className = isOpen ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
}

function showEscalatedOnly() {
  escalatedOnlyFilter = true;
  deviceFilter = 'active';
  showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
}
function clearEscalatedFilter() {
  escalatedOnlyFilter = false;
  renderDeviceList();
}



// Accessibility settings
