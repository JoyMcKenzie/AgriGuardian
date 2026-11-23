/* AgriGuardian — demo-panel.js
   Keeps the phone frame showing only real app screens. Everything that is
   about the demo itself (how to explore, demo accounts, demo codes, notes
   about the production system, the build stamp) is moved out of the phone
   into a panel on the page: beside the phone on wide screens, below it on
   narrow ones. Elements are moved, not copied, so their ids, onclick
   handlers and data-i18n translations keep working unchanged. */

function _demoMove(el, target) {
  if (el && target) target.appendChild(el);
  return el;
}

function _demoSection(panel, titleKey, titleText) {
  var sec = document.createElement('section');
  sec.className = 'demo-panel-section';
  if (titleKey) {
    var h = document.createElement('h2');
    h.className = 'demo-panel-heading';
    h.setAttribute('data-i18n', titleKey);
    h.textContent = (typeof t === 'function' && t(titleKey) !== titleKey) ? t(titleKey) : titleText;
    sec.appendChild(h);
  }
  panel.appendChild(sec);
  return sec;
}

// The box that wraps an element (its nearest ancestor <div>).
function _demoBoxOf(id) {
  var el = document.getElementById(id);
  return (el && el.parentElement) ? el.parentElement.closest('div') : null;
}

function buildDemoPanel() {
  var shell = document.getElementById('device-shell');
  if (!shell || document.getElementById('demo-panel')) return;
  var layout = shell.parentElement;
  layout.classList.add('demo-layout');

  // Keep the phone's home-indicator bar on the phone when the page becomes
  // two columns.
  var homeBar = document.querySelector('.device-home-indicator');
  if (homeBar && homeBar.parentElement !== shell) shell.appendChild(homeBar);

  // Short pointer for narrow screens, where the panel sits below the phone.
  var hint = document.createElement('p');
  hint.id = 'demo-below-hint';
  hint.setAttribute('data-i18n', 'demoBelowHint');
  hint.textContent = (typeof t === 'function') ? t('demoBelowHint') : 'Demo accounts and instructions are below the app.';
  layout.insertBefore(hint, shell);

  var panel = document.createElement('aside');
  panel.id = 'demo-panel';
  panel.setAttribute('aria-label', 'About this demo');
  layout.appendChild(panel);

  // 1. About this demo: the page note.
  var about = _demoSection(panel, 'demoPanelTitle', 'About this demo');
  _demoMove(document.getElementById('canvas-footnote'), about);

  // 2. How to explore, with the build stamp.
  var explore = _demoSection(panel);
  _demoMove(document.getElementById('demo-box'), explore);

  // 3. Demo accounts (tap to fill), with the note about their passwords.
  var accounts = _demoSection(panel);
  var membersBox = _demoBoxOf('lbl-demo-members-title');
  _demoMove(membersBox, accounts);
  var pwNote = document.getElementById('lbl-signin-pw-hygiene-note');
  if (membersBox && pwNote) membersBox.insertBefore(pwNote, membersBox.children[2] || null);

  // 4. Demo codes: verification code, invite code, locked invite password.
  var codes = _demoSection(panel, 'demoPanelCodesTitle', 'Demo codes');
  var codeLine = document.querySelector('#step-code [data-i18n="demoCodeLine"]');
  if (codeLine) { codeLine.className = 'demo-code-line'; _demoMove(codeLine, codes); }
  _demoMove(_demoBoxOf('lbl-invite-demo-hint-title'), codes);
  _demoMove(document.getElementById('lbl-invite-pw-hygiene-note'), codes);

  // 5. About this prototype: notes on how the production system will work.
  var proto = _demoSection(panel, 'demoPanelProtoTitle', 'About this prototype');
  var protoLabel = document.querySelector('#screen-settings [data-i18n="protoLabel"]');
  if (protoLabel) { protoLabel.className = 'demo-proto-label'; _demoMove(protoLabel, proto); }
  _demoMove(_demoBoxOf('lbl-pw-rules-label'), proto);
  _demoMove(_demoBoxOf('lbl-nvd-title'), proto);

  // Tapping a demo account from the panel always lands on a fresh sign-in,
  // even if someone is already signed in, and brings the phone into view.
  if (typeof signInAsDemoMember === 'function' && !signInAsDemoMember._panelWrapped) {
    var original = signInAsDemoMember;
    signInAsDemoMember = function(who) {
      var main = document.getElementById('main-app');
      if (main && main.style.display !== 'none' && typeof logOut === 'function') logOut();
      original(who);
      if (window.matchMedia && window.matchMedia('(max-width: 899px)').matches) {
        shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    signInAsDemoMember._panelWrapped = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildDemoPanel);
} else {
  buildDemoPanel();
}
