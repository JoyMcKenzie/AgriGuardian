/* AgriGuardian: login steps and enter app */
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

function toggleRegTimezone(role) {
  const tzGroup = document.getElementById('reg-timezone-group');
  if (tzGroup) tzGroup.style.display = role === 'Owner' ? 'block' : 'none';
}

function showStep(step) {
  ['choice','register','signin','code','invite'].forEach(s => {
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
    safeLogin('lbl-demo-card3-title', t('loginDemoCard3Title'));
    safeLogin('lbl-demo-card3-desc', t('loginDemoCard3Desc'));
    safeLogin('welcome-title', t('loginWelcomeTitle'));
    safeLogin('welcome-sub', t('loginWelcomeSub'));
    safeLogin('btn-create', t('loginCreateBtn'));
    safeLogin('btn-signin-choice', t('loginSigninBtn'));
    safeLogin('btn-invite-choice', t('loginHaveInviteBtn'));
  }
  if (step === 'register') {
    safeLogin('lbl-reg-tz', t('loginFarmTz'));
    safeLogin('lbl-reg-pass', t('loginPassword'));
    safeLogin('lbl-reg-pass-hint-text', t('loginPassHint'));
    safeLogin('btn-back-register', t('loginBack'));
    safeLogin('lbl-reg-email', t('loginEmail'));
    safeLogin('lbl-reg-email-note', t('loginOptionalReport'));
    safePh('reg-name', t('loginNamePlaceholder'));
    safePh('reg-farm', t('loginFarmPlaceholder'));
    safePh('reg-pass', t('loginPassPlaceholderHint'));
    safePh('reg-phone', t('loginPhonePlaceholderHint'));
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
    safeLogin('lbl-invite-farmhand', t('inviteRoleFarmhand'));
    safeLogin('lbl-invite-farmhand-desc', t('inviteFarmhandDesc'));
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
  // Timezone always shown for new account creation (Owner only creates accounts)
  if (step === 'register') {
    const tzGroup = document.getElementById('reg-timezone-group');
    if (tzGroup) tzGroup.style.display = 'block';
  }
}

// The generic demo invite code. In a real app each invite generates a unique token.
var DEMO_INVITE_CODE = '987654';
// Demo profile attached to the invite code. Updated when the owner sends an invite.
var demoInviteProfile = { name: 'Sarah Tully', phone: '(555) 014-2208', role: 'Farm Hand' };

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
  var profile = demoInviteProfile || { name: 'Sarah Tully', phone: '(555) 014-2208', role: 'Farm Hand' };
  var nameField = document.getElementById('invite-name');
  var phoneField = document.getElementById('invite-phone');
  if (nameField) { nameField.value = profile.name; nameField.readOnly = true; }
  if (phoneField) { phoneField.value = profile.phone; phoneField.readOnly = true; }
  // Pre-select the role the owner assigned (if it matches one of the demo options).
  document.querySelectorAll('input[name="invite-role"]').forEach(function(r) {
    r.checked = (r.value === profile.role);
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
  // Demo invite registrations are view-only regardless of role chosen
  var perms = { addDevices: false, archiveDelete: false, resolveIssues: false, assignIssues: false, exportReports: false, viewOnly: true };
  // Add to teamMembers so they appear in the team list
  teamMembers.push({ phone: phone, name: name, role: role, status: 'Active', archived: false, perms: perms, demoPassword: pass });
  // Sign them in
  currentUser = { phone: phone, name: name, role: role, farm: 'Old McDonald\'s Farm', email: '', loggedIn: true, isInviteDemo: true };
  logAction('Joined via invite', name + ' joined as ' + role + ' (demo — view only)');
  _enterApp();
}

// One-tap sign-in as a pre-made demo team member (full permissions per their role)
function signInAsDemoMember(who) {
  // Owner is not in teamMembers — synthesize from the prefilled registration values.
  if (who === 'angus') {
    currentUser = {
      phone: '(555) 123-4567', name: 'Angus MacDonald', role: 'Owner',
      farm: "Old McDonald's Farm", email: 'angus@oldmcdonaldsfarm.demo',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      loggedIn: true, isDemoMember: true
    };
    logAction('Demo sign-in', 'Angus MacDonald (Owner)');
    _enterApp();
    return;
  }
  var lookup = { carlos: 'Carlos Mendez', sarah: 'Sarah Tully', jamie: 'Jamie Ortiz' };
  var member = teamMembers.find(function(m){ return m.name === lookup[who]; });
  if (!member) { alert('Demo member not found.'); return; }
  currentUser = {
    phone: member.phone, name: member.name, role: member.role,
    farm: 'Old McDonald\'s Farm', email: '', loggedIn: true, isDemoMember: true
  };
  logAction('Demo sign-in', member.name + ' (' + member.role + ')');
  _enterApp();
}

// Shared login completion — used by both joinFarm() and signInAsDemoMember()
function _enterApp() {
  document.getElementById('login-wrapper').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
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
  var appLangDd = document.getElementById('lang-dropdown');
  var loginLangDd = document.getElementById('login-lang-dropdown');
  if (appLangDd && loginLangDd) appLangDd.value = loginLangDd.value;
  setLang(currentLang, 'app');
  startSessionTimeout();
  // Always land on the dashboard after sign-in, regardless of the previously active screen.
  try { showScreen('dashboard', document.querySelector('.nav-btn')); } catch(e) {}
}

