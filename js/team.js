/* AgriGuardian: team invites and farm config */
function handleLocationSelect(sel) {
  document.getElementById('custom-location-row').style.display =
    sel.value === '__custom_loc__' ? 'block' : 'none';
}

function handleBrandSelect(sel) {
  document.getElementById('custom-brand-row').style.display =
    sel.value === '__other_brand__' ? 'block' : 'none';
}

function handleTypeSelect(sel) {
  document.getElementById('custom-type-row').style.display =
    sel.value === '__other_type__' ? 'block' : 'none';
}

function resolveCustomBrand(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const norm = normalizeName(trimmed);
  const builtIn = ['John Deere','Valley Irrigation','Hog Slat','DeLaval','Trimble','DJI','Arable','Apple','Samsung','Dell'];
  const existing = builtIn.concat(customBrands).find(b => normalizeName(b) === norm);
  if (existing) {
    alert(t('brandTooSimilar', {input: trimmed, existing: existing}));
    return existing;
  }
  customBrands.push(trimmed);
  // Add to dropdown
  const sel = document.getElementById('brand-select');
  const otherOpt = sel.querySelector('option[value="__other_brand__"]');
  const newOpt = document.createElement('option');
  newOpt.value = trimmed;
  newOpt.textContent = trimmed;
  sel.insertBefore(newOpt, otherOpt);
  return trimmed;
}

function resolveCustomType(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const norm = normalizeName(trimmed);
  const builtIn = ['Irrigation controller','Soil sensor','Livestock monitor','Camera / security','GPS / guidance system','Barn ventilation controller','Drone','Feed system'];
  const existing = builtIn.concat(customTypes).find(t => normalizeName(t) === norm);
  if (existing) {
    alert(t('typeTooSimilar', {input: trimmed, existing: existing}));
    return existing;
  }
  customTypes.push(trimmed);
  // Add to dropdown
  const sel = document.getElementById('type-select');
  const otherOpt = sel.querySelector('option[value="__other_type__"]');
  const newOpt = document.createElement('option');
  newOpt.value = trimmed;
  newOpt.textContent = trimmed;
  sel.insertBefore(newOpt, otherOpt);
  return trimmed;
}

function refreshRoleDropdowns() {
  ['member-role'].forEach(function(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const currentVal = sel.value;
    // Only Owner can invite another Manager — a Manager inviting a peer
    // would be a lateral privilege move, the same thing canActOnMember()
    // already blocks for editing/archiving. Filtering it out of the invite
    // dropdown closes the one other place a Manager could be created.
    let html = (currentUser.role === 'Owner' ? '<option value="Manager">' + t('roleManager') + '</option>' : '') +
      '<option value="Technician">' + t('roleTechnician') + '</option>' +
      '<option value="Farm Hand">' + t('roleFarmHand') + '</option>' +
      '<option value="Viewer">' + t('roleViewer') + '</option>';
    customRoles.forEach(function(r) {
      html += '<option value="' + r + '">' + r + '</option>';
    });
    html += '<option value="__custom__">' + t('addNewRoleOption') + '</option>';
    sel.innerHTML = html;
    if (getAllRoleNames().includes(currentVal) && currentVal !== 'Manager') sel.value = currentVal;
  });
}

function inviteMember() {
  const name = document.getElementById('member-name').value.trim();
  const phone = document.getElementById('member-phone').value.trim();
  let role = document.getElementById('member-role').value;
  if (role === '__custom__') {
    const customInput = document.getElementById('custom-role-input').value.trim();
    if (!customInput) { alert(t('enterRoleName')); return; }
    role = addCustomRoleIfNew(customInput);
    document.getElementById('member-role').value = role;
    document.getElementById('custom-role-row').style.display = 'none';
    document.getElementById('custom-role-input').value = '';
  }
  if (!name) { alert(t('enterMemberName')); return; }
  if (!phone) { alert(t('enterPhone')); return; }
  if (teamMembers.find(m => m.phone === phone)) { alert(t('alreadyInvited')); return; }
  // Defense-in-depth: the dropdown already hides this option for non-Owner
  // inviters, but a stored form value or programmatic call shouldn't be
  // able to bypass it either. Only Owner can create another Manager.
  if (role === 'Manager' && currentUser.role !== 'Owner') {
    alert(t('onlyOwnerCanInviteManager'));
    return;
  }

  const btn = document.getElementById('btn-invite');
  btn.textContent = t('sending');
  btn.disabled = true;
  btn.style.background = '#7A8F80';

  setTimeout(function() {
    teamMembers.push({ name: name, phone: phone, role: role, status: 'Invited', archived: false, perms: { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true } });
    demoInviteProfile = { name: name, phone: phone, role: role };
    document.getElementById('member-name').value = '';
  document.getElementById('member-phone').value = '';
    btn.textContent = t('inviteBtn') || t('sendInvitation');
    btn.disabled = false;
    btn.style.background = '';
    renderSettings();
    logAction('logTeamMemberInvited', {raw: name + ' (' + phone + ')'}); alert(t('invitationSentFull', {phone: phone, farm: (currentUser.farm || t('myFarm'))}));
  }, 1200);
}

function saveMemberEdits(phone) {
  // Auto-saves on blur/change (no Save button). Silent: skips incomplete or
  // unchanged edits, and does not re-open the editor (so it doesn't steal focus
  // mid-edit). The underlying list refreshes the next time Settings renders.
  const m = teamMembers.find(x => x.phone === phone);
  if (!m || !canActOnMember(m)) return;
  const nameEl = document.getElementById('edit-member-name');
  const phoneEl = document.getElementById('edit-member-phone');
  if (!nameEl || !phoneEl) return;
  const newName = nameEl.value.trim();
  const newPhone = phoneEl.value.trim();
  if (!newName || !newPhone) return;              // don't save an incomplete edit
  if (newName === m.name && newPhone === m.phone) return; // no change
  const oldName = m.name;
  m.name = newName;
  m.phone = newPhone;
  logAction('logTeamMemberUpdated', {raw: oldName + ' → ' + newName + ' / ' + newPhone});
}

function archiveMember(phone) {
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  if (!canActOnMember(m)) { alert(t('alertNoPermArchive')); return; }
  const note = prompt(t('promptArchiveReason', {name: (m.name || phone)}));
  if (note === null) return; // cancelled
  if (!note.trim()) { alert(t('alertEnterArchiveReason')); return; }
  m.archived = true;
  m.status = 'Archived';
  m.archiveNote = note.trim();
  m.archivedDate = localTimestamp();
  logAction('logTeamMemberArchived', {raw: (m.name || phone) + ' — ' + note.trim()});
  renderSettings();
}

function restoreMember(phone) {
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  if (!canActOnMember(m)) { alert(t('alertNoPermRestore')); return; }
  m.archived = false;
  m.status = 'Active';
  logAction('logTeamMemberRestored', {raw: m.name || phone});
  renderSettings();
}

function updateFarmTimezone() {
  // Per the User Guide: only the Owner role can modify the farm time zone.
  if (currentUser.role !== 'Owner') {
    alert(t('onlyOwnerTimezone'));
    const sel = document.getElementById('farm-timezone-select');
    if (sel && currentUser.timezone) sel.value = currentUser.timezone;
    return;
  }
  const sel = document.getElementById('farm-timezone-select');
  if (!sel) return;
  const newTz = sel.value;
  if (newTz === currentUser.timezone) return;
  const tzLabel = sel.options[sel.selectedIndex].text;
  const confirmed = confirm(t('confirmChangeTz', {tz: tzLabel}));
  if (confirmed) {
    const prevTz = currentUser.timezone || t('tzUnset');
    currentUser.timezone = newTz;
    logAction('logFarmTzUpdated', {raw: prevTz + ' → ' + newTz});
    alert(t('timeZoneUpdatedTo') + tzLabel + '.');
  } else {
    sel.value = currentUser.timezone;
  }
}

function updateTimeout() {
  const val = parseInt(document.getElementById('timeout-select').value);
  SESSION_TIMEOUT = val;
  resetTimeout();
}

