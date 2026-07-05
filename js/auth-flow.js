/* AgriGuardian: sign-in MFA send */

// Demo account passwords — one distinct password per account, matching what's
// shown on the Sign In screen. Deliberately not reused across accounts:
// reusing one password everywhere is exactly the practice this app exists to
// discourage, so the demo shouldn't model it either.
var DEMO_CREDENTIALS = {
  '(555) 123-4567': 'meadow-sunrise-owner8',
  '(555) 201-3344': 'harvest-tractor-lead4',
  '(555) 442-7781': 'wrench-fieldwork-tech6',
  '(555) 309-6612': 'chores-morning-hand2',
  '(555) 014-2208': 'toolkit-morning-tech3'
};

// Resolves a demo phone number to {name, role, email}. Owner is a special
// case (not in teamMembers); everyone else is looked up live so a role
// change made during the demo session is reflected correctly here too.
// Only called from sendCode() — the demo profile buttons no longer bypass
// this; they pre-fill the sign-in form and go through the same check.
function resolveDemoAccount(phone) {
  if (phone === '(555) 123-4567') {
    return { name: 'Angus MacDonald', role: 'Owner', email: 'angus@oldmcdonaldsfarm.demo' };
  }
  var member = teamMembers.find(function(m) { return m.phone === phone; });
  if (!member) return null;
  return { name: member.name, role: member.role, email: '' };
}

// Strips everything but digits, so "5551234567", "(555) 123-4567", and
// "555-123-4567" are all treated as the same number for matching purposes.
function normalizePhone(p) {
  return (p || '').replace(/\D/g, '');
}

function sendCode() {
  const phoneRaw = document.getElementById('phone-input').value.trim();
  const pass = document.getElementById('pass-input').value.trim();
  if (!phoneRaw || !pass) { alert('Please enter your phone number and password.'); return; }
  const normalized = normalizePhone(phoneRaw);
  const phone = Object.keys(DEMO_CREDENTIALS).find(function(p) { return normalizePhone(p) === normalized; });
  if (!phone || DEMO_CREDENTIALS[phone] !== pass) {
    alert('Phone number or password not recognized. Use one of the demo accounts shown below, or tap a profile to fill them in automatically.');
    return;
  }
  const account = resolveDemoAccount(phone);
  if (!account) { alert('Demo account not found.'); return; }
  currentUser.phone = phone;
  currentUser.name = account.name;
  currentUser.role = account.role;
  currentUser.farm = "Old McDonald's Farm";
  currentUser.email = account.email || '';
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

