/* AgriGuardian i18n: setLang UI refresh */
function setLang(lang, context) {
  currentLang = lang;
  if (context === 'login') {
    const safe = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    // Rewrite demo box entirely using innerHTML to ensure full translation
    const demoBox = document.getElementById('demo-box');
    if (demoBox) {
      const existingTs = document.getElementById('build-timestamp') ? document.getElementById('build-timestamp').textContent : '';
      demoBox.innerHTML =
        '<p style="font-size:10px;color:#aaa;text-align:right;margin-bottom:8px"><span id="lbl-last-updated">' + t('loginLastUpdated') + '</span> <span id="build-timestamp">' + existingTs + '</span></p>' +
        '<p id="lbl-demo-title" style="font-size:12px;font-weight:600;color:#1F4D2E;margin-bottom:8px">ⓘ ' + t('loginDemoTitle') + '</p>' +
        '<p id="lbl-demo-subtitle" style="font-size:12px;color:#444;margin-bottom:8px"><strong>' + t('loginDemoSubTitle') + '</strong></p>' +
        '<div style="background:#fff;border:1px solid #C8E6C9;border-radius:8px;padding:8px 10px;margin-bottom:6px">' +
          '<p id="lbl-demo-card1-title" style="font-size:12px;color:#1F4D2E;font-weight:600;margin-bottom:3px">' + t('loginDemoCard1Title') + '</p>' +
          '<p id="lbl-demo-card1-desc" style="font-size:11px;color:#555;margin:0">' + t('loginDemoCard1Desc') + '</p>' +
        '</div>' +
        '<div style="background:#fff;border:1px solid #C8E6C9;border-radius:8px;padding:8px 10px;margin-bottom:6px">' +
          '<p id="lbl-demo-card2-title" style="font-size:12px;color:#1F4D2E;font-weight:600;margin-bottom:3px">' + t('loginDemoCard2Title') + '</p>' +
          '<p id="lbl-demo-card2-desc" style="font-size:11px;color:#555;margin:0">' + t('loginDemoCard2Desc') + '</p>' +
        '</div>' +
        '<div style="background:#fff;border:1px solid #C8E6C9;border-radius:8px;padding:8px 10px;margin-bottom:0">' +
          '<p id="lbl-demo-card3-title" style="font-size:12px;color:#1F4D2E;font-weight:600;margin-bottom:3px">' + t('loginDemoCard3Title') + '</p>' +
          '<p id="lbl-demo-card3-desc" style="font-size:11px;color:#555;margin:0">' + t('loginDemoCard3Desc') + '</p>' +
        '</div>';
      applyBuildTimestamp();
    }
    safe('login-sub-text', t('appTag'));
    safe('welcome-title', t('loginWelcomeTitle'));
    safe('welcome-sub', t('loginWelcomeSub'));
    safe('btn-create', t('loginCreateBtn'));
    safe('btn-signin-choice', t('loginSigninBtn'));
    safe('signin-title', t('loginSigninTitle'));
    safe('signin-sub', t('loginSigninSub'));
    safe('verify-title', t('loginVerifyTitle'));
    safe('reg-title', t('loginRegTitle'));
    safe('lbl-reg-name', t('loginName'));
    safe('lbl-reg-farm', t('loginFarm'));
    safe('lbl-reg-role', t('loginRole'));
    safe('lbl-reg-phone', t('loginPhone'));
    safe('lbl-email-opt', t('loginEmailOpt'));
    safe('reg-send-btn', t('loginRegSend'));
    safe('lbl-phone', t('loginPhone'));
    safe('send-btn', t('loginSend'));
    safe('lbl-code', t('loginCode'));
    safe('verify-btn', t('loginVerify'));
    const roles = t('loginRoles');
    if (Array.isArray(roles)) {
      ['reg-role','role-select'].forEach(selId => {
        const sel = document.getElementById(selId);
        // Only iterate options on real <select> elements (reg-role is a hidden input, which has no .options)
        if (sel && sel.options) Array.from(sel.options).forEach((o,i) => { if(roles[i]) o.text = roles[i]; });
      });
    }
    safe('lbl-reg-tz', t('loginFarmTz'));
    safe('lbl-reg-pass', t('loginPassword'));
    safe('lbl-reg-pass-hint', t('loginPassHint'));
    safe('lbl-reg-email', t('loginEmail'));
    safe('lbl-reg-tz', t('loginFarmTz'));
    safe('lbl-reg-pass', t('loginPassword'));
    safe('lbl-reg-pass-hint-text', t('loginPassHint'));
    safe('btn-back-register', t('loginBack'));
    safe('btn-back-signin', t('loginBack'));
    safe('btn-back-code', t('loginBack'));
    safe('lbl-demo-title', 'ⓘ ' + t('loginDemoTitle'));
    safe('lbl-demo-step1', t('loginDemoStep1'));
    safe('lbl-demo-1b', t('loginDemoStep1b'));
    safe('lbl-demo-step2', t('loginDemoStep2'));
    safe('lbl-demo-step3', t('loginDemoStep3'));
    safe('lbl-demo-step4', t('loginDemoStep4'));
    safe('lbl-demo-4b', t('loginDemoStep4b'));
    safe('lbl-last-updated', t('loginLastUpdated'));
    safe('lbl-your-name', t('loginName'));
    safe('lbl-username-hint', t('loginUsernameHint'));
    safe('lbl-reg-email', t('loginEmail'));
    safe('lbl-reg-email-note', t('loginOptionalReport'));
    safe('lbl-signin-phone', t('loginYourPhone'));
    safe('lbl-signin-pass', t('loginPasswordLabel'));
    safe('lbl-phone-username', t('loginPhoneUsername'));
    safe('lbl-code-label', t('loginCode'));
    safe('lbl-code-sent', t('loginVerificationSent'));
    safe('btn-verify-signin', t('loginVerifyBtn'));
    safe('btn-send-mfa', t('loginSendMfa'));
    safe('lbl-btn-create-ref', t('loginCreateBtn'));
    safe('lbl-forgot-pw', t('forgotPassword'));
    safe('lbl-reset-title', t('resetTitle'));
    safe('lbl-reset-sub', t('resetSub'));
    safe('lbl-reset-phone', t('resetPhone'));
    safe('btn-send-reset', t('resetSendBtn'));
    safe('btn-back-reset', t('loginBack'));
    safe('btn-confirm-reset', t('resetConfirmBtn'));
    safe('lbl-new-code', t('resetCodeLabel'));
    safe('lbl-new-pw', t('resetNewPw'));
    safe('lbl-lockout-msg', t('lockoutBanner'));
    safe('lbl-lockout-seconds', t('lockoutSeconds'));
    // Update placeholders
    const setPlaceholder = (id, val) => { const el = document.getElementById(id); if(el) el.placeholder = val; };
    setPlaceholder('reg-name', t('loginNamePlaceholder'));
    setPlaceholder('reg-farm', t('loginFarmPlaceholder'));
    setPlaceholder('reg-pass', t('loginPassPlaceholderHint'));
    setPlaceholder('signin-pass', t('loginSigninPassPlaceholder'));
    setPlaceholder('reg-phone', t('loginPhonePlaceholderHint'));
    setPlaceholder('signin-phone', t('loginPhonePlaceholderHint'));
    safe('lbl-send-code-ref', t('loginRegSend'));
    safe('lbl-verify-ref', t('loginVerifyBtn'));
    // Update choice step (demo box) labels directly
    safe('lbl-demo-title', 'ⓘ ' + t('loginDemoTitle'));
    safe('lbl-last-updated', t('loginLastUpdated'));
    safe('lbl-demo-subtitle', t('loginDemoSubTitle'));
    safe('lbl-demo-card1-title', t('loginDemoCard1Title'));
    safe('lbl-demo-card1-desc', t('loginDemoCard1Desc'));
    safe('lbl-demo-card2-title', t('loginDemoCard2Title'));
    safe('lbl-demo-card2-desc', t('loginDemoCard2Desc'));
    safe('lbl-demo-card3-title', t('loginDemoCard3Title'));
    safe('lbl-demo-card3-desc', t('loginDemoCard3Desc'));
    safe('welcome-title', t('loginWelcomeTitle'));
    safe('welcome-sub', t('loginWelcomeSub'));
    safe('btn-create', t('loginCreateBtn'));
    safe('btn-signin-choice', t('loginSigninBtn'));
    // I have an invite button
    safe('btn-invite-choice', t('loginHaveInviteBtn'));
    // Invite step — all labels
    safe('lbl-invite-title', t('inviteTitle'));
    safe('lbl-invite-sub', t('inviteSub'));
    safe('lbl-invite-code-label', t('inviteCodeLabel'));
    safe('btn-validate-code', t('inviteContinueBtn'));
    safe('lbl-invite-accepted', t('inviteAccepted'));
    safe('lbl-invite-your-name', t('inviteYourName'));
    safe('lbl-invite-your-phone', t('inviteYourPhone'));
    safe('lbl-invite-role-label', t('inviteRoleLabel'));
    safe('lbl-invite-manager', t('inviteRoleManager'));
    safe('lbl-invite-manager-desc', t('inviteManagerDesc'));
    safe('lbl-invite-role-manager-desc', t('inviteRoleManagerDesc'));
    safe('lbl-invite-farmhand', t('inviteRoleFarmhand'));
    safe('lbl-invite-farmhand-desc', t('inviteFarmhandDesc'));
    safe('lbl-invite-role-farmhand-desc', t('inviteRoleFarmhandDesc'));
    safe('lbl-invite-readonly-note', t('inviteReadonlyNote'));
    safe('btn-join-farm', t('inviteJoinBtn'));
    safe('lbl-invite-demo-hint-title', t('inviteDemoHintTitle'));
    safe('btn-back-invite', t('inviteBackBtn'));
    const invHint2 = document.getElementById('lbl-invite-demo-hint');
    if (invHint2) invHint2.innerHTML = t('inviteDemoHint').replace('987654','<strong style="background:#fff;padding:2px 8px;border-radius:6px;border:1px solid #C8E6C9;letter-spacing:2px">987654</strong>');
    const setPh2 = (id,val) => { const el=document.getElementById(id); if(el) el.placeholder=val; };
    setPh2('invite-code-input', t('inviteCodePlaceholder'));
    setPh2('invite-name', t('loginNamePlaceholder'));
    setPh2('invite-phone', t('loginPhonePlaceholderHint'));
    // Sign-in demo section
    safe('lbl-demo-members-title', t('demoMembersTitle'));
    safe('lbl-demo-members-sub', t('demoMembersSub'));
    safe('lbl-carlos-desc', t('carlosDesc'));
    safe('lbl-jamie-desc', t('jamieDesc'));
    // Sign-in labels
    safe('lbl-pass', t('loginPasswordLabel'));
    safe('lbl-phone', t('loginYourPhone'));
    const loginDd = document.getElementById('login-lang-dropdown');
    if (loginDd) loginDd.value = lang;
  } else {
    renderDashList(); // Render immediately with correct language
    const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    document.getElementById('header-tag').textContent = t('appTag');
    const dd = document.getElementById('lang-dropdown');
    if (dd) dd.value = lang;
    // Nav
    safeSet('nav-dash', t('navDash'));
    safeSet('add-device-btn', t('addDeviceBtn'));
    // Re-render team member dropdown to pick up language
    const tmSelect = document.getElementById('team-member-select');
    if (tmSelect) {
      const firstOpt = tmSelect.querySelector('option[value=""]');
      if (firstOpt) firstOpt.textContent = t('selectTeamMember');
    }
    safeSet('sec-hdr-audit', t('auditLogTitle'));
    safeSet('lbl-header-signout', t('signOut'));
    safeSet('sec-hdr-farm', t('farmAccountHeader'));
    safeSet('sec-hdr-team', t('teamMembersHeader'));
    safeSet('sec-hdr-timezone', t('timezoneHeader'));
    safeSet('sec-hdr-session', t('sessionHeader'));
    safeSet('sec-hdr-a11y', t('accessibilityLabel'));
    safeSet('sec-hdr-security', t('securityTitle'));
    safeSet('lbl-worker-details', t('workerDetails'));
    safeSet('lbl-member-fullname', t('memberFullName'));
    safeSet('lbl-sort-by-dev', t('sortByLabel'));
    safeSet('lbl-sort-by-net', t('sortByLabel'));
    safeSet('opt-sort-risk', t('riskLevelSort'));
    safeSet('opt-sort-brand', t('brandSort'));
    safeSet('opt-sort-type', t('deviceTypeLabel'));
    safeSet('opt-sort-location', t('locationLabel'));
    safeSet('opt-sort-name', t('nameSort'));
    safeSet('opt-net-sort-risk', t('riskLevelSort'));
    safeSet('opt-net-sort-type', t('connTypeLabel'));
    safeSet('opt-net-sort-name', t('nameSort'));
    safeSet('lbl-net-pw-yes', t('pwYes'));
    safeSet('lbl-net-pw-no', t('pwNo'));
    safeSet('lbl-net-enc-yes', t('yesEncrypted'));
    safeSet('lbl-net-enc-no', t('pwNo'));
    safeSet('lbl-net-notes-label', t('netNotesLabel') + ' ');
    safeSet('lbl-net-notes-opt', t('optional'));
    safeSet('lbl-cred-warn', '⚠️ ' + t('credWarning'));
    safeSet('lbl-prod-sec-title', t('productionSecTitle'));
    safeSet('lbl-tz-note', t('tzNote'));
    safeSet('lbl-only-owner-tz', t('onlyOwnerTimezone'));
    safeSet('lbl-vuln-db-title', t('vulnDbTitle'));
    safeSet('lbl-cisa-title', t('cisaTitle'));
    safeSet('lbl-cisa-desc', t('cisaDesc'));
    safeSet('lbl-connected', t('connectedLabel'));
    safeSet('lbl-pending-backend', t('pendingBackend'));
    safeSet('lbl-enc-head', t('encHead'));
    safeSet('lbl-enc-body', t('encryptionNote'));
    safeSet('lbl-backup-head', t('backupHead'));
    safeSet('lbl-backup-body', t('backupNote'));
    safeSet('lbl-arch-note-head', t('archHead'));
    safeSet('lbl-arch-note', t('architectureNote'));
    safeSet('lbl-perf-head', t('perfHead'));
    safeSet('lbl-perf-body', t('performanceNote'));
    safeSet('btn-add-network', t('addNetworkBtnShort'));
    safeSet('lbl-add-net-title', t('addANetwork'));
    safeSet('lbl-net-conn-type', t('connTypeLabel'));
    safeSet('opt-net-select-type', t('selectType'));
    safeSet('opt-net-conn-wifi', t('connWifi'));
    safeSet('opt-net-conn-eth', t('connEthernet'));
    safeSet('opt-net-conn-cell', t('connCellular'));
    safeSet('opt-net-conn-sat', t('connSatellite'));
    safeSet('opt-net-conn-bt', t('connBluetooth'));
    safeSet('opt-net-conn-lora', t('connLoRa'));
    safeSet('opt-net-conn-unk', t('connUnknown'));
    safeSet('lbl-net-name', t('nameOrLabel'));
    safeSet('lbl-router-brand', t('routerBrand') + ' ');
    safeSet('lbl-net-model', t('modelNumLabel') + ' ');
    safeSet('lbl-vuln-lookups', t('usedForVulnLookups'));
    safeSet('lbl-net-pw', t('hasPwChanged'));
    safeSet('lbl-net-pw-yes', t('pwYes'));
    safeSet('lbl-net-pw-no', t('pwNo'));
    safeSet('lbl-net-enc', t('isEncrypted'));
    safeSet('lbl-net-enc-yes', t('yesEncrypted'));
    safeSet('lbl-net-enc-no', t('pwNo'));
    safeSet('lbl-net-notes-label', t('netNotesLabel') + ' ');
    safeSet('lbl-net-notes-opt', t('optional'));
    safeSet('lbl-add-net-btn', t('addNetworkBtn'));
    safeSet('opt-net-select-brand', t('selectBrandNet'));
    safeSet('opt-net-other-brand', t('otherNotListed'));
    // Add device form
    safeSet('lbl-add-device-title', t('addADevice'));
    safeSet('lbl-brand', t('brandLabel'));
    safeSet('lbl-mfr-model', t('mfrModelNum'));
    safeSet('lbl-security-lookups', t('usedForLookups'));
    safeSet('lbl-device-name', t('deviceNameLabel') + ' ');
    safeSet('lbl-dealer', t('dealerLabel') + ' ');
    safeSet('lbl-pw-changed', t('hasPwChanged'));
    safeSet('lbl-add-device-btn', t('addBtn'));
    safeSet('opt-select-brand', t('selectBrand'));
    safeSet('opt-other-brand', t('otherNotListed'));
    safeSet('opt-select-type', t('selectType'));
    safeSet('opt-type-irrigation', t('typeIrrigation'));
    safeSet('opt-type-livestock', t('typeLivestock'));
    safeSet('opt-type-soil', t('typeSoil'));
    safeSet('opt-type-camera', t('cameraType'));
    safeSet('opt-type-gps', t('typeGPS'));
    safeSet('opt-type-barn-vent', t('typeBarnVent'));
    safeSet('opt-type-drone', t('typeDrone'));
    safeSet('opt-type-feed', t('typeFeed'));
    safeSet('opt-other-type', t('otherNotListed'));
    safeSet('opt-select-location', t('selectLocation'));
    safeSet('opt-loc-barn', t('locationBarn'));
    safeSet('opt-loc-main', t('locationMainHouse'));
    safeSet('opt-loc-north', t('locationNorthField'));
    safeSet('opt-loc-south', t('locationSouthField'));
    safeSet('opt-loc-east', t('locationEastField'));
    safeSet('opt-loc-west', t('locationWestField'));
    safeSet('opt-loc-pasture', t('locationPasture'));
    safeSet('opt-loc-grain', t('locationGrainBins'));
    safeSet('opt-loc-dairy', t('locationDairyBarn'));
    safeSet('opt-loc-machine', t('locationMachineShed'));
    safeSet('opt-loc-custom', t('addCustomLocation'));
    safeSet('opt-select-conn', t('selectConnType'));
    safeSet('opt-conn-unknown', t('unknownLabel'));
    const setPh = (id,val) => { const el=document.getElementById(id); if(el) el.placeholder=val; };
    setPh('brand-input', t('enterBrandPlaceholder'));
    setPh('device-model', t('modelPlaceholder'));
    setPh('device-serial', t('serialPlaceholder'));
    setPh('type-input', t('enterTypePlaceholder'));
    setPh('device-label', t('deviceLabelPlaceholder'));
    setPh('location-input', t('customLocationPlaceholder'));
    setPh('device-contact-notes', t('dealerPlaceholder'));
    // Add network form
    safeSet('lbl-add-net-title', t('addANetwork'));
    safeSet('lbl-net-conn-type', t('connTypeLabel'));
    safeSet('lbl-net-name', t('nameOrLabel'));
    safeSet('lbl-router-brand', t('routerBrand') + ' ');
    safeSet('lbl-net-model', t('modelNumLabel') + ' ');
    safeSet('lbl-vuln-lookups', t('usedForVulnLookups'));
    safeSet('lbl-net-pw', t('hasPwChanged'));
    safeSet('lbl-net-enc', t('isEncrypted'));
    safeSet('lbl-net-btn', t('addNetworkBtn'));
    safeSet('lbl-add-net-btn', t('addNetworkBtn'));
    safeSet('opt-net-select-type', t('selectType'));
    safeSet('opt-net-select-brand', t('selectBrandNet'));
    safeSet('opt-net-other-brand', t('otherNotListed'));
    safeSet('opt-enc-yes', t('yesEncrypted'));
    safeSet('opt-enc-no', t('pwNo'));
    setPh('net-label', t('netNamePlaceholder'));
    setPh('net-hw-brand', t('enterBrandPlaceholder'));
    setPh('net-hw-model', t('netModelPlaceholder'));
    // PW radio labels
    safeSet('lbl-pw-yes', t('pwYes'));
    safeSet('lbl-pw-no', t('pwNo'));
    safeSet('btn-add-network', t('addNetworkBtnShort'));
    safeSet('lbl-add-net-title', t('addANetwork'));
    safeSet('lbl-net-conn-type', t('connTypeLabel'));
    safeSet('opt-net-select-type', t('selectType'));
    safeSet('opt-net-conn-wifi', t('connWifi'));
    safeSet('opt-net-conn-eth', t('connEthernet'));
    safeSet('opt-net-conn-cell', t('connCellular'));
    safeSet('opt-net-conn-sat', t('connSatellite'));
    safeSet('opt-net-conn-bt', t('connBluetooth'));
    safeSet('opt-net-conn-lora', t('connLoRa'));
    safeSet('opt-net-conn-unk', t('connUnknown'));
    safeSet('lbl-net-name', t('nameOrLabel'));
    safeSet('lbl-router-brand', t('routerBrand') + ' ');
    safeSet('lbl-net-model', t('modelNumLabel') + ' ');
    safeSet('lbl-vuln-lookups', t('usedForVulnLookups'));
    safeSet('lbl-net-pw', t('hasPwChanged'));
    safeSet('lbl-net-pw-yes', t('pwYes'));
    safeSet('lbl-net-pw-no', t('pwNo'));
    safeSet('lbl-net-enc', t('isEncrypted'));
    safeSet('lbl-net-enc-yes', t('yesEncrypted'));
    safeSet('lbl-net-enc-no', t('pwNo'));
    safeSet('lbl-net-notes-label', t('netNotesLabel') + ' ');
    safeSet('lbl-net-notes-opt', t('optional'));
    safeSet('lbl-add-net-btn', t('addNetworkBtn'));
    safeSet('opt-net-select-brand', t('selectBrandNet'));
    safeSet('opt-net-other-brand', t('otherNotListed'));
    safeSet('btn-filter-dev-active', t('active'));
    safeSet('btn-filter-dev-archived', t('archived'));
    safeSet('btn-filter-dev-all', t('allLabel'));
    safeSet('filter-active', t('active'));
    safeSet('filter-archived', t('archived'));
    safeSet('filter-all', t('allLabel'));
    safeSet('filter-user-active', t('active'));
    safeSet('filter-user-archived', t('archived'));
    safeSet('filter-user-all', t('allLabel'));
    safeSet('btn-filter-net-active', t('active'));
    safeSet('btn-filter-net-archived', t('archived'));
    safeSet('btn-filter-net-all', t('allLabel'));
    safeSet('nav-devices', t('navDevices'));
    safeSet('nav-add', t('navAdd'));
    // Dashboard
    safeSet('lbl-total-devices', t('totalDevices'));
    safeSet('lbl-act-now', t('actNow'));
    safeSet('lbl-action-soon', t('actionSoon'));
    safeSet('lbl-high-priority', t('highPriority'));
    safeSet('lbl-all-devices', t('allDevices'));
    // Add device form
    safeSet('lbl-add-title', t('addTitle'));
    safeSet('lbl-brand', t('brand'));
    safeSet('lbl-type', t('deviceType'));
    safeSet('lbl-pw-changed', t('pwChanged'));
    // Header
    // Timeout banner
    safeSet('timeout-msg-text', t('sessionWarning'));
    safeSet('timeout-stay-btn', t('staySignedIn'));
    // Radio options
    const pwOpts = document.querySelectorAll('input[name="pw"]');
    if (pwOpts.length >= 2) {
      if(pwOpts[0].parentElement) pwOpts[0].parentElement.childNodes[1] && (pwOpts[0].parentElement.lastChild.textContent = ' ' + t('pwYes'));
      if(pwOpts[1].parentElement) pwOpts[1].parentElement.childNodes[1] && (pwOpts[1].parentElement.lastChild.textContent = ' ' + t('pwNo'));
    }
    safeSet('lbl-back-btn', t('backToDevices'));
    safeSet('lbl-back-net-btn', t('backToNetwork'));
    safeSet('lbl-about', t('aboutLabel'));
    safeSet('lbl-issues', t('issuesLabel'));
    safeSet('lbl-networks', t('networksLabel'));
    safeSet('lbl-a11y-large', t('a11yLargeText'));
    safeSet('lbl-a11y-large-desc', t('a11yLargeTextDesc'));
    safeSet('lbl-a11y-xl', t('a11yExtraLarge'));
    safeSet('lbl-a11y-xl-desc', t('a11yExtraLargeDesc'));
    safeSet('lbl-a11y-hc', t('a11yHighContrast'));
    safeSet('lbl-a11y-hc-desc', t('a11yHighContrastDesc'));
    safeSet('lbl-a11y-cb', t('colorBlind') || 'Color-blind mode');
    safeSet('lbl-a11y-cb-desc', t('a11yColorBlindDesc'));
    safeSet('lbl-a11y-rm', t('a11yReducedMotion'));
    safeSet('lbl-a11y-rm-desc', t('a11yDisableMotion'));
    safeSet('lbl-network-desc', t('networkConns'));
    safeSet('lbl-download-report', t('lblDownloadReport'));
    // Invite step labels live in the login DOM but stay visible — update in app context too
    safeSet('lbl-invite-role-manager-desc', t('inviteRoleManagerDesc'));
    safeSet('lbl-invite-role-farmhand-desc', t('inviteRoleFarmhandDesc'));
    safeSet('lbl-invite-manager-desc', t('inviteManagerDesc'));
    safeSet('lbl-invite-farmhand-desc', t('inviteFarmhandDesc'));
    // MAC label in screen-add template (has child span so update text node directly)
    (function(){ var el=document.getElementById('lbl-mac'); if(el&&el.childNodes[0]&&el.childNodes[0].nodeType===3) el.childNodes[0].textContent=t('macFieldLabel')+' '; })();
    safeSet('lbl-add-network-conn', t('addNetworkConn'));
    safeSet('opt-add-new-role', t('addNewRoleOption'));
    safeSet('lbl-download-activity', t('lblDownloadActivity'));
    safeSet('lbl-email-report', t('lblEmailReport'));
    safeSet('lbl-email-activity', t('lblEmailActivity'));
    safeSet('lbl-report-hygiene-title', t('lblReportHygieneTitle'));
    safeSet('lbl-report-activity-title', t('lblReportActivityTitle'));
    safeSet('lbl-owner-email-hint', t('ownerEmailHint'));
    safeSet('lbl-network-title', t('networkConns'));
    safeSet('lbl-net-conn-type', t('connTypeLabel'));
    safeSet('lbl-conn-type', t('connTypeLabel'));
    safeSet('lbl-unique-brand-note', t('uniqueBrandNote'));
    safeSet('lbl-unique-type-note', t('uniqueTypeNote'));
    safeSet('lbl-unique-role-note', t('uniqueRoleNote'));
    safeSet('lbl-net-name', t('nameOrLabel'));
    safeSet('nav-network', t('navNetwork'));
    safeSet('nav-settings', t('navSettings'));
    safeSet('nav-backups', t('navBackups'));
    safeSet('lbl-backup-screen-title', t('backupScreenTitle'));
    safeSet('nav-apps', t('navApps'));
    safeSet('lbl-apps-title', t('appsTitle'));
    safeSet('lbl-add-app-title', t('addAnApp'));
    safeSet('lbl-app-picker', t('appPickerLabel'));
    safeSet('opt-app-picker-select', t('appPickerSelect'));
    safeSet('opt-app-picker-other', t('appPickerOther'));
    safeSet('lbl-app-name', t('appNameLabel'));
    safeSet('lbl-app-vendor', t('appVendorLabel'));
    safeSet('lbl-app-purpose', t('appPurposeLabel'));
    safeSet('lbl-app-owner-new', t('appAccountOwnerLabel'));
    safeSet('lbl-app-renewal-new', t('appRenewalLabel'));
    safeSet('lbl-app-renewal-opt', t('optional'));
    safeSet('lbl-app-mfa-q', t('appMfaQuestion'));
    safeSet('lbl-app-mfa-yes', t('pwYesVal'));
    safeSet('lbl-app-mfa-no', t('pwNoVal'));
    safeSet('lbl-app-reviewed-q', t('appReviewedQuestion'));
    safeSet('lbl-app-rev-yes', t('pwYesVal'));
    safeSet('lbl-app-rev-no', t('pwNoVal'));
    safeSet('lbl-add-app-btn', t('addAppBtn'));
    safeSet('lbl-back-apps-btn', t('backToApps'));
    (function(){
      var btn = document.getElementById('btn-add-app');
      if (btn) btn.textContent = t('addApp');
      var ph1 = document.getElementById('app-name'); if (ph1) ph1.placeholder = t('appNamePlaceholder');
      var ph2 = document.getElementById('app-vendor'); if (ph2) ph2.placeholder = t('appVendorPlaceholder');
      var ph3 = document.getElementById('app-purpose'); if (ph3) ph3.placeholder = t('appPurposePlaceholder');
      var ph4 = document.getElementById('app-owner-new'); if (ph4) ph4.placeholder = t('appAccountOwnerPlaceholder');
      var ph5 = document.getElementById('app-renewal-new'); if (ph5) ph5.placeholder = t('appRenewalPlaceholder');
    })();
    safeSet('lbl-settings-title', t('settingsTitle'));
    safeSet('lbl-farm-info', t('farmInfo'));
    safeSet('lbl-team-title', t('teamTitle'));
    safeSet('lbl-add-member', t('addMember'));
    safeSet('lbl-member-phone', t('memberPhone'));
    safeSet('lbl-member-role', t('memberRole'));
    safeSet('btn-invite', t('inviteBtn'));
    safeSet('lbl-invite-note', t('inviteNote'));
    safeSet('lbl-session-title', t('sessionTitle'));
    safeSet('lbl-timeout-label', t('timeoutLabel'));
    safeSet('lbl-tz-desc', t('timeZoneDesc').toUpperCase ? t('timeZoneDesc') : t('timeZoneDesc'));
    safeSet('lbl-timeout-note', t('timeoutNote'));
    safeSet('opt-session-5', t('sessionTitle5min'));
    safeSet('opt-session-15', t('sessionTitle15min'));
    safeSet('opt-session-30', t('sessionTitle30min'));
    safeSet('opt-session-60', t('sessionTitle1hr'));
    safeSet('lbl-security-title', t('securityTitle'));
    safeSet('lbl-pw-rules-label', t('pwRulesLabel'));
    safeSet('lbl-pw-rules-text', t('pwRulesText'));
    safeSet('lbl-nvd-title', t('nvdLabel'));
    safeSet('lbl-nvd-desc', t('nvdDesc'));
    safeSet('lbl-prod-arch', t('prodArchLabel'));
    safeSet('lbl-nvd-arch-note', t('nvdArchNote'));
    // Re-render the open detail view so its dynamic content switches language too.
    renderDeviceList();
    renderNetworkList();
    var detailContent = document.getElementById('detail-content');
    if (detailContent && detailContent.getAttribute('data-device-id')) {
      showDetail(parseInt(detailContent.getAttribute('data-device-id'), 10), true);
    }
    var netContent = document.getElementById('net-detail-content');
    if (netContent && netContent.getAttribute('data-net-id')) {
      showNetDetail(parseInt(netContent.getAttribute('data-net-id'), 10), true);
    }
    // Re-render settings so its dynamically-built content (team list, audit log,
    // permission labels, dropdown placeholders) also reflects the new language.
    if (typeof renderSettings === 'function' && currentUser && currentUser.loggedIn) {
      renderSettings();
    }
  }
}
