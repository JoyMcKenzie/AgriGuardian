/* AgriGuardian i18n: setLang UI refresh
 *
 * This used to be ~330 lines of hand-maintained `safeSet('someId', t('someKey'))`
 * calls — one per element. That list drifted out of sync with the HTML (dozens of
 * dead ids, whole dropdowns never listed), which is exactly why translation kept
 * "half working". It is now replaced by a single declarative sweep: every
 * text-bearing element in index.html carries a data-i18n* attribute, and
 * applyI18n(document) translates all of them at once. New UI can never be
 * forgotten again — if it has a data-i18n attribute it is translated, and if it
 * doesn't it is (intentionally) on the allowlist.
 *
 * Only genuinely dynamic things are handled explicitly below:
 *   - syncing the two language <select> values
 *   - the build timestamp (a computed value, not a dictionary string)
 *   - the invite hint, whose translated text has an interpolated highlighted code
 *   - re-running the JS render functions that rebuild list/detail/settings DOM,
 *     each of which now calls applyI18n(container) on its own output too.
 */
function setLang(lang, context) {
  currentLang = lang;
  if (currentUser && currentUser.loggedIn && typeof persistPreferences === 'function') persistPreferences(); // auto-save language as default

  // 1) Translate every statically-annotated element in the whole document.
  applyI18n(document);

  // 2) Keep both language pickers showing the active language.
  var dd = document.getElementById('lang-dropdown'); if (dd) dd.value = lang;
  var ldd = document.getElementById('login-lang-dropdown'); if (ldd) ldd.value = lang;

  // 3) Computed build-stamp (not a dictionary string).
  applyBuildTimestamp();

  // 4) Invite hint: translated sentence with a highlighted demo code spliced in.
  var invHint = document.getElementById('lbl-invite-demo-hint');
  if (invHint) {
    invHint.innerHTML = t('inviteDemoHint').replace('987654',
      '<strong style="background:#FFFFFF;padding:2px 8px;border-radius:6px;border:1px solid #E2EFE8;letter-spacing:2px">987654</strong>');
  }

  // 5) Re-render dynamic app content so newly-built DOM is in the active language.
  //    (Each render function calls applyI18n() on its own output, and inline t()
  //    for computed strings, so this simply regenerates them under `lang`.)
  if (context !== 'login' && currentUser && currentUser.loggedIn) {
    if (typeof renderDashList === 'function') renderDashList();
    if (typeof renderDeviceList === 'function') renderDeviceList();
    if (typeof renderNetworkList === 'function') renderNetworkList();

    // Team-member picker placeholder (rebuilt content lives outside the static pass).
    var tmSelect = document.getElementById('team-member-select');
    if (tmSelect) {
      var firstOpt = tmSelect.querySelector('option[value=""]');
      if (firstOpt) firstOpt.textContent = t('selectTeamMember');
    }

    // Re-open any device/network detail view so its dynamic content switches too.
    var detailContent = document.getElementById('detail-content');
    if (detailContent && detailContent.getAttribute('data-device-id') && typeof showDetail === 'function') {
      showDetail(parseInt(detailContent.getAttribute('data-device-id'), 10), true);
    }
    var netContent = document.getElementById('net-detail-content');
    if (netContent && netContent.getAttribute('data-net-id') && typeof showNetDetail === 'function') {
      showNetDetail(parseInt(netContent.getAttribute('data-net-id'), 10), true);
    }

    // Apps + Backups screens (Owner-only) are also dynamically built — refresh
    // them so a language switch while viewing those tabs updates immediately.
    if (typeof renderAppsList === 'function') renderAppsList();
    if (typeof renderBackupScreen === 'function') renderBackupScreen();
    var appContent = document.getElementById('app-detail-content');
    if (appContent && appContent.getAttribute('data-app-id') && typeof showAppDetail === 'function') {
      showAppDetail(parseInt(appContent.getAttribute('data-app-id'), 10), true);
    }

    // Settings rebuilds team list, audit log, permission labels, dropdowns.
    if (typeof renderSettings === 'function') renderSettings();
  }
}

// Run the translation sweep once on initial load so the dictionary is the single
// source of truth even before the user touches the language picker.
document.addEventListener('DOMContentLoaded', function () { applyI18n(document); });
