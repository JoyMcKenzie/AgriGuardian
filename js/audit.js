/* AgriGuardian: audit log */
var auditLog = [];
function renderAuditLog() {
  if (auditLog.length === 0) {
    return '<p style="font-size:13px;color:#888;text-align:center;padding:8px 0">' + t('noAuditActivity') + '</p>';
  }
  return auditLog.map(e =>
    '<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:2px">' +
        '<span style="font-weight:600;color:#333">' + e.action + '</span>' +
        '<span style="color:#888">' + e.ts + '</span>' +
      '</div>' +
      '<div style="color:#555">' + e.actor + ' (' + e.role + ')' + (e.detail ? ' — ' + e.detail : '') + '</div>' +
    '</div>'
  ).join('') + '<p style="font-size:11px;color:#aaa;margin-top:8px;text-align:center">' + t('auditShowingLast') + ' ' + auditLog.length + ' ' + (auditLog.length===1?t('auditAction'):t('auditActions')) + '</p>';
}

function logAction(action, detail) {
  const now = new Date();
  const ts = now.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
  auditLog.unshift({ ts, actor: currentUser.name || currentUser.phone, role: currentUser.role, action, detail: detail || '' });
  if (auditLog.length > 200) auditLog.pop();
}

// Returns the effective permissions for the currently logged-in user.
// The Owner can always do everything. A team member's permissions come from
// their teamMembers entry (matched by phone, falling back to name).
