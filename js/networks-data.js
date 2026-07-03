/* AgriGuardian: network and app risk data */
var networks = [
  { id: 1, archived: false, type: 'Wi-Fi', label: 'Farm Wi-Fi', pw: 'yes', encrypted: 'yes', hwBrand: 'Netgear', hwModel: 'Nighthawk R7000', notes: 'ISP: Rural Telecom — 800-555-1200\nContract renewal: March 2027\nRouter located in main office closet' },
  { id: 2, archived: false, type: 'Cellular (LTE/5G)', label: 'Field sensor network', pw: 'yes', encrypted: 'yes', hwBrand: 'Cisco', hwModel: 'RV340', notes: 'Carrier: AgriConnect LTE — 888-247-3344\nSIM card in barn equipment panel\nData plan: 20GB/month' },
  { id: 3, archived: false, type: 'Bluetooth', label: 'Barn controller link', pw: 'no', encrypted: 'no', hwBrand: 'TP-Link', hwModel: 'TL-WR940N', notes: 'Connects barn ventilation controller to monitoring tablet\nNo password set — needs immediate attention' }
];
var nextNetId = 4;

function getNetRisk(n) {
  if (n.pw === 'no' && n.encrypted === 'no') return 'red';
  if (n.pw === 'no' || n.encrypted === 'no') return 'yellow';
  return 'green';
}

function getNetRiskLabel(r) {
  return r === 'red' ? t('actNowBadge') : r === 'yellow' ? t('takeAction') : t('lookingGood');
}

function getNetRiskWhy(n) {
  const parts = [];
  if (n.pw === 'no') parts.push(t('netRiskWhyNoPw'));
  if (n.encrypted === 'no') parts.push(t('netRiskWhyNoEnc'));
  if (parts.length === 0) return t('netRiskWhyGood');
  return parts.join(' ');
}

// ─── 3-2-1 Backup tracker (Owner-only) ──────────────────────────────────────
// Tracks whether the farm follows the 3-2-1 backup rule:
//   1. Primary copy (on farm computer/server)
//   2. Second copy in a different format (external drive, NAS, separate cloud)
//   3. One copy offsite (cloud backup like Backblaze, or a drive kept off-farm)
// Also tracks when the backups were last verified to actually work.
var farmBackup = {
  hasPrimary:    false,  // Copy 1: primary on-farm copy
  hasSecondary:  false,  // Copy 2: second format
  hasOffsite:    false,  // Copy 3: offsite
  lastVerified:  '',     // ISO date the backups were last tested/confirmed
  primaryNote:   '',     // e.g. "Farm PC + Time Machine on external drive"
  secondaryNote: '',     // e.g. "Synology NAS in barn office"
  offsiteNote:   '',     // e.g. "Backblaze B2 cloud, auto-nightly"
  notes:         ''
};

// 90-day staleness threshold for backup verification (more lenient than the
// 6-month app-review threshold since backups should ideally be tested quarterly).
function isBackupVerifyStale() {
  if (!farmBackup.lastVerified) return false;
  var last = new Date(farmBackup.lastVerified);
  if (isNaN(last.getTime())) return false;
  var ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return last < ninetyDaysAgo;
}

// Risk logic:
//  red    — any of the three copies is missing
//  yellow — all three copies exist but never verified, or verification is stale
//  green  — all three copies + verified within 90 days
function getBackupRisk() {
  if (!farmBackup.hasPrimary || !farmBackup.hasSecondary || !farmBackup.hasOffsite) return 'red';
  if (!farmBackup.lastVerified || isBackupVerifyStale()) return 'yellow';
  return 'green';
}

function getBackupRiskLabel() { return getBackupRisk() === 'green' ? t('lookingGood') : getBackupRisk() === 'yellow' ? t('takeAction') : t('actNowBadge'); }

function getBackupRiskWhy() {
  var r = getBackupRisk();
  if (r === 'red') {
    var missing = [];
    if (!farmBackup.hasPrimary)   missing.push(t('backup321Copy1Short'));
    if (!farmBackup.hasSecondary) missing.push(t('backup321Copy2Short'));
    if (!farmBackup.hasOffsite)   missing.push(t('backup321Copy3Short'));
    return t('backupRiskWhyMissing').replace('{copies}', missing.join(', '));
  }
  if (!farmBackup.lastVerified) return t('backupRiskWhyNeverVerified');
  if (isBackupVerifyStale())    return t('backupRiskWhyStale');
  return t('backupRiskWhyGood');
}

function getBackupRecAction() {
  var r = getBackupRisk();
  if (r === 'red')    return t('backupRecActionRed');
  if (r === 'yellow' && !farmBackup.lastVerified) return t('backupRecActionNeverVerified');
  if (r === 'yellow') return t('backupRecActionStale');
  return t('backupRecActionGood');
}

function canSeeBackups() { return currentUser.role === 'Owner'; }

// ─── Apps inventory (Owner-only) ────────────────────────────────────────────
// Tracks third-party apps/services the farm uses (accounting, herd management,
// equipment dealer portals, payroll, etc.) so the Owner can keep an eye on
// what has access to farm data and whether each one has had a security review.
var apps = [
  { id: 1, archived: false, name: 'QuickBooks Online', vendor: 'Intuit', purpose: 'Farm accounting & payroll', accountOwner: 'Angus MacDonald', mfaEnabled: 'yes', pwManagerUsed: 'yes', pwManagerName: 'Bitwarden', renewal: 'Annual — $35/mo, renews Jan 2027', reviewed: 'yes', flaggedInsecure: false, lastReviewedDate: '2026-04-02', notes: '' },
  { id: 2, archived: false, name: 'Climate FieldView', vendor: 'Bayer', purpose: 'Field mapping & crop data', accountOwner: 'Angus MacDonald', mfaEnabled: 'yes', pwManagerUsed: 'yes', pwManagerName: 'Bitwarden', renewal: 'Free tier', reviewed: 'yes', flaggedInsecure: false, lastReviewedDate: '2025-09-15', notes: '' },
  { id: 3, archived: false, name: 'Dealer equipment portal', vendor: 'John Deere Operations Center', purpose: 'Equipment diagnostics & service history', accountOwner: '', mfaEnabled: 'no', pwManagerUsed: 'no', pwManagerName: '', renewal: '', reviewed: 'no', flaggedInsecure: false, lastReviewedDate: '', notes: 'Shared login used by multiple staff — needs review' }
];
var nextAppId = 4;

// Common apps/services for the add-app picker, grouped by category — mirrors
// the brand/type picker pattern used for devices and networks. "Other" falls
// back to a free-text field.
var APP_CATALOG = [
  { group: 'Accounting & payroll', items: ['QuickBooks Online', 'FreshBooks', 'Gusto', 'ADP'] },
  { group: 'Equipment & dealer portals', items: ['John Deere Operations Center', 'Case IH AFS Connect', 'AGCO Connect', 'CNH Industrial Portal'] },
  { group: 'Crop & field management', items: ['Climate FieldView', 'Granular', 'Trimble Ag Software', 'AgLeader SMS'] },
  { group: 'Livestock management', items: ['DeLaval DelPro', 'Allflex', 'CattleMax', 'Herdwatch'] }
];

// Apps risk mirrors network risk in shape (red/yellow/green) but is driven by
// review status and MFA rather than password/encryption flags:
//  - red: never reviewed, flagged insecure, or MFA not enabled
//  - yellow: reviewed and MFA-enabled but stale (6+ months since last review)
//  - green: reviewed recently, MFA enabled, and not flagged
function isAppReviewStale(a) {
  if (!a.lastReviewedDate) return false;
  var last = new Date(a.lastReviewedDate);
  if (isNaN(last.getTime())) return false;
  var sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return last < sixMonthsAgo;
}

function getAppRisk(a) {
  if (a.flaggedInsecure) return 'red';
  if (a.reviewed !== 'yes' || !a.lastReviewedDate) return 'red';
  if (a.mfaEnabled !== 'yes') return 'red';
  if (isAppReviewStale(a)) return 'yellow';
  return 'green';
}

function getAppRiskLabel(r) {
  return r === 'red' ? t('actNowBadge') : r === 'yellow' ? t('takeAction') : t('lookingGood');
}

function getAppRiskWhy(a) {
  if (a.flaggedInsecure) return t('appRiskWhyFlagged');
  if (a.reviewed !== 'yes' || !a.lastReviewedDate) return t('appRiskWhyNeverReviewed');
  if (a.mfaEnabled !== 'yes') return t('appRiskWhyNoMfa');
  if (isAppReviewStale(a)) return t('appRiskWhyStale');
  return t('appRiskWhyGood');
}

