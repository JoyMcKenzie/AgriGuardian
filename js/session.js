/* AgriGuardian: session timeout and verify */
let timeoutTimer = null;
let countdownTimer = null;
var SESSION_TIMEOUT = 5 * 60; // 5 minutes in seconds — demo friendly
const WARNING_AT = 60; // show warning at 60 seconds remaining
let secondsLeft = SESSION_TIMEOUT;

function startSessionTimeout() {
  clearTimeout(timeoutTimer);
  clearInterval(countdownTimer);
  secondsLeft = SESSION_TIMEOUT;
  document.getElementById('timeout-banner').style.display = 'none';
  // Start countdown to warning
  timeoutTimer = setTimeout(function() {
    // Show warning banner
    document.getElementById('timeout-banner').style.display = 'flex';
    document.getElementById('timeout-count').textContent = WARNING_AT;
    secondsLeft = WARNING_AT;
    countdownTimer = setInterval(function() {
      secondsLeft--;
      document.getElementById('timeout-count').textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(countdownTimer);
        logOut(true);
      }
    }, 1000);
  }, (SESSION_TIMEOUT - WARNING_AT) * 1000);
}

function resetTimeout() {
  document.getElementById('timeout-banner').style.display = 'none';
  startSessionTimeout();
}

function logOut(timedOut) {
  if (currentUser.loggedIn) logAction('Signed out', timedOut ? 'Session timeout' : 'Manual sign out');
  clearTimeout(timeoutTimer);
  clearInterval(countdownTimer);
  currentUser = { phone: '', role: '', farm: '', name: '', loggedIn: false };
  // Reset accessibility + language to universal default — these are
  // per-user preferences (see accessibility.js), not global session state,
  // so nothing from the last person's session should carry into the next.
  // (Just reset the state here; the next sign-in's loadMyPreferences() will
  // apply whatever's correct for whoever signs in next. No need to re-render
  // main-app here — it's about to be hidden anyway.)
  a11ySettings = { largeText: false, xlText: false, highContrast: false, colorBlind: false, reducedMotion: false };
  currentLang = 'en';
  document.body.classList.remove('reduced-motion', 'colorblind-mode');
  setLang(currentLang, 'login');
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-wrapper').style.display = 'block';
  const hRole = document.getElementById('header-role');
  if (hRole) hRole.textContent = '';
  const tb = document.getElementById('timeout-banner');
  if (tb) tb.style.display = 'none';
  // Always go back to welcome choice screen
  ['choice','signin','code','invite','reset'].forEach(s => {
    const el = document.getElementById('step-' + s);
    if (el) el.style.display = 'none';
  });
  const choiceEl = document.getElementById('step-choice');
  if (choiceEl) choiceEl.style.display = 'block';
  // Remove any timeout notice
  const notice = document.querySelector('.timeout-notice');
  if (notice) notice.remove();
  if (timedOut) {
    setTimeout(function() {
      // Show a subtle note on the login welcome screen
      const notice = document.createElement('p');
      notice.textContent = t('signedOutInactivity');
      notice.style.cssText = 'font-size:12px;color:#A32D2D;text-align:center;margin-top:12px';
      const choiceDiv = document.getElementById('step-choice');
      if (choiceDiv) {
        const existing = choiceDiv.querySelector('.timeout-notice');
        if (!existing) { notice.className = 'timeout-notice'; choiceDiv.appendChild(notice); }
      }
    }, 100);
  }
}

// Reset timeout on any user interaction
['click','keydown','touchstart'].forEach(function(evt) {
  document.addEventListener(evt, function() {
    if (currentUser.loggedIn) resetTimeout();
  }, { passive: true });
});

function sendResetCode() {
  const phone = document.getElementById('reset-phone').value.trim();
  if (!phone) { alert('Please enter your phone number.'); return; }
  // Demo: simulate sending code
  document.getElementById('step-reset-code').style.display = 'block';
  alert('Demo: A reset code has been sent to ' + phone + '. Use code: 123456');
}
function confirmReset() {
  const phone = document.getElementById('reset-phone').value.trim();
  const code = document.getElementById('reset-code-input').value.trim();
  const newPass = document.getElementById('reset-new-pass').value.trim();
  if (!code || !newPass) { alert('Please fill in all fields.'); return; }
  if (code !== '123456') { alert('Incorrect code. For this demo use: 123456'); return; }
  if (newPass.length < 8) { alert('Password must be at least 8 characters.'); return; }
  const normalized = normalizePhone(phone);
  const matchedPhone = Object.keys(DEMO_CREDENTIALS).find(function(p) { return normalizePhone(p) === normalized; });
  if (!matchedPhone) { alert('That phone number is not on file for this demo.'); return; }
  DEMO_CREDENTIALS[matchedPhone] = newPass;
  alert('Password updated successfully! Please sign in with your new password.');
  document.getElementById('step-reset-code').style.display = 'none';
  document.getElementById('reset-phone').value = '';
  document.getElementById('reset-code-input').value = '';
  document.getElementById('reset-new-pass').value = '';
  showStep('signin');
}

var failedAttempts = 0;
var lockoutUntil = 0;

function verifyCode() {
  const now = Date.now();
  if (now < lockoutUntil) {
    const remaining = Math.ceil((lockoutUntil - now) / 1000);
    alert(t('lockoutMsg').replace('{n}', remaining));
    return;
  }
  const code = document.getElementById('code-input').value.trim();
  if (!code) { alert(t('enterVerification')); return; }
  if (code !== '123456') {
    failedAttempts++;
    if (failedAttempts >= 5) {
      lockoutUntil = Date.now() + 300000;
      failedAttempts = 0;
      const banner = document.getElementById('lockout-banner');
      if (banner) { banner.style.display = 'block'; }
      let secs = 300;
      const countdown = setInterval(() => {
        secs--;
        const el = document.getElementById('lockout-countdown');
        if (el) el.textContent = secs;
        const secEl = document.getElementById('lbl-lockout-seconds');
        if (secEl) secEl.textContent = secs < 60 ? t('lockoutSeconds') : t('lockoutMinutes');
        if (secs <= 0) {
          clearInterval(countdown);
          if (banner) banner.style.display = 'none';
        }
      }, 1000);
      return;
    }
    const remaining = 5 - failedAttempts;
    alert(t('incorrectCode') + ' (' + remaining + ' ' + (remaining===1?t('attemptsRemaining'):t('attemptsRemainingPlural')) + ')');
    return;
  }
  failedAttempts = 0;
  currentUser.loggedIn = true;
  logAction('Login', 'Signed in successfully');
  _enterApp();
}
