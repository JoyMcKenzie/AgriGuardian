/* AgriGuardian: accessibility settings */
var a11ySettings = { largeText: false, xlText: false, highContrast: false, colorBlind: false, reducedMotion: false };

// Per-user saved preferences (accessibility + language), keyed by phone
// number — covers all five demo people, including Owner (who isn't in
// teamMembers). Defaults stay universal (everything off, English) until
// someone explicitly saves their own via "Save as my default" in Settings.
var userPreferences = {};

function loadMyPreferences() {
  var saved = currentUser.phone && userPreferences[currentUser.phone];
  if (saved) {
    a11ySettings = { largeText: !!saved.largeText, xlText: !!saved.xlText, highContrast: !!saved.highContrast, colorBlind: !!saved.colorBlind, reducedMotion: !!saved.reducedMotion };
    currentLang = saved.lang || 'en';
  } else {
    a11ySettings = { largeText: false, xlText: false, highContrast: false, colorBlind: false, reducedMotion: false };
    currentLang = 'en';
  }
  applyA11yUI();
}

function saveMyPreferences() {
  if (!currentUser.phone) return;
  userPreferences[currentUser.phone] = {
    largeText: a11ySettings.largeText, xlText: a11ySettings.xlText, highContrast: a11ySettings.highContrast,
    colorBlind: a11ySettings.colorBlind, reducedMotion: a11ySettings.reducedMotion, lang: currentLang
  };
  logAction('logSavedDefaultPrefs', { raw: currentUser.name || currentUser.phone });
  var btn = document.getElementById('btn-save-my-defaults');
  if (btn) {
    var orig = btn.textContent;
    btn.textContent = t('savedConfirm') || t('savedExclaim');
    setTimeout(function() { btn.textContent = orig; }, 1500);
  }
}


// Silent auto-persist of accessibility + language as this user's personal
// default. Called automatically whenever a setting changes (no Save button).
function persistPreferences() {
  if (!currentUser || !currentUser.phone) return;
  userPreferences[currentUser.phone] = {
    largeText: a11ySettings.largeText, xlText: a11ySettings.xlText, highContrast: a11ySettings.highContrast,
    colorBlind: a11ySettings.colorBlind, reducedMotion: a11ySettings.reducedMotion, lang: currentLang
  };
}

// Collapse every Settings section. Called on login so sections always start
// collapsed and never carry an expanded state across logout/login.
function resetSettingsSections() {
  ['sec-settings-farm','sec-settings-team','sec-settings-timezone','sec-settings-session','sec-settings-security','sec-a11y-section'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.sec-arrow').forEach(function(a){ a.textContent = '▸'; });
}
function toggleSettingsSection(id, btn) {
  const section = document.getElementById('sec-' + id);
  if (!section) return;
  const isOpen = section.style.display !== 'none';
  section.style.display = isOpen ? 'none' : 'block';
  btn.querySelector('.sec-arrow').textContent = isOpen ? '▸' : '▾';
}


function goToAccessibility() {
  showScreen('settings', document.querySelector('.nav-btn:last-child'));
  setTimeout(function() {
    // Expand the accessibility section if collapsed
    const content = document.getElementById('sec-a11y-section');
    if (content && content.style.display === 'none') {
      // Find the toggle button for this section and click it
      const anchor = document.getElementById('a11y-section');
      if (anchor && anchor.nextElementSibling) {
        const btn = anchor.nextElementSibling.querySelector('button');
        if (btn) toggleSettingsSection('a11y-section', btn);
      }
    }
    const section = document.getElementById('a11y-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

function toggleA11y(key) {
  a11ySettings[key] = !a11ySettings[key];
  applyA11yUI();
  persistPreferences(); // auto-save as personal default (no Save button)
}

function applyA11yUI() {
  const btnMap = { largeText:'btn-large-text', xlText:'btn-xl-text', highContrast:'btn-high-contrast', colorBlind:'btn-colorblind', reducedMotion:'btn-reduced-motion' };
  Object.keys(btnMap).forEach(function(key) {
    const btn = document.getElementById(btnMap[key]);
    if (btn) {
      btn.textContent = a11ySettings[key] ? t('onLabel') : t('offLabel');
      btn.style.background = a11ySettings[key] ? '#1F4D2E' : '#f0f0f0';
      btn.style.color = a11ySettings[key] ? '#fff' : '#555';
      btn.style.borderColor = a11ySettings[key] ? '#1F4D2E' : '#ddd';
    }
  });

  const app = document.getElementById('main-app');
  const body = document.body;

  // Remove any existing text scale style
  var existingStyle = document.getElementById('a11y-text-style');
  if (existingStyle) existingStyle.remove();
  if (a11ySettings.largeText || a11ySettings.xlText) {
    var scale = a11ySettings.xlText ? '1.45' : '1.2';
    var style = document.createElement('style');
    style.id = 'a11y-text-style';
    style.textContent = '#main-app { transform: scale(' + scale + '); transform-origin: top center; width: ' + (100/parseFloat(scale)) + '%; margin: 0 auto; }';
    document.head.appendChild(style);
  } else {
    app.style.transform = '';
    app.style.width = '';
  }

  // High contrast — inject full stylesheet
  var existingHC = document.getElementById('a11y-hc-style');
  if (existingHC) existingHC.remove();
  app.style.filter = '';
  if (a11ySettings.highContrast) {
    var hcStyle = document.createElement('style');
    hcStyle.id = 'a11y-hc-style';
    hcStyle.textContent = `
      #main-app { background: #fff !important; color: #000 !important; }
      #main-app .device-card { border: 3px solid #000 !important; background: #fff !important; }
      #main-app .action-box { border: 3px solid #000 !important; background: #fff !important; }
      #main-app .resolve-box { border: 3px solid #000 !important; background: #fff !important; }
      #main-app .stat { border: 3px solid #000 !important; background: #fff !important; }
      #main-app .nav-panel { border-top: 3px solid #000 !important; background: #fff !important; }
      #main-app .nav-btn { border-top: 3px solid transparent !important; color: #000 !important; font-weight: 600 !important; }
      #main-app .nav-btn.active { border-top: 3px solid #000 !important; color: #000 !important; }
      #main-app .section-title { color: #000 !important; font-weight: 700 !important; }
      #main-app .device-name { color: #000 !important; font-weight: 700 !important; }
      #main-app .device-brand { color: #333 !important; }
      #main-app .detail-key { color: #000 !important; font-weight: 600 !important; }
      #main-app .detail-val { color: #000 !important; font-weight: 600 !important; }
      #main-app .stat-num { font-weight: 900 !important; }
      #main-app .stat-label { color: #000 !important; font-weight: 600 !important; }
      #main-app .badge-red { background: #CC0000 !important; color: #fff !important; border: 3px solid #880000 !important; font-weight: 700 !important; }
      #main-app .badge-yellow { background: #FFFF00 !important; color: #000 !important; border: 3px solid #888800 !important; font-weight: 700 !important; }
      #main-app .badge-green { background: #006600 !important; color: #fff !important; border: 3px solid #004400 !important; font-weight: 700 !important; }
      #main-app .dot-red { background: #CC0000 !important; width: 14px !important; height: 14px !important; border: 2px solid #880000 !important; }
      #main-app .dot-yellow { background: #FFFF00 !important; width: 14px !important; height: 14px !important; border: 2px solid #888800 !important; }
      #main-app .dot-green { background: #006600 !important; width: 14px !important; height: 14px !important; border: 2px solid #004400 !important; }
      #main-app .stat-num.red { color: #CC0000 !important; }
      #main-app .stat-num.yellow { color: #888800 !important; }
      #main-app .stat-num.green { color: #006600 !important; }
      #main-app input, #main-app select, #main-app textarea { border: 2px solid #000 !important; color: #000 !important; background: #fff !important; }
      #main-app .submit-btn { background: #000 !important; color: #fff !important; border: 3px solid #000 !important; font-weight: 700 !important; }
      #main-app .device-action-btn { border: 2px solid #000 !important; color: #000 !important; font-weight: 600 !important; }
      #main-app .device-action-btn.danger { border: 2px solid #CC0000 !important; color: #CC0000 !important; font-weight: 600 !important; }
      #main-app .risk-detail-red { background: #CC0000 !important; border: 3px solid #880000 !important; }
      #main-app .risk-detail-red p, #main-app .risk-detail-red .risk-detail-title { color: #fff !important; }
      #main-app .risk-detail-yellow { background: #FFFF00 !important; border: 3px solid #888800 !important; }
      #main-app .risk-detail-yellow p, #main-app .risk-detail-yellow .risk-detail-title { color: #000 !important; }
      #main-app .risk-detail-green { background: #006600 !important; border: 3px solid #004400 !important; }
      #main-app .risk-detail-green p, #main-app .risk-detail-green .risk-detail-title { color: #fff !important; }
      #main-app .back-btn { color: #000 !important; font-weight: 600 !important; }
      #main-app .filter-btn { border: 2px solid #000 !important; font-weight: 600 !important; }
      #main-app .filter-btn.active { background: #000 !important; color: #fff !important; }
      #main-app .health-opt { border: 2px solid #000 !important; }
      #main-app .resolve-check, #main-app label { color: #000 !important; }
      #main-app .alert-row-red { background: #fff !important; border: 3px solid #000 !important; }
      #main-app .alert-row-yellow { background: #fff !important; border: 3px solid #000 !important; }
      #main-app .alert-fix-btn { background: #000 !important; color: #fff !important; border: 2px solid #fff !important; }
    `;
    document.head.appendChild(hcStyle);
  }
  renderDashList();

  // Reduced motion
  body.classList.toggle('reduced-motion', a11ySettings.reducedMotion);

  // Color blind mode
  body.classList.toggle('colorblind-mode', a11ySettings.colorBlind);

  renderDashList();
  renderDeviceList();
}
