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
    alert('"' + trimmed + '" is too similar to an existing brand: "' + existing + '". Using "' + existing + '" instead.');
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
    alert('"' + trimmed + '" is too similar to an existing type: "' + existing + '". Using "' + existing + '" instead.');
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
  btn.style.background = '#888';

  setTimeout(function() {
    teamMembers.push({ name: name, phone: phone, role: role, status: 'Invited', archived: false, perms: { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true } });
    demoInviteProfile = { name: name, phone: phone, role: role };
    document.getElementById('member-name').value = '';
  document.getElementById('member-phone').value = '';
    btn.textContent = t('inviteBtn') || 'Send invitation';
    btn.disabled = false;
    btn.style.background = '';
    renderSettings();
    logAction('Team member invited', name + ' (' + phone + ')'); alert(t('invitationSentTo') + phone + '. They will receive an SMS to download AgriGuardian and join ' + (currentUser.farm || 'your farm') + '.');
  }, 1200);
}

function saveMemberEdits(phone) {
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  if (!canActOnMember(m)) { alert('You do not have permission to edit this member.'); return; }
  const newName = document.getElementById('edit-member-name').value.trim();
  const newPhone = document.getElementById('edit-member-phone').value.trim();
  if (!newName) { alert('Name cannot be empty.'); return; }
  if (!newPhone) { alert('Phone number cannot be empty.'); return; }
  const oldName = m.name;
  m.name = newName;
  m.phone = newPhone;
  logAction('Team member updated', oldName + ' → name: ' + newName + ', phone: ' + newPhone);
  renderSettings();
  // Re-open the member detail with new phone
  setTimeout(() => showMemberDetail(newPhone), 100);
  alert('Member updated successfully.');
}

function archiveMember(phone) {
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  if (!canActOnMember(m)) { alert('You do not have permission to archive this member.'); return; }
  const note = prompt('Why is ' + (m.name || phone) + ' being archived?\n\nA note is required. Their record and history will be kept.\n\nArchive reason:');
  if (note === null) return; // cancelled
  if (!note.trim()) { alert('Please enter a reason for archiving this user.'); return; }
  m.archived = true;
  m.status = 'Archived';
  m.archiveNote = note.trim();
  m.archivedDate = localTimestamp();
  logAction('Team member archived', (m.name || phone) + ' — ' + note.trim());
  renderSettings();
}

function restoreMember(phone) {
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  if (!canActOnMember(m)) { alert('You do not have permission to restore this member.'); return; }
  m.archived = false;
  m.status = 'Active';
  logAction('Team member restored', m.name || phone);
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
  const confirmed = confirm(
    'Change farm time zone to:\n\n' + tzLabel + '\n\n' +
    'This will affect all timestamps recorded from this point forward. ' +
    'Previously saved timestamps will not change.\n\n' +
    'Are you sure?'
  );
  if (confirmed) {
    const prevTz = currentUser.timezone || '(unset)';
    currentUser.timezone = newTz;
    logAction('Farm time zone updated', prevTz + ' → ' + newTz);
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

