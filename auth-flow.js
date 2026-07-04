/* AgriGuardian: registration and MFA send */
function registerSendCode() {
  const name = document.getElementById('reg-name').value.trim();
  const farm = document.getElementById('reg-farm').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value.trim();
  const role = document.getElementById('reg-role').value;
  const email = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
  if (!name || !farm || !phone) { alert('Please fill in your name, farm name, and phone number.'); return; }
  if (!pass || pass.length < 8) { alert('Please create a password with at least 8 characters.'); return; }
  if (role === 'Owner' && !email) { alert(t('emailRequired')); return; }
  currentUser.name = name;
  currentUser.farm = farm;
  currentUser.phone = phone;
  currentUser.role = role;
  // Registration is the Owner-creation path; the email entered here is the
  // farm's report-delivery address (farm-level), not a per-user field.
  if (email) farmAccount.reportEmail = email;
  currentUser.timezone = document.getElementById('reg-timezone').value || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const btn = document.getElementById('reg-send-btn');
  btn.textContent = t('sending');
  btn.disabled = true;
  btn.style.background = '#888';
  setTimeout(function() {
    btn.textContent = t('loginRegSend');
    btn.disabled = false;
    btn.style.background = '';
    showStep('code');
    document.getElementById('code-msg').textContent = t('verificationSentTo') + phone + '. Enter it below to complete registration.';
  }, 1200);
}

function sendCode() {
  const phone = document.getElementById('phone-input').value.trim();
  const pass = document.getElementById('pass-input').value.trim();
  if (!phone || !pass) { alert('Please enter your phone number and password.'); return; }
  currentUser.phone = phone;
  const btn = document.getElementById('send-btn');
  btn.textContent = t('sending');
  btn.disabled = true;
  btn.style.background = '#888';
  setTimeout(function() {
    btn.textContent = t('loginSend');
    btn.disabled = false;
    btn.style.background = '';
    showStep('code');
    document.getElementById('code-msg').textContent = t('verificationSentTo') + phone + '. Enter it below to sign in.';
  }, 1200);
}
