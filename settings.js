/* AgriGuardian: farm settings and team */
var teamMembers = [
  { phone: '(555) 201-3344', name: 'Carlos Mendez', role: 'Manager', status: 'Active', archived: false,
    perms: { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: true, exportReports: true, viewOnly: false } },
  { phone: '(555) 442-7781', name: 'Sarah Tully', role: 'Technician', status: 'Active', archived: false,
    perms: { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: false, exportReports: false, viewOnly: false } },
  { phone: '(555) 309-6612', name: 'Jamie Ortiz', role: 'Farm Hand', status: 'Active', archived: false,
    perms: { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true } }
];

// The report-delivery email is a single FARM-level property, not a per-user
// field. People are identified and reached by phone; the only email in the
// system is the farm's official report address, because reports (hygiene,
// activity) sometimes have to leave the app — to an insurer, auditor, co-op,
// or lender. Only the Owner can set or change it.
var farmAccount = { reportEmail: 'angus@oldmcdonaldsfarm.demo', owner: { name: 'Angus MacDonald', phone: '(555) 123-4567' } };

// The team roster everyone can see includes the Owner (identity only). The
// Owner isn't stored in teamMembers, so we synthesize a display-only entry.
function getDisplayMembers() {
  var o = { name: farmAccount.owner.name, phone: farmAccount.owner.phone, role: 'Owner', status: 'Active', archived: false, perms: null };
  return [o].concat(teamMembers);
}

function saveOwnerEmail() {
  // Owner-only, enforced at the action (not just hidden in the UI).
  if (currentUser.role !== 'Owner') { alert('Only the Owner can change the farm report email.'); return; }
  const input = document.getElementById('owner-email-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert(t('emailRequired')); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { alert(t('emailInvalid')); return; }
  farmAccount.reportEmail = val;
  logAction('Updated farm report email', val);
  const btn = document.getElementById('btn-save-email');
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ ' + t('saved'); btn.style.background='#2E7A4E'; setTimeout(()=>{ btn.textContent=orig; btn.style.background='#1F4D2E'; }, 2000); }
}

function renderSettings() {
  const isOwner = currentUser.role === 'Owner';

  // Farm info
  const farmEl = document.getElementById('settings-farm-name');
  const roleEl = document.getElementById('settings-owner-role');
  if (farmEl) farmEl.textContent = currentUser.farm || 'My Farm';
  // Owner email field — pre-fill from currentUser
  const emailInput = document.getElementById('owner-email-input');
  if (emailInput && farmAccount.reportEmail) emailInput.value = farmAccount.reportEmail;
  const emailSection = document.getElementById('lbl-owner-email-setting');
  // Only Owners have the email field
  const emailRow = emailSection ? emailSection.closest('div[style*="margin-bottom:14px"]') : null;
  if (emailRow) emailRow.style.display = currentUser.role === 'Owner' ? 'block' : 'none';

  // Audit log — Owners and Managers
  const auditSection = document.getElementById('settings-audit');
  if (auditSection && canManage()) {
    if (!auditSection.nextElementSibling || !auditSection.nextElementSibling.id?.startsWith('audit-box')) {
      const auditBox = document.createElement('div');
      auditBox.id = 'audit-box';
      auditBox.style.cssText = 'border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;margin-bottom:12px';
      auditBox.innerHTML = '<button onclick="toggleSettingsSection(\'settings-audit\', this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f7f7f5;border:none;cursor:pointer;text-align:left">' +
        '<span id="sec-hdr-audit" style="font-size:13px;font-weight:600;color:#1F4D2E;text-transform:uppercase;letter-spacing:0.5px">' + t('auditLogTitle') + '</span>' +
        '<span class="sec-arrow" style="font-size:14px;color:#888">▸</span></button>' +
        '<div id="sec-settings-audit" style="display:none;padding:12px 14px">' +
        renderAuditLog() + '</div></div>';
      auditSection.parentNode.insertBefore(auditBox, auditSection.nextSibling);
    } else {
      const logContent = document.getElementById('sec-settings-audit');
      if (logContent) logContent.innerHTML = renderAuditLog();
    }
  }
  if (roleEl) roleEl.textContent = (currentUser.name || currentUser.phone) + ' — ' + (currentUser.role ? t('ownerRole') === t('ownerRole') && currentUser.role : 'Owner');

  // Show/hide invite section based on role
  // Time Zone — per the User Guide, only the Owner can modify this setting.
  // Only the Owner sees the timezone section in Settings at all.
  const tzSection = document.getElementById('tz-section');
  if (tzSection) tzSection.style.display = isOwner ? 'block' : 'none';
  // Hide the surrounding collapsible card (header + body) for non-Owners.
  const tzAnchor = document.getElementById('settings-timezone');
  const tzCard = tzAnchor && tzAnchor.nextElementSibling;
  if (tzCard) tzCard.style.display = isOwner ? '' : 'none';
  const tzSel = document.getElementById('farm-timezone-select');
  if (tzSel && currentUser && currentUser.timezone) tzSel.value = currentUser.timezone;
  const tzNote = document.getElementById('tz-owner-note');
  if (tzNote) tzNote.style.display = 'none';

  const inviteBox = document.getElementById('invite-box');
  if (inviteBox) {
    inviteBox.style.display = canManage() ? 'block' : 'none';
  }

  // Show owner-only notice for users who can't manage
  const ownerNotice = document.getElementById('non-owner-notice');
  if (ownerNotice) {
    ownerNotice.style.display = canManage() ? 'none' : 'block';
  }

  // Team list with permission management
  const list = document.getElementById('team-list');
  if (!list) return;
  if (teamMembers.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#888;font-style:italic;padding:8px 0">No team members added yet.</p>';
    return;
  }

  let filteredMembers = teamMembers;
  if (userFilter === 'active') filteredMembers = teamMembers.filter(m => !m.archived);
  if (userFilter === 'archived') filteredMembers = teamMembers.filter(m => m.archived);
  // The Owner is always on the active roster (identity only), so everyone can
  // see who owns the farm. Skip only when viewing the Archived filter.
  const ownerEntry = { name: farmAccount.owner.name, phone: farmAccount.owner.phone, role: 'Owner', status: 'Active', archived: false, perms: null };
  if (userFilter !== 'archived') filteredMembers = [ownerEntry].concat(filteredMembers);

  if (filteredMembers.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#888;font-style:italic;padding:8px 0">No ' + (userFilter === 'archived' ? 'archived' : '') + ' team members found.</p>';
    return;
  }

  // Build dropdown
  // Sort by last name
  const sortedMembers = [...filteredMembers].sort(function(a, b) {
    const getLastName = n => n && n.includes(' ') ? n.split(' ').slice(-1)[0] : (n || '');
    return getLastName(a.name).localeCompare(getLastName(b.name));
  });
  const formatName = function(name) {
    if (!name) return name;
    const parts = name.trim().split(' ');
    if (parts.length < 2) return name;
    const last = parts.slice(-1)[0];
    const first = parts.slice(0, -1).join(' ');
    return last + ', ' + first;
  };
  const rowHTML = sortedMembers.map(function(m) {
    const isArch = m.archived;
    const stColor = isArch ? '#888' : (m.status === 'Invited' ? '#854F0B' : '#2E7A4E');
    return '<button type="button" onclick="showMemberDetail(\'' + m.phone + '\')" ' +
      'style="width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;cursor:pointer;margin-bottom:6px">' +
      '<span style="min-width:0">' +
        '<span style="font-size:14px;font-weight:600;color:' + (isArch ? '#999' : '#111') + '">' + formatName(m.name || m.phone) + '</span>' +
        (isArch ? ' <span style="font-size:10px;background:#e0e0e0;color:#666;padding:1px 6px;border-radius:10px">Archived</span>' : '') +
        '<span style="display:block;font-size:12px;color:#888">' + m.role + ' &middot; <span style="color:' + stColor + '">' + m.status + '</span></span>' +
      '</span>' +
      '<span style="font-size:16px;color:#bbb;flex-shrink:0">\u203A</span>' +
    '</button>';
  }).join('');

  list.innerHTML = (isOwner ? renderRoleAccessEditor() : '') + rowHTML + '<div id="member-detail-panel" style="margin-top:10px"></div>';
}

function showMemberDetail(phone) {
  const panel = document.getElementById('member-detail-panel');
  if (!panel) return;
  if (!phone) { panel.innerHTML = ''; return; }
  const m = getDisplayMembers().find(x => x.phone === phone);
  if (!m) return;
  const realIdx = teamMembers.indexOf(m);
  const isOwner = currentUser.role === 'Owner';
  const canEditThis = canActOnMember(m); // can this viewer change this member at all?
  const statusColor = m.archived ? '#888' : (m.status === 'Invited' ? '#854F0B' : '#2E7A4E');

  const header = '<div style="background:#f7f7f5;border-radius:10px;padding:12px 14px;margin-bottom:10px">' +
    '<div style="font-size:14px;font-weight:600;color:' + (m.archived?'#999':'#111') + '">' + (m.name||m.phone) + (m.archived?' <span style="font-size:10px;background:#e0e0e0;color:#666;padding:2px 6px;border-radius:10px">Archived</span>':'') + '</div>' +
    (isOwner && !m.archived && m.role !== 'Owner' ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0">' +
      '<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">' + t('editMemberTitle') + '</div>' +
      '<div style="margin-bottom:8px"><label style="font-size:12px;color:#555;display:block;margin-bottom:3px">Full name</label>' +
      '<input id="edit-member-name" type="text" value="' + (m.name||'') + '" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-family:inherit"></div>' +
      '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:3px">Phone number</label>' +
      '<input id="edit-member-phone" type="tel" value="' + m.phone + '" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-family:inherit"></div>' +
      '<button onclick="saveMemberEdits(\'' + m.phone + '\')" style="background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%">Save changes</button>' +
      (m.role !== 'Owner' ? '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e0e0e0">' +
        '<label style="font-size:12px;color:#555;display:block;margin-bottom:3px">Role</label>' +
        '<select id="edit-member-role" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;font-family:inherit">' +
          ['Manager','Technician','Farm Hand','Viewer'].map(function(r){ return '<option value="' + r + '"' + (m.role === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
        '</select>' +
        '<button onclick="changeMemberRole(\'' + m.phone + '\')" style="background:#854F0B;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%;margin-top:6px">Change role</button>' +
        '<div style="font-size:11px;color:#999;margin-top:5px;line-height:1.4">Changing a role resets permissions to that role\u2019s defaults.</div>' +
      '</div>' : '') +
    '</div>' : '') +
    '<div style="font-size:12px;color:#888;margin-top:3px">' + m.phone + ' &middot; ' + m.role + ' &middot; <span style="color:' + statusColor + '">' + m.status + '</span></div>' +
    (m.archiveNote ? '<div style="font-size:11px;color:#A32D2D;margin-top:4px;font-style:italic">Archived ' + (m.archivedDate||'') + ': ' + m.archiveNote + '</div>' : '') +
  '</div>';

  const permsBlock = canEditThis ? (
    '<div style="margin-bottom:10px">' +
      '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">' + t('permissions') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        permCheckbox(realIdx, 'addDevices', t('permAdd'), m.perms.addDevices) +
        permCheckbox(realIdx, 'archiveDelete', t('permArchive'), m.perms.archiveDelete) +
        permCheckbox(realIdx, 'resolveIssues', t('permResolve'), m.perms.resolveIssues) +
        permCheckbox(realIdx, 'assignIssues', t('permAssign'), m.perms.assignIssues) +
        permCheckbox(realIdx, 'exportReports', t('permExport'), m.perms.exportReports) +
        permCheckbox(realIdx, 'viewOnly', t('permView'), m.perms.viewOnly) +
      '</div>' +
    '</div>'
  ) : '';

  const actions = canEditThis ? (
    '<div style="display:flex;gap:8px">' +
      (m.archived
        ? '<button class="device-action-btn" onclick="restoreMember(\'' + m.phone + '\');renderSettings();" style="flex:1">Restore</button>'
        : '<button class="device-action-btn" onclick="archiveMember(\'' + m.phone + '\')" style="flex:1">'+t('archive')+'</button>') +
    '</div>'
  ) : '';

  panel.innerHTML = header + permsBlock + actions;
}

// Owner-only editor for the per-role permission DEFAULTS (roleDefaults). Owner
// is always full access and Viewer always read-only, so only Manager,
// Technician, and Farm Hand templates are editable. Edits are forward-only:
// they change new invites and role-changes, never people already in a role.
function renderRoleAccessEditor() {
  if (currentUser.role !== 'Owner') return '';
  var roles = ['Manager', 'Technician', 'Farm Hand'];
  var keys = ['addDevices', 'archiveDelete', 'resolveIssues', 'assignIssues', 'exportReports'];
  var body = roles.map(function(role) {
    var d = roleDefaults[role] || {};
    var rows = keys.map(function(k) {
      return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#333;cursor:pointer;padding:2px 0">' +
        '<input type="checkbox" ' + (d[k] ? 'checked' : '') + ' onchange="toggleRoleDefault(\'' + role + '\', \'' + k + '\', this.checked)" style="width:auto;accent-color:#1F4D2E"> ' + permLabel(k) +
      '</label>';
    }).join('');
    var extra = (role === 'Manager' || role === 'Technician') ?
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#333;cursor:pointer;padding:6px 0 2px;margin-top:4px;border-top:1px dashed #e0e0e0">' +
        '<input type="checkbox" ' + (escalateToOwner[role] ? 'checked' : '') + ' onchange="toggleEscalateToOwner(\'' + role + '\', this.checked)" style="width:auto;accent-color:#1F4D2E"> Escalate to Owner' +
      '</label>' : '';
    return '<div style="margin-bottom:10px;padding:10px 12px;background:#f7f7f5;border-radius:8px">' +
      '<div style="font-size:12px;font-weight:600;color:#1F4D2E;margin-bottom:6px">' + role + '</div>' + rows + extra +
    '</div>';
  }).join('');
  return '<div id="role-access-box" style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;margin-bottom:14px">' +
    '<button onclick="toggleSettingsSection(\'role-access\', this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f7f7f5;border:none;cursor:pointer;text-align:left">' +
      '<span style="font-size:13px;font-weight:600;color:#1F4D2E;text-transform:uppercase;letter-spacing:0.5px">Role access (defaults)</span>' +
      '<span class="sec-arrow" style="font-size:14px;color:#888">\u25B8</span></button>' +
    '<div id="sec-role-access" style="display:none;padding:12px 14px">' +
      '<div style="font-size:12px;color:#888;margin-bottom:10px;line-height:1.5">Default access each role receives when invited or when a role changes. Owner is always full access; Viewer is always read-only. Changes apply going forward \u2014 they don\u2019t alter people already in a role.</div>' +
      body +
    '</div></div>';
}

function toggleEscalateToOwner(role, value) {
  if (currentUser.role !== 'Owner') { alert('Only the Owner can change role access defaults.'); return; }
  if (typeof escalateToOwner !== 'object' || escalateToOwner === null) return;
  var granting = !!value;
  var msg = (granting ? 'Allow' : 'Stop') + ' ' + role + 's ' + (granting ? 'to escalate' : 'from escalating') + ' issues straight to the Owner?';
  if (!window.confirm(msg)) { _refreshSettingsRoleOpen(); return; }
  escalateToOwner[role] = granting;
  logAction('Escalate-to-Owner changed', (granting ? 'Enabled' : 'Disabled') + ' for ' + role);
  _refreshSettingsRoleOpen();
}

function toggleRoleDefault(role, key, value) {
  if (currentUser.role !== 'Owner') { alert('Only the Owner can change role access defaults.'); return; }
  if (!roleDefaults[role]) return;
  var granting = !!value;
  var label = permLabel(key);
  var msg = (granting ? 'Add' : 'Remove') + ' \u201C' + label + '\u201D ' + (granting ? 'to' : 'from') + ' the ' + role + ' default?' +
    '\n\nThis affects newly invited ' + role + 's and anyone changed to ' + role + ' from now on. It does not change people already in this role.';
  if (!window.confirm(msg)) { _refreshSettingsRoleOpen(); return; }
  roleDefaults[role][key] = granting;
  var anyOn = ['addDevices', 'archiveDelete', 'resolveIssues', 'assignIssues', 'exportReports'].some(function(k) { return roleDefaults[role][k]; });
  roleDefaults[role].viewOnly = !anyOn;
  logAction('Role default changed', (granting ? 'Added ' : 'Removed ') + label + (granting ? ' to ' : ' from ') + role + ' default');
  _refreshSettingsRoleOpen();
}

// Re-render Settings but keep the Role Access section expanded, so editing a
// default doesn't collapse the panel after each checkbox.
function _refreshSettingsRoleOpen() {
  renderSettings();
  var sec = document.getElementById('sec-role-access');
  var box = document.getElementById('role-access-box');
  if (sec) sec.style.display = 'block';
  if (box) { var a = box.querySelector('.sec-arrow'); if (a) a.textContent = '\u25BE'; }
}

function permCheckbox(idx, key, label, checked) {
  return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#333;cursor:pointer">' +
    '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="togglePermission(' + idx + ', \'' + key + '\', this.checked)" style="width:auto;accent-color:#1F4D2E"> ' + label +
  '</label>';
}

// Owner-only. Changing a role is the one operation that can manufacture
// authority (e.g. Viewer -> Manager), so it's gated tightly: confirmation
// prompt worded for the stakes, permissions reset to the new role's defaults
// (so a demotion reliably pulls access down), and an audit entry naming the
// old and new role.
function changeMemberRole(phone) {
  var m = teamMembers.find(function(x){ return x.phone === phone; });
  if (!m) return;
  if (currentUser.role !== 'Owner') { alert('Only the Owner can change a member\u2019s role.'); return; }
  if (m.role === 'Owner') { alert('The Owner account cannot be changed here.'); return; }
  var sel = document.getElementById('edit-member-role');
  if (!sel) return;
  var newRole = sel.value;
  var who = m.name || m.phone;
  if (newRole === m.role) { alert('That is already ' + who + '\u2019s role.'); return; }
  var msg = 'Change ' + who + ' from ' + m.role + ' to ' + newRole + '?';
  if (newRole === 'Manager') msg += '\n\nManagers can invite crew, adjust permissions for junior members, and access nearly all farm data.';
  msg += '\n\nTheir permissions will be reset to the ' + newRole + ' defaults.';
  if (!window.confirm(msg)) return;
  var oldRole = m.role;
  m.role = newRole;
  m.perms = roleTemplate(newRole);
  logAction('Role change', 'Changed ' + who + ': ' + oldRole + ' \u2192 ' + newRole);
  _refreshMemberPanel(phone);
}

// Re-render Settings but keep the currently-open member detail panel showing,
// so an access change doesn't collapse the view and force a reselect.
function _refreshMemberPanel(phone) {
  renderSettings();
  var msel = document.getElementById('member-select');
  if (msel && phone) { msel.value = phone; showMemberDetail(phone); }
}

function permSummary(perms) {
  if (perms.viewOnly) return 'Read-only access';
  const active = [];
  if (perms.addDevices) active.push('Add devices');
  if (perms.archiveDelete) active.push('Archive/delete devices');
  if (perms.resolveIssues) active.push(t('resolveIssuesPerm'));
  if (perms.assignIssues) active.push(t('permAssign'));
  if (perms.exportReports) active.push(t('permExport'));
  return active.length ? active.join(', ') : 'Read-only access (default)';
}

function togglePermission(idx, key, value) {
  const m = teamMembers[idx];
  if (!m) return;
  if (!canActOnMember(m)) {
    alert('You do not have permission to change this member\u2019s access.');
    renderSettings();
    return;
  }
  // Privilege-escalation guard: a Manager cannot grant a permission they do
  // not hold themselves (e.g. archiveDelete). Only the Owner can widen rights
  // beyond their own ceiling.
  if (value && key !== 'viewOnly' && currentUser.role !== 'Owner') {
    const myPerms = currentPerms();
    if (!myPerms[key]) {
      alert('You cannot grant a permission you do not have yourself. Ask the Owner.');
      renderSettings();
      return;
    }
  }
  // Elevation double-check: every access change (grant OR revoke) is confirmed
  // before it takes effect, then written to the audit log. This limits
  // accidental assignments and leaves a who-changed-whose-access trail.
  var who = m.name || m.phone;
  var granting = !!value;
  var label = permLabel(key);
  var promptMsg;
  if (key === 'viewOnly') {
    promptMsg = granting
      ? 'Set ' + who + ' to VIEW ONLY?\n\nThis removes all other access (add devices, resolve, assign, export reports).'
      : 'Remove VIEW ONLY from ' + who + '?\n\nYou will then choose which access to grant.';
  } else {
    promptMsg = (granting ? 'GRANT' : 'REVOKE') + ' \u201C' + label + '\u201D '
      + (granting ? 'to ' : 'from ') + who + '?'
      + (granting ? '\n\nThis will let them ' + permGrantDesc(key) + '.' : '');
  }
  if (!window.confirm(promptMsg)) { renderSettings(); return; }
  var logDetail = (key === 'viewOnly')
    ? (granting ? 'Set ' + who + ' to view only' : 'Removed view only from ' + who)
    : (granting ? 'Granted ' + label + ' to ' + who : 'Revoked ' + label + ' from ' + who);
  logAction('Permission change', logDetail);
  if (key === 'viewOnly' && value) {
    // Read-only overrides everything else
    m.perms.addDevices = false;
    m.perms.archiveDelete = false;
    m.perms.resolveIssues = false;
    m.perms.assignIssues = false;
    m.perms.exportReports = false;
    m.perms.viewOnly = true;
  } else if (key !== 'viewOnly' && value) {
    // Granting any active permission turns off read-only
    m.perms.viewOnly = false;
    m.perms[key] = true;
  } else {
    m.perms[key] = value;
    // If nothing is active, default back to read-only
    if (!m.perms.addDevices && !m.perms.archiveDelete && !m.perms.resolveIssues && !m.perms.assignIssues && !m.perms.exportReports) {
      m.perms.viewOnly = true;
    }
  }
  _refreshMemberPanel(m.phone);
}

var customRoles = [];

function handleRoleSelect(sel) {
  if (sel.value === '__custom__') {
    document.getElementById('custom-role-row').style.display = 'block';
  } else {
    document.getElementById('custom-role-row').style.display = 'none';
  }
}

function normalizeRole(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getAllRoleNames() {
  const baseRoles = ['Owner','Manager','Technician','Farm Hand','Viewer'];
  return baseRoles.concat(customRoles);
}

function addCustomRoleIfNew(roleName) {
  const trimmed = roleName.trim();
  if (!trimmed) return null;
  const normalized = normalizeRole(trimmed);
  const existing = getAllRoleNames().find(r => normalizeRole(r) === normalized);
  if (existing) {
    return existing; // reuse existing role with its original casing/spelling
  }
  customRoles.push(trimmed);
  refreshRoleDropdowns();
  return trimmed;
}

// Custom brand and type lists
var customBrands = [];
var customTypes = [];

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

// Network connections