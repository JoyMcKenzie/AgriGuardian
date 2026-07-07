/* AgriGuardian: farm settings and team */
var teamMembers = [
  { phone: '(555) 201-3344', name: 'Carlos Mendez', role: 'Manager', status: 'Active', archived: false,
    perms: { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: true, exportReports: true, viewOnly: false } },
  { phone: '(555) 442-7781', name: 'Sarah Tully', role: 'Technician', status: 'Active', archived: false,
    perms: { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: false, exportReports: false, viewOnly: false } },
  { phone: '(555) 014-2208', name: 'Joni Dear', role: 'Technician', status: 'Active', archived: false,
    perms: { addDevices: true, archiveDelete: false, resolveIssues: true, assignIssues: false, exportReports: false, viewOnly: false } },
  { phone: '(555) 309-6612', name: 'Jamie Ortiz', role: 'Farm Hand', status: 'Active', archived: false,
    perms: { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true } }
];

function saveOwnerEmail() {
  const input = document.getElementById('owner-email-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { alert(t('emailRequired')); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { alert(t('emailInvalid')); return; }
  currentUser.email = val;
  logAction('Updated report email', val);
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
  if (emailInput && currentUser.email) emailInput.value = currentUser.email;
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
  if (roleEl) roleEl.textContent = (currentUser.name || currentUser.phone) + ' — ' + (currentUser.role || 'Owner'); // CL4: removed tautological t()===t() expr

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

  // Archived/All views expose former employees' contact info — least
  // privilege means non-managers only ever see the active roster, and a
  // stale filter value from a previous session (userFilter is a shared
  // global, not per-user) can't leak an unauthorized view either.
  const archivedBtn = document.getElementById('filter-user-archived');
  const allBtn = document.getElementById('filter-user-all');
  if (archivedBtn) archivedBtn.style.display = canManage() ? '' : 'none';
  if (allBtn) allBtn.style.display = canManage() ? '' : 'none';
  if (!canManage() && userFilter !== 'active') {
    userFilter = 'active';
    const activeBtn = document.getElementById('filter-user-active');
    document.querySelectorAll('#user-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Owner isn't in teamMembers at all (a separate identity, see auth-flow.js),
  // so the team list could never show them or their contact info regardless
  // of who was viewing. Every other role needs a way to reach the Owner by
  // phone, so a synthetic entry is added here for display purposes only —
  // showMemberDetail() special-cases this phone number rather than trying
  // to treat it like a real teamMembers record with editable perms.
  const ownerEntry = { phone: '(555) 123-4567', name: 'Angus MacDonald', role: 'Owner', status: 'Active', archived: false };
  let filteredMembers = teamMembers.concat([ownerEntry]).filter(m =>
    !((currentUser.phone && m.phone === currentUser.phone) ||
      (currentUser.name && m.name === currentUser.name))
  );
  if (userFilter === 'active') filteredMembers = filteredMembers.filter(m => !m.archived);
  if (userFilter === 'archived') filteredMembers = filteredMembers.filter(m => m.archived);

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
  const dropdown = '<select id="member-select" onchange="showMemberDetail(this.value)" style="width:100%;font-size:14px;padding:9px 12px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px">' +
    '<option value="">' + t('selectTeamMember') + '</option>' +
    sortedMembers.map(function(m) {
      const label = formatName(m.name || m.phone) + ' — ' + m.role + (m.archived ? ' (Archived)' : '');
      return '<option value="' + m.phone + '">' + label + '</option>';
    }).join('') +
  '</select>';

  list.innerHTML = dropdown + '<div id="member-detail-panel"></div>';
}

function showMemberDetail(phone) {
  const panel = document.getElementById('member-detail-panel');
  if (!panel) return;
  if (!phone) { panel.innerHTML = ''; return; }
  // Owner is a separate identity, not a real teamMembers record — just show
  // contact info so anyone needing to reach the Owner by phone can. No edit
  // controls, no permission checkboxes: nothing here to safely act on.
  if (phone === '(555) 123-4567') {
    panel.innerHTML = '<div style="background:#f7f7f5;border-radius:10px;padding:12px 14px">' +
      '<div style="font-size:14px;font-weight:600;color:#111">Angus MacDonald</div>' +
      '<div style="font-size:12px;color:#888;margin-top:3px">' + phone + ' &middot; Owner</div>' +
    '</div>';
    return;
  }
  const m = teamMembers.find(x => x.phone === phone);
  if (!m) return;
  const realIdx = teamMembers.indexOf(m);
  const isOwner = currentUser.role === 'Owner';
  const canMng = canManage();
  const statusColor = m.archived ? '#888' : (m.status === 'Invited' ? '#854F0B' : '#2E7A4E');

  const header = '<div style="background:#f7f7f5;border-radius:10px;padding:12px 14px;margin-bottom:10px">' +
    '<div style="font-size:14px;font-weight:600;color:' + (m.archived?'#999':'#111') + '">' + (m.name||m.phone) + (m.archived?' <span style="font-size:10px;background:#e0e0e0;color:#666;padding:2px 6px;border-radius:10px">Archived</span>':'') + '</div>' +
    (canMng && !m.archived ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0">' +
      '<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">' + t('editMemberTitle') + '</div>' +
      '<div style="margin-bottom:8px"><label style="font-size:12px;color:#555;display:block;margin-bottom:3px">Full name</label>' +
      '<input id="edit-member-name" type="text" value="' + (m.name||'') + '" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-family:inherit"></div>' +
      '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:3px">Phone number</label>' +
      '<input id="edit-member-phone" type="tel" value="' + m.phone + '" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-family:inherit"></div>' +
      '<button onclick="saveMemberEdits(\'' + m.phone + '\')" style="background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;width:100%">Save changes</button>' +
    '</div>' : '') +
    '<div style="font-size:12px;color:#888;margin-top:3px">' + m.phone + ' &middot; ' + m.role + ' &middot; <span style="color:' + statusColor + '">' + m.status + '</span></div>' +
    (m.archiveNote ? '<div style="font-size:11px;color:#A32D2D;margin-top:4px;font-style:italic">Archived ' + (m.archivedDate||'') + ': ' + m.archiveNote + '</div>' : '') +
  '</div>';

  const permsBlock = canMng ? (
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
  ) : '<div style="font-size:13px;color:#666;margin-bottom:10px">' + permSummary(m.perms) + '</div>';

  const actions = canMng ? (
    '<div style="display:flex;gap:8px">' +
      (m.archived
        ? '<button class="device-action-btn" onclick="restoreMember(\'' + m.phone + '\');renderSettings();" style="flex:1">Restore</button>'
        : '<button class="device-action-btn" onclick="archiveMember(\'' + m.phone + '\')" style="flex:1">'+t('archive')+'</button>') +
    '</div>'
  ) : '';

  panel.innerHTML = header + permsBlock + actions;
}

function permCheckbox(idx, key, label, checked) {
  return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#333;cursor:pointer">' +
    '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="togglePermission(' + idx + ', \'' + key + '\', this.checked)" style="width:auto;accent-color:#1F4D2E"> ' + label +
  '</label>';
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
  // Granting access is confirmed before it takes effect; revoking isn't —
  // narrowing someone's access is always the safe direction, only widening
  // it needs a second look.
  const permKeyMap = { addDevices: 'permAdd', archiveDelete: 'permArchive', resolveIssues: 'permResolve', assignIssues: 'permAssign', exportReports: 'permExport', viewOnly: 'permView' };
  const isGrant = value && key !== 'viewOnly';
  if (isGrant && !confirm(t('confirmGrantPermission').replace('{perm}', t(permKeyMap[key]) || key).replace('{name}', m.name || m.phone))) {
    // The checkbox's native .checked already flipped when the user clicked
    // it, before this handler ran — without re-rendering, it would stay
    // visually toggled even though m.perms was never actually updated.
    renderSettings();
    return;
  }
  const before = Object.assign({}, m.perms);
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
  // Every permission change is logged — who changed what, for whom, and
  // which direction. Least privilege isn't just prevention; being able to
  // review who granted access to whom is the other half of it.
  logAction(t('logPermissionChanged'), m.name + ': ' + (t(permKeyMap[key]) || key) + ' ' + (value ? t('logGranted') : t('logRevoked')));
  renderSettings();
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
