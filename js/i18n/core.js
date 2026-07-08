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
const BUILD_TIMESTAMP = '2026-07-08T15:14:56Z';

function applyBuildTimestamp() {
  const el = document.getElementById('build-timestamp');
  if (!el) return;
  try { el.textContent = formatBuildTimestamp(new Date(BUILD_TIMESTAMP)); }
  catch(e) {}
}

document.addEventListener('DOMContentLoaded', applyBuildTimestamp);

// ── SINGLE SOURCE OF TRUTH: translation lookup ───────────────────────
// Every piece of UI text in the app routes through t(). It looks up `key`
// in the active language, falls back to English, then to the key itself.
// Optional `params` object interpolates {placeholder} tokens, so sentences
// with variable parts are ONE dictionary entry instead of concatenated
// fragments (concatenation is what broke translation before).
//   t('escSendBtn', { target: t('roleOwner') })  ->  "Send to Owner"
function t(key, params) {
  var v = (LANG && LANG[currentLang] && LANG[currentLang][key] !== undefined) ? LANG[currentLang][key]
        : (LANG && LANG['en'] && LANG['en'][key] !== undefined ? LANG['en'][key] : key);
  if (params && typeof v === 'string') {
    v = v.replace(/\{(\w+)\}/g, function (m, p) { return params[p] !== undefined ? params[p] : m; });
  }
  return v;
}

// ── SINGLE SOURCE OF TRUTH: DOM translation sweep ────────────────────
// applyI18n() is the ONE function that puts translated text onto the page.
// It walks `root` (default: whole document) and translates every element
// carrying an i18n data-attribute:
//   data-i18n="key"          -> textContent   (most text)
//   data-i18n-html="key"     -> innerHTML     (text that contains markup)
//   data-i18n-ph="key"       -> placeholder
//   data-i18n-aria="key"     -> aria-label
//   data-i18n-title="key"    -> title tooltip
//   data-i18n-prefix="glyph" -> keeps a leading glyph (e.g. "⚠️ ") before text
// This is called on load, on every language switch, AND at the end of every
// dynamic render (see applyI18n(container) calls in the render functions).
// Because a newly-built element is swept the moment it enters the DOM,
// text can never "escape" translation the way it used to.
//
// ALLOWLIST: anything WITHOUT a data-i18n* attribute is intentionally left
// alone. That is the explicit allowlist for content that must stay as-is —
// brand names (John Deere, Netgear…), device model/serial numbers, person
// names, "AgriGuardian", CVE ids, URLs, phone numbers and demo codes. To add
// a new proper noun to the allowlist, simply render it without a data-i18n
// attribute. To translate something, give it one. There is no third path.
function applyI18n(root) {
  root = root || document;
  var els = [];
  var SEL = '[data-i18n],[data-i18n-html],[data-i18n-ph],[data-i18n-aria],[data-i18n-title],[data-i18n-alt],[data-i18n-optlabel]';
  if (root.nodeType === 1 && root.matches && root.matches(SEL)) els.push(root);
  if (root.querySelectorAll) {
    root.querySelectorAll(SEL).forEach(function (e) { els.push(e); });
  }
  els.forEach(function (el) {
    if (el.hasAttribute('data-i18n')) {
      var pre = el.getAttribute('data-i18n-prefix') || '';
      el.textContent = pre + t(el.getAttribute('data-i18n'));
    }
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = t(el.getAttribute('data-i18n-html'));
    if (el.hasAttribute('data-i18n-ph')) el.placeholder = t(el.getAttribute('data-i18n-ph'));
    if (el.hasAttribute('data-i18n-aria')) el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    if (el.hasAttribute('data-i18n-title')) el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    if (el.hasAttribute('data-i18n-alt')) el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
    if (el.hasAttribute('data-i18n-optlabel')) el.label = t(el.getAttribute('data-i18n-optlabel'));
  });
}

// Translate a stored role identifier (canonical enum) for display.
// Roles are stored as canonical keys ('Owner','Manager','Technician',
// 'Farm Hand','Viewer') and only ever shown to the user via this helper.
function tRole(role) {
  var map = { 'Owner': 'roleOwner', 'Manager': 'roleManager', 'Technician': 'roleTechnician',
              'Farm Hand': 'roleFarmHand', 'Farmhand': 'roleFarmHand', 'Viewer': 'roleViewer' };
  return map[role] ? t(map[role]) : (role || '');
}

// Always use browser's local timezone for all timestamps
function localTimestamp() {
  const now = new Date();
  const tz = (currentUser && currentUser.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const datePart = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
  const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: tz }).formatToParts(now).find(p => p.type === 'timeZoneName').value;
  return datePart + ' ' + timePart + ' ' + tzName;
}
