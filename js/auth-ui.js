/* AgriGuardian: login steps and enter app */

// Shared show/hide toggle for any password field. Used by sign-in, invite,
// and password-reset fields — one function instead of one-off copies.
function togglePwVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) { icon.classList.remove('ti-eye'); icon.classList.add('ti-eye-off'); }
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    if (icon) { icon.classList.remove('ti-eye-off'); icon.classList.add('ti-eye'); }
    btn.setAttribute('aria-label', 'Show password');
  }
}

// Tap-to-copy for demo passwords shown on the Sign In screen. Callers must
// pass event.stopPropagation() first (the whole card fills the sign-in form
// on tap) so tapping the password copies it instead of filling the fields.
function copyDemoPassword(el, pwd) {
  var orig = el.textContent;
  var revert = function() { setTimeout(function() { el.textContent = orig; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pwd).then(function() {
      el.textContent = 'Copied!';
      revert();
    }).catch(function() {
      el.textContent = 'Copy failed';
      revert();
    });
  } else {
    el.textContent = 'Copy failed';
    revert();
  }
}

function saveHealth(id, silent) {
  const d = devices.find(x => x.id === id);
  if (!d) return;
  const sel = document.querySelector('input[name="health-' + id + '"]:checked');
  if (!sel) { return false; }
  const prev = d.healthStatus || '';
  d.healthStatus = sel ? sel.value : '';
  d.healthNote = d.resolveNote || '';
  d.healthDate = localTimestamp();
  if (!silent) {
    if (prev !== d.healthStatus) {
      logAction('Update health recorded', (d.label||d.type) + ' (' + d.brand + ') — ' + d.healthStatus);
    }
    renderDashList(); renderDeviceList(); showDetail(id);
  }
  return true;
}

function showStep(step) {
  ['choice','signin','code','invite','reset'].forEach(s => {
    const el = document.getElementById('step-' + s);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('step-' + step);
  if (target) target.style.display = 'block';
  // Always update login labels with current language when showing any step
  const safeLogin = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const safePh = (id, val) => { const el = document.getElementById(id); if(el) el.placeholder = val; };
  if (step === 'choice') {
    safeLogin('lbl-demo-title', 'ⓘ ' + t('loginDemoTitle'));
    safeLogin('lbl-last-updated', t('loginLastUpdated'));
    safeLogin('lbl-demo-subtitle', t('loginDemoSubTitle'));
    safeLogin('lbl-demo-card1-title', t('loginDemoCard1Title'));
    safeLogin('lbl-demo-card1-desc', t('loginDemoCard1Desc'));
    safeLogin('lbl-demo-card2-title', t('loginDemoCard2Title'));
    safeLogin('lbl-demo-card2-desc', t('loginDemoCard2Desc'));
    safeLogin('welcome-title', t('loginWelcomeTitle'));
    safeLogin('welcome-sub', t('loginWelcomeSub'));
    safeLogin('btn-signin-choice', t('loginSigninBtn'));
    safeLogin('btn-invite-choice', t('loginHaveInviteBtn'));
  }
  if (step === 'signin') {
    safeLogin('lbl-phone', t('loginYourPhone'));
    safeLogin('lbl-pass', t('loginPasswordLabel'));
    safeLogin('signin-title', t('loginSigninTitle'));
    safeLogin('signin-sub', t('loginSigninSub'));
    safeLogin('btn-back-signin', t('loginBack'));
    safeLogin('lbl-demo-members-title', t('demoMembersTitle'));
    safeLogin('lbl-demo-members-sub', t('demoMembersSub'));
    safeLogin('lbl-carlos-desc', t('carlosDesc'));
    safeLogin('lbl-jamie-desc', t('jamieDesc'));
    safeLogin('lbl-signin-pw-hygiene-note-text', t('signinPwHygieneNote'));
    safePh('pass-input', t('loginSigninPassPlaceholder'));
    safePh('phone-input', t('loginPhonePlaceholderHint'));
  }
  if (step === 'invite') {
    safeLogin('lbl-invite-title', t('inviteTitle'));
    safeLogin('lbl-invite-sub', t('inviteSub'));
    safeLogin('lbl-invite-code-label', t('inviteCodeLabel'));
    safeLogin('btn-validate-code', t('inviteContinueBtn'));
    safeLogin('lbl-invite-accepted', t('inviteAccepted'));
    safeLogin('lbl-invite-your-name', t('inviteYourName'));
    safeLogin('lbl-invite-your-phone', t('inviteYourPhone'));
    safeLogin('lbl-invite-role-label', t('inviteRoleLabel'));
    safeLogin('lbl-invite-manager', t('inviteRoleManager'));
    safeLogin('lbl-invite-manager-desc', t('inviteManagerDesc'));
    safeLogin('lbl-invite-technician', t('inviteRoleTechnician'));
    safeLogin('lbl-invite-technician-desc', t('inviteTechnicianDesc'));
    safeLogin('lbl-invite-farmhand', t('inviteRoleFarmhand'));
    safeLogin('lbl-invite-farmhand-desc', t('inviteFarmhandDesc'));
    safeLogin('lbl-invite-pw-hygiene-note-text', t('invitePwHygieneNote'));
    safeLogin('lbl-invite-readonly-note', t('inviteReadonlyNote'));
    safeLogin('btn-join-farm', t('inviteJoinBtn'));
    safeLogin('lbl-invite-demo-hint-title', t('inviteDemoHintTitle'));
    safeLogin('btn-back-invite', t('inviteBackBtn'));
    safeLogin('lbl-btn-invite', t('inviteBtn'));
    safePh('invite-name', t('loginNamePlaceholder'));
    safePh('invite-phone', t('loginPhonePlaceholderHint'));
    safePh('invite-code-input', t('inviteCodePlaceholder'));
    // Demo hint body has a hardcoded code badge — rebuild it
    const hintEl = document.getElementById('lbl-invite-demo-hint');
    if (hintEl) hintEl.innerHTML = t('inviteDemoHint').replace('987654', '<strong style="background:#fff;padding:2px 8px;border-radius:6px;border:1px solid #C8E6C9;letter-spacing:2px">987654</strong>');
  }
  if (step === 'code') {
    safeLogin('lbl-code-label', t('loginCode'));
    safeLogin('lbl-code-sent', t('loginVerificationSent'));
    safeLogin('btn-back-code', t('loginBack'));
    safeLogin('btn-verify-signin', t('loginVerifyBtn'));
  }
  if (step === 'reset') {
    safeLogin('lbl-reset-pw-hygiene-note-text', t('resetPwHygieneNote'));
  }
}

// The generic demo invite code. In a real app each invite generates a unique token.
var DEMO_INVITE_CODE = '987654';
// Demo profile attached to the invite code. Updated when the owner sends an invite.
var demoInviteProfile = { name: 'Casey Aitch', phone: '(555) 887-3321', role: 'Technician' };

function validateInviteCode() {
  var code = (document.getElementById('invite-code-input').value || '').trim().toUpperCase();
  var errEl = document.getElementById('invite-error');
  var confirmedEl = document.getElementById('invite-confirmed');
  var profileEl = document.getElementById('invite-profile-fields');
  var continueBtn = document.getElementById('btn-validate-code');
  if (code !== DEMO_INVITE_CODE) {
    if (errEl) errEl.style.display = 'block';
    if (confirmedEl) confirmedEl.style.display = 'none';
    if (profileEl) profileEl.style.display = 'none';
    return;
  }
  if (errEl) errEl.style.display = 'none';
  if (confirmedEl) { confirmedEl.style.display = 'flex'; }
  if (profileEl) profileEl.style.display = 'block';
  if (continueBtn) continueBtn.style.display = 'none';
  // Pre-fill the name and phone the owner entered when sending this invite (demo).
  // These fields are locked because the owner already set them.
  var profile = demoInviteProfile || { name: 'Casey Aitch', phone: '(555) 887-3321', role: 'Technician' };
  var nameField = document.getElementById('invite-name');
  var phoneField = document.getElementById('invite-phone');
  if (nameField) { nameField.value = profile.name; nameField.readOnly = true; }
  if (phoneField) { phoneField.value = profile.phone; phoneField.readOnly = true; }
  // Pre-select AND lock the role the owner assigned — matches name/phone
  // being locked. The role is decided by whoever sent the invite, not by
  // the person accepting it.
  document.querySelectorAll('input[name="invite-role"]').forEach(function(r) {
    r.checked = (r.value === profile.role);
    r.disabled = true;
  });
}

function joinFarm() {
  var name = (document.getElementById('invite-name').value || '').trim();
  var phone = (document.getElementById('invite-phone').value || '').trim();
  var passEl = document.getElementById('invite-pass');
  var pass2El = document.getElementById('invite-pass2');
  var pass = passEl ? passEl.value : '';
  var pass2 = pass2El ? pass2El.value : '';
  var roleEl = document.querySelector('input[name="invite-role"]:checked');
  if (!name || !phone) { alert(t('inviteFillName')); return; }
  if (!pass || pass.length < 8) { alert('Please create a password with at least 8 characters.'); return; }
  if (pass !== pass2) { alert('Passwords do not match.'); return; }
  if (!roleEl) { alert(t('invitePickRole')); return; }
  var role = roleEl.value;
  var perms = defaultPermsForRole(role);
  // The normal case: the Owner already created a pending ('Invited') record
  // for this phone number via inviteMember(). Update it in place rather than
  // pushing a second entry — otherwise the same person ends up listed twice,
  // once pending and once active.
  var existing = teamMembers.find(function(m) { return m.phone === phone; });
  if (existing) {
    existing.status = 'Active';
    existing.perms = perms;
    existing.demoPassword = pass;
  } else {
    teamMembers.push({ phone: phone, name: name, role: role, status: 'Active', archived: false, perms: perms, demoPassword: pass });
  }
  // Sign them in
  currentUser = { phone: phone, name: name, role: role, farm: 'Old McDonald\'s Farm', email: '', loggedIn: true, isInviteDemo: true };
  logAction('Joined via invite', name + ' joined as ' + role);
  _enterApp();
}

// One-tap sign-in as a pre-made demo team member (full permissions per their role)
// Pre-fills the manual sign-in form with a demo account's real credentials.
// The person still clicks "Send MFA code" and enters the verification code
// themselves — going through the exact same flow as typing it in by hand.
// Deliberately NOT a bypass: a one-tap button that skips MFA entirely would
// undercut the thing this app exists to demonstrate.
function signInAsDemoMember(who) {
  var lookup = { angus: '(555) 123-4567', carlos: '(555) 201-3344', sarah: '(555) 442-7781', jamie: '(555) 309-6612', joni: '(555) 014-2208' };
  var phone = lookup[who];
  if (!DEMO_CREDENTIALS[phone]) { alert('Demo member not found.'); return; }
  showStep('signin');
  var phoneEl = document.getElementById('phone-input');
  var passEl = document.getElementById('pass-input');
  if (phoneEl) phoneEl.value = phone;
  if (passEl) passEl.value = DEMO_CREDENTIALS[phone];
}

// Shared login completion — used by verifyCode() (manual sign-in, including
// pre-filled demo accounts) and joinFarm() (invite acceptance).
function _enterApp() {
  document.getElementById('login-wrapper').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  loadMyPreferences();
  document.getElementById('header-farm').textContent = currentUser.farm || '';
  // Show role badge for non-owners
  var badge = document.getElementById('header-role-badge');
  if (badge) {
    if (currentUser.role && currentUser.role !== 'Owner') {
      badge.textContent = currentUser.role + (currentPerms().viewOnly ? ' · ' + t('viewOnlyBadge') : '');
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  // Apps inventory tab is Owner-only.
  var appsNavBtn = document.getElementById('nav-btn-apps');
  if (appsNavBtn) appsNavBtn.style.display = canSeeApps() ? '' : 'none';
  var backupsNavBtn = document.getElementById('nav-btn-backups');
  if (backupsNavBtn) backupsNavBtn.style.display = canSeeBackups() ? '' : 'none';
  var networkNavBtn = document.getElementById('nav-btn-network');
  if (networkNavBtn) networkNavBtn.style.display = canSeeNetworkIssue() ? '' : 'none';
  var appLangDd = document.getElementById('lang-dropdown');
  if (appLangDd) appLangDd.value = currentLang;
  setLang(currentLang, 'app');
  startSessionTimeout();
  // Always land on the dashboard after sign-in, regardless of the previously active screen.
  try { showScreen('dashboard', document.querySelector('.nav-btn')); } catch(e) {}
}

