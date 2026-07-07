/* AgriGuardian i18n: runtime helpers */
var currentLang = 'en';
var currentDetailView = null; // tracks the open detail screen so it can be re-rendered on language switch
var currentUser = { phone: '', role: '', farm: '', name: '', loggedIn: false };
// Format the document's last-modified time as a friendly ET timestamp
function formatBuildTimestamp(src) {
  let d = src ? new Date(src) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  const datePart = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(d);
  const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }).format(d);
  return datePart + ' ' + timePart + ' ET';
}

// ── BUILD STAMP (manual version marker) ──────────────────────────────
// This value is NOT auto-derived. A previous version tried to read app.js's
// Last-Modified header via fetch()/HEAD, but that only works over a real HTTP
// server and fails silently under file:// (local open / extracted zip), which
// is exactly when the stamp gets checked most. So the version is assigned by
// hand here. Bump the line below on every edit that touches js/ modules — run:
//     date -u +"%Y-%m-%dT%H:%M:%SZ"
// and paste the result. This is a required last step of the edit workflow.
const BUILD_TIMESTAMP = '2026-07-07T02:34:33Z';

function applyBuildTimestamp() {
  const el = document.getElementById('build-timestamp');
  if (!el) return;
  try { el.textContent = formatBuildTimestamp(new Date(BUILD_TIMESTAMP)); }
  catch(e) {}
}

document.addEventListener('DOMContentLoaded', applyBuildTimestamp);

function t(key) { var v = (LANG && LANG[currentLang] && LANG[currentLang][key] !== undefined) ? LANG[currentLang][key] : (LANG && LANG['en'] && LANG['en'][key] !== undefined ? LANG['en'][key] : key); return v; }

// Always use browser's local timezone for all timestamps
function localTimestamp() {
  const now = new Date();
  const tz = (currentUser && currentUser.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
  const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: tz }).formatToParts(now).find(p => p.type === 'timeZoneName').value;
  return datePart + ' ' + timePart + ' ' + tzName;
}
