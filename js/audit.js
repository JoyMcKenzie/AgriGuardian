/* AgriGuardian: audit log */
var auditLog = [];

// Format a stored epoch timestamp in the ACTIVE language's locale, at render
// time — so switching language re-localizes every row's date automatically.
function formatAuditTs(ms) {
  var loc = (currentLang === 'es') ? 'es-ES' : 'en-US';
  try {
    return new Date(ms).toLocaleString(loc, { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12: currentLang !== 'es' });
  } catch (e) { return new Date(ms).toLocaleString(); }
}

// Translate a stored audit field. Entries store translation KEYS (+ optional
// params) rather than finished English, so the whole log re-translates on
// language switch. A field may be:
//   - a string that is a dictionary key            -> translated
//   - {key, params}                                -> translated w/ interpolation
//   - {raw}                                         -> shown verbatim (data)
//   - a plain non-key string (legacy/data)          -> shown verbatim
function tAudit(field) {
  if (field == null || field === '') return '';
  if (typeof field === 'object') {
    if (field.raw !== undefined) return field.raw;
    if (field.key !== undefined) return t(field.key, field.params);
    return '';
  }
  // plain string: translate if it's a known key, else show as-is (data)
  return (LANG && LANG.en && LANG.en[field] !== undefined) ? t(field) : field;
}

function renderAuditLog() {
  if (auditLog.length === 0) {
    return '<p style="font-size:13px;color:#7A8F80;text-align:center;padding:8px 0">' + t('noAuditActivity') + '</p>';
  }
  return auditLog.map(function (e) {
    var action = tAudit(e.actionKey);
    var detail = tAudit(e.detail);
    return '<div style="padding:8px 0;border-bottom:1px solid #E4EEE4;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:2px">' +
        '<span style="font-weight:600;color:#22372A">' + action + '</span>' +
        '<span style="color:#7A8F80">' + formatAuditTs(e.ts) + '</span>' +
      '</div>' +
      '<div style="color:#5F7266">' + e.actor + ' (' + tRole(e.role) + ')' + (detail ? ' — ' + detail : '') + '</div>' +
    '</div>';
  }).join('') + '<p style="font-size:11px;color:#aaa;margin-top:8px;text-align:center">' + t('auditShowingLast') + ' ' + auditLog.length + ' ' + (auditLog.length===1?t('auditAction'):t('auditActions')) + '</p>';
}

// logAction(actionKey, detail)
//   actionKey : a dictionary key naming the action (e.g. 'logDeviceAdded').
//   detail    : optional. Either a translation key string, a {key,params}
//               object for a sentence with variable parts, or {raw:'...'} for
//               literal data (device labels, names). Stored, translated on render.
function logAction(actionKey, detail) {
  auditLog.unshift({
    ts: Date.now(),
    actor: currentUser.name || currentUser.phone,
    role: currentUser.role,
    actionKey: actionKey,
    detail: (detail === undefined ? '' : detail)
  });
  if (auditLog.length > 200) auditLog.pop();
}

// Returns the effective permissions for the currently logged-in user.
// The Owner can always do everything. A team member's permissions come from
// their teamMembers entry (matched by phone, falling back to name).
