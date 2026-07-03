/**
 * One-time splitter: breaks monolithic app.js into lib/ + js/ modules.
 * Run: node scripts/split-app.js
 * Preserves exact source — no logic changes, only file boundaries.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const lines = src.split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n') + '\n';
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('wrote', rel, '(' + content.split('\n').length + ' lines)');
}

// 1-based inclusive line ranges (from structural analysis of app.js)
const modules = [
  ['lib/jspdf.min.js', 1, 399, '/* AgriGuardian — bundled jsPDF (do not edit) */\n'],
  ['js/i18n/lang-data.js', 401, 1689, '/* AgriGuardian i18n — translation strings */\n'],
  ['js/i18n/core.js', 1690, 1731, '/* AgriGuardian i18n — runtime helpers (t, timestamps) */\n'],
  ['js/risk.js', 1733, 1797, '/* AgriGuardian — risk scoring */\n'],
  ['js/reports.js', 1799, 2049, '/* AgriGuardian — PDF / email reports */\n'],
  ['js/hygiene.js', 2050, 2145, '/* AgriGuardian — hygiene score */\n'],
  ['js/dashboard.js', 2146, 2394, '/* AgriGuardian — dashboard alerts & list */\n'],
  ['js/devices-list.js', 2395, 2538, '/* AgriGuardian — device list, archive, filters */\n'],
  ['js/audit.js', 2539, 2564, '/* AgriGuardian — audit log */\n'],
  ['js/permissions.js', 2565, 2943, '/* AgriGuardian — roles, permissions, escalation */\n'],
  ['js/accessibility.js', 2944, 3069, '/* AgriGuardian — accessibility settings */\n'],
  ['js/vulnerabilities.js', 3070, 3208, '/* AgriGuardian — CISA / NVD checks */\n'],
  ['js/devices-detail.js', 3209, 3894, '/* AgriGuardian — device detail, add, assign */\n'],
  ['js/settings.js', 3895, 4166, '/* AgriGuardian — farm settings & team */\n'],
  ['js/networks-data.js', 4167, 4310, '/* AgriGuardian — network & app risk data */\n'],
  ['js/networks.js', 4311, 4653, '/* AgriGuardian — network UI & CRUD */\n'],
  ['js/apps.js', 4656, 5071, '/* AgriGuardian — apps inventory & backup screen */\n'],
  ['js/team.js', 5072, 5267, '/* AgriGuardian — team invites & farm config */\n'],
  ['js/auth-ui.js', 5268, 5490, '/* AgriGuardian — login steps & enter app */\n'],
  ['js/report-viewers.js', 5491, 5584, '/* AgriGuardian — in-app report viewers */\n'],
  ['js/auth-flow.js', 5585, 5631, '/* AgriGuardian — registration & MFA send */\n'],
  ['js/session.js', 5632, 5770, '/* AgriGuardian — session timeout & verify */\n'],
  ['js/i18n/set-lang.js', 5772, 6249, '/* AgriGuardian i18n — setLang (UI refresh) */\n'],
  ['js/devices-resolve.js', 6251, lines.length, '/* AgriGuardian — verify, resolve, replacement */\n'],
];

for (const [rel, start, end, header] of modules) {
  write(rel, header + slice(start, end));
}

// Generate script load order for index.html
const loadOrder = modules.map(m => m[0]);
fs.writeFileSync(
  path.join(ROOT, 'scripts', 'module-load-order.json'),
  JSON.stringify(loadOrder, null, 2),
  'utf8'
);
console.log('\nDone. Update index.html script tags using scripts/module-load-order.json');
