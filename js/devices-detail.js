/* AgriGuardian: device detail, add, assign */
var PW_MANAGERS = [
  { name: 'Bitwarden',   url: 'https://bitwarden.com',   free: true,  descKey: 'pwmBitwarden' },
  { name: '1Password',   url: 'https://1password.com',   free: false, descKey: 'pwm1Password' },
  { name: 'Keeper',      url: 'https://www.keepersecurity.com', free: false, descKey: 'pwmKeeper' },
  { name: 'Proton Pass', url: 'https://proton.me/pass',   free: true,  descKey: 'pwmProtonPass' }
];

// Guidance card: how to find a device's default login so it can be CHANGED.
// Guidance only — never shows or stores a credential. Pulls the dealer line
// from the device's contactNotes when present.
function findDefaultLoginHTML(d) {
  var dealerLine = '';
  if (d.contactNotes) {
    var line = d.contactNotes.split('\n').find(function(l){ return /^\s*dealer\s*:/i.test(l); });
    if (line) dealerLine = line.replace(/^\s*dealer\s*:\s*/i, '').trim();
  }
  var modelHint = d.model || d.brand || '';
  function step(icon, title, body) {
    return '<div style="display:flex;align-items:flex-start;gap:9px;border:1px solid #e5e5e5;border-radius:8px;padding:9px 11px">' +
      '<i class="ti ' + icon + '" style="font-size:17px;color:#185FA5;flex-shrink:0;margin-top:1px"></i>' +
      '<div><div style="font-size:13px;font-weight:600;color:#222">' + title + '</div>' +
      '<div style="font-size:12px;color:#777;line-height:1.5">' + body + '</div></div>' +
    '</div>';
  }
  var steps = step('ti-tag', t('fdlLabelTitle'), t('fdlLabelBody')) +
    step('ti-book-2', t('fdlManualTitle'), t('fdlManualBody') + (modelHint ? ' <span style="color:#222">"' + modelHint + '"</span>.' : '.')) +
    (dealerLine ? step('ti-phone', t('fdlDealerTitle'), t('fdlDealerOnFile') + ' ' + dealerLine) : '');

  return '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:14px;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
      '<i class="ti ti-login" style="font-size:20px;color:#185FA5"></i>' +
      '<span style="font-size:15px;font-weight:600;color:#222">' + t('fdlTitle') + '</span>' +
    '</div>' +
    '<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 12px">' + t('fdlIntro') + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">' + steps + '</div>' +
    '<div style="display:flex;align-items:flex-start;gap:8px;background:#FAEEDA;border:1px solid #EF9F27;border-radius:8px;padding:8px 10px">' +
      '<i class="ti ti-alert-triangle" style="font-size:16px;color:#854F0B;flex-shrink:0;margin-top:1px"></i>' +
      '<span style="font-size:12px;line-height:1.5;color:#633806">' + t('fdlWarning') + '</span>' +
    '</div>' +
  '</div>';
}

function pwManagerCardHTML() {
  var rows = PW_MANAGERS.map(function(m) {
    var freeTag = m.free
      ? '<span style="font-size:10px;color:#14381F;background:#EAF3EC;border-radius:6px;padding:1px 6px;margin-left:6px">' + t('pwmFreeTag') + '</span>'
      : '';
    return '<div style="display:flex;align-items:center;gap:10px;border:1px solid #e5e5e5;border-radius:8px;padding:9px 11px">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:#222">' + m.name + freeTag + '</div>' +
        '<div style="font-size:11px;color:#777">' + t(m.descKey) + '</div>' +
      '</div>' +
      '<a href="' + m.url + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#1F4D2E;border:1px solid #BBD8C2;border-radius:6px;padding:3px 9px;white-space:nowrap;text-decoration:none">' + t('pwmVisit') + ' <i class="ti ti-external-link" style="font-size:13px"></i></a>' +
    '</div>';
  }).join('');
  return '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:14px;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<i class="ti ti-key" style="font-size:20px;color:#1F4D2E"></i>' +
      '<span style="font-size:15px;font-weight:600;color:#222">' + t('pwmTitle') + '</span>' +
    '</div>' +
    '<p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 8px">' + t('pwmIntro') + '</p>' +
    '<div style="display:flex;align-items:flex-start;gap:8px;background:#EAF3EC;border:1px solid #BBD8C2;border-radius:8px;padding:8px 10px;margin-bottom:12px">' +
      '<i class="ti ti-shield-check" style="font-size:16px;color:#1F4D2E;flex-shrink:0;margin-top:1px"></i>' +
      '<span style="font-size:12px;line-height:1.5;color:#14381F">' + t('pwmNeverStores') + '</span>' +
    '</div>' +
    '<p style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('pwmTrustedOptions') + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' + rows + '</div>' +
    '<p style="font-size:11px;line-height:1.5;color:#999;margin:10px 0 0">' + t('pwmDisclaimer') + '</p>' +
  '</div>';
}

// Builds a chronological timeline of a device's security history from its record.
// Events are derived from the data already stored on the device (added, assigned,
// health status set, resolved, verified). Designed to grow richer once persistence
// stores a full event log; for now it reconstructs the story from current fields.
function deviceTimelineHTML(d) {
  var events = [];

  // Device added (uses installed/purchase hint from contactNotes if present, else generic)
  events.push({ date: d.addedDate || '', icon: 'ti-plus', color: '#5B8DB8', label: t('tlAdded') });

  // Current risk state — show when first flagged
  var risk = getRisk(d.brand, d.pw, d.healthStatus);
  if (!d.resolved && risk !== 'green') {
    events.push({ date: d.flaggedDate || '', icon: 'ti-alert-triangle', color: (risk === 'red' ? '#C0392B' : '#C9A400'),
      label: (risk === 'red' ? t('tlFlaggedHigh') : t('tlFlaggedAttention')) });
  }

  // Assignment
  if (d.assignedTo) {
    events.push({ date: '', icon: 'ti-user-check', color: '#1F4D2E', label: t('tlAssigned') + ' ' + d.assignedTo });
  }

  // Health/update status recorded
  if (d.healthStatus) {
    events.push({ date: d.healthDate || '', icon: 'ti-refresh', color: '#5B8DB8',
      label: t('tlHealthSet') + ' ' + d.healthStatus });
  }

  // Resolved
  if (d.resolved) {
    events.push({ date: d.resolvedDate || '', icon: 'ti-circle-check', color: '#2E7A4E',
      label: t('tlResolved') + (d.resolveStatus ? ' — ' + d.resolveStatus : '') });
  }

  // Verified
  if (d.verifiedDate) {
    events.push({ date: d.verifiedDate, icon: 'ti-shield-check', color: '#2E7A4E', label: t('tlVerified') });
  }

  if (events.length === 0) return '';

  var rows = events.map(function(e, i) {
    var isLast = (i === events.length - 1);
    return '<div style="display:flex;gap:10px;position:relative">' +
        '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">' +
          '<div style="width:24px;height:24px;border-radius:50%;background:' + e.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ' + e.icon + '" style="color:#fff;font-size:14px"></i></div>' +
          (isLast ? '' : '<div style="width:2px;flex:1;background:#e0e0e0;margin:2px 0"></div>') +
        '</div>' +
        '<div style="padding-bottom:' + (isLast ? '0' : '14px') + ';flex:1;min-width:0">' +
          '<div style="font-size:13px;color:#333">' + e.label + '</div>' +
          (e.date ? '<div style="font-size:11px;color:#999">' + e.date + '</div>' : '') +
        '</div>' +
      '</div>';
  }).join('');

  return '<button onclick="toggleSettingsSection(\'device-timeline-' + d.id + '\', this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 0;background:none;border:none;border-top:1px solid #eee;cursor:pointer;text-align:left;margin-top:6px">' +
      '<span class="section-title" style="margin:0;margin-top:0">' + t('tlTitle') + '</span>' +
      '<span class="sec-arrow" style="font-size:14px;color:#888">▸</span>' +
    '</button>' +
    '<div id="sec-device-timeline-' + d.id + '" style="display:none">' +
    '<div style="padding:4px 2px">' + rows + '</div>' +
    '</div>';
}

function showDetail(id, keepScreen) {
  currentDetailView = { type: 'device', id: id };
  const d = devices.find(x => x.id === id);
  if (!d) return;
  // Log who viewed which device and when — visibility, not just action.
  logAction(t('logViewedDevice').replace('{device}', (d.label || d.type) + ' (' + d.brand + ')'), '');
  const risk = getRisk(d.brand, d.pw, d.healthStatus);
  const why = getRiskWhy(d.brand, d.pw, risk);
  const action = getRiskAction(risk, d.pw, d.brand);
  const info = getRiskData()[d.brand] || getRiskData()["Other"];
  const iconMap = {red:'ti-alert-circle', yellow:'ti-alert-triangle', green:'ti-circle-check'};
  document.getElementById('detail-content').setAttribute('data-device-id', id);
  document.getElementById('detail-content').innerHTML =
    '<div class="device-name-large">' + (d.label || d.type) + '</div>' +
    '<div class="device-sub">' + d.brand + ' &middot; ' + d.type + '</div>' +
    (!canSeeIssue(d) && !d.resolved && risk !== 'green' ?
      '<div class="risk-detail" style="background:#F4F6F8;border:1px solid #d9dee3"><div class="risk-detail-title" style="color:#555"><i class="ti ti-lock"></i>Not assigned to you</div><p style="color:#555">Security details for this device are only shown to the team member it is assigned to, plus the Owner and Manager. This protects sensitive information by limiting who can see open issues.</p></div>' :
    !canSeeDetailedRisk() ? '' :
    d.resolved ?
      '<div class="risk-detail risk-detail-green"><div class="risk-detail-title t-green">' + t('lookingGood') + '</div><p>' + t('resolvedMsg') + (d.resolvedDate ? ' ' + d.resolvedDate : '') + '. ' + t('monitorMsg2') + '</p></div>' :
      '<div class="risk-detail risk-detail-' + risk + '"><div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getRiskLabel(risk, false) + '</div><p>' + why + '</p></div>'
    ) +
    // ----- RETURNED-TO-TECH BANNER (orange) -----
    (d.returnedToTech && !d.resolved ? (
      '<div style="background:#FFF3E0;border:2px solid #E6823A;border-radius:10px;padding:12px 14px;margin:10px 0">' +
        '<div style="font-weight:700;color:#7A3200;font-size:14px;margin-bottom:6px">↩️ ' + t('returnedBannerTitle') + '</div>' +
        '<div style="font-size:13px;color:#3a3a3a;line-height:1.5;margin-bottom:8px">' +
          '<div><strong>' + t('returnedBannerFrom') + ':</strong> ' + (d.returnedBy || 'Manager') + '</div>' +
          '<div style="margin-top:4px;padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #E6C7AA;font-style:italic">' + (d.returnNote || '') + '</div>' +
        '</div>' +
        '<p style="font-size:12px;color:#7A3200;margin:0">' + t('returnedBannerHint') + '</p>' +
      '</div>'
    ) : '') +
    // ----- ESCALATION / PARTIAL-RESOLVE BANNERS -----
    // Each role sees exactly ONE banner — no duplication.
    //
    // A. Owner, device partially resolved + escalated → ONE PURPLE banner
    //    (was: blue FYI + purple partial — same note shown twice)
    //
    // B. Manager (primary actor), any escalation → AMBER action banner
    //    (includes partial-fix summary if applicable)
    //
    // C. Owner, plain escalation (no partial fix) → BLUE FYI banner
    //    (Step In reassigns to Owner before resolve form appears)
    //
    // D. Technician who escalated → read-only orange pill
    //
    ((d.needsOwnerAction && !d.resolved && canSeeIssue(d) && canSeeDetailedRisk()) ? (
      canSeeEscalationBanner(d) ? (
        // Case A: partially-resolved + escalated — Owner sees single purple banner
        // regardless of whether Carlos or Angus is primary actor
        (d.partiallyResolved && currentUser.role === 'Owner') ? (
          '<div style="background:#F3EEFF;border:2px solid #7C3AED;border-radius:10px;padding:12px 14px;margin:10px 0">' +
            '<div style="font-weight:700;color:#5B21B6;font-size:14px;margin-bottom:8px">⚡ ' + t('partialEscBannerTitle') + '</div>' +
            '<div style="font-size:13px;color:#3B0764;line-height:1.5;margin-bottom:10px">' +
              '<div style="font-weight:600;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#7C3AED">' + t('partialEscWhatFixed').replace('{name}', d.partialResolveBy || 'Technician') + '</div>' +
              '<div style="padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #C4B5FD;font-style:italic;margin-bottom:10px">' + (d.partialResolveNote || '—') + '</div>' +
              '<div style="font-weight:600;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#7C3AED">' + t('partialEscWhatRemains') + '</div>' +
              '<div><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
              ((d.escalation && d.escalation.note) ? '<div style="padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #C4B5FD;font-style:italic;margin-top:6px">' + d.escalation.note + '</div>' : '') +
              '<div style="margin-top:8px;font-size:12px;color:#5B21B6;background:#EDE9FE;border-radius:6px;padding:6px 10px">' + t('partialEscHandledBy').replace('{name}', (d.escalation && d.escalation.targetName) || 'Manager') + '</div>' +
            '</div>' +
            '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
            '<textarea id="take-ownership-note-' + d.id + '" rows="2" placeholder="' + t('takeOwnershipNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
            '<button onclick="takeOwnership(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">' + t('escStepInBtn') + '</button>' +
          '</div>'
        ) :
        isEscalationPrimaryActor(d) ? (
          // B: Manager (or Owner when no Manager) — purple action banner
          '<div style="background:#F3EEFF;border:2px solid #7C3AED;border-radius:10px;padding:12px 14px;margin:10px 0">' +
            '<div style="font-weight:700;color:#5B21B6;font-size:14px;margin-bottom:6px"><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px" aria-hidden="true"></i> ' + t('escBannerTitle') + '</div>' +
            (d.partiallyResolved ?
              '<div style="background:#fff;border:1px solid #C4B5FD;border-radius:8px;padding:8px 10px;margin-bottom:10px">' +
                '<div style="font-size:11px;font-weight:600;color:#5B21B6;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px">⚡ ' + t('partialEscWhatFixed').replace('{name}', d.partialResolveBy || 'Technician') + '</div>' +
                '<div style="font-size:13px;color:#3B0764;font-style:italic">' + (d.partialResolveNote || '') + '</div>' +
              '</div>'
            : '') +
            '<div style="font-size:13px;color:#3B0764;line-height:1.5;margin-bottom:10px">' +
              '<div><strong>' + t('escBannerBy') + ':</strong> ' + (d.escalation && d.escalation.by || '—') + (d.escalation && d.escalation.date ? ' ' + t('escBannerOn') + ' ' + d.escalation.date : '') + '</div>' +
              '<div style="margin-top:2px"><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
              ((d.escalation && d.escalation.note) ? '<div style="margin-top:6px;padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #C4B5FD;font-style:italic">' + d.escalation.note + '</div>' : '') +
            '</div>' +
            '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
            '<textarea id="take-ownership-note-' + d.id + '" rows="2" placeholder="' + t('takeOwnershipNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<button onclick="takeOwnership(' + d.id + ')" style="flex:1;min-width:140px;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer">' + t('escTakeOwnership') + '</button>' +
              (canClearEscalation() ?
                '<button onclick="showSendBackForm(' + d.id + ')" style="flex:1;min-width:140px;background:#7A3200;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer">' + t('sendBackBtn') + '</button>'
              : '') +
            '</div>' +
            (canClearEscalation() ?
              '<div id="send-back-form-' + d.id + '" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #E6C77A">' +
                '<label style="font-size:12px;font-weight:600;color:#7A3200;display:block;margin-bottom:4px">' + t('sendBackNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
                '<textarea id="send-back-note-' + d.id + '" rows="3" placeholder="' + t('sendBackNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #E6A75A;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
                '<button onclick="sendBackToTech(' + d.id + ')" style="width:100%;background:#7A3200;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">↩️ ' + t('sendBackConfirmBtn') + '</button>' +
              '</div>'
            : '') +
          '</div>'
        ) : (
          // C: Owner FYI — plain escalation, Step In reassigns before resolve form
          '<div style="background:#F0F6FF;border:2px solid #92B4E3;border-radius:10px;padding:12px 14px;margin:10px 0">' +
            '<div style="font-weight:700;color:#1A3A6B;font-size:14px;margin-bottom:6px">👁 ' + t('escBannerFyiTitle') + '</div>' +
            '<div style="font-size:13px;color:#3a3a3a;line-height:1.5;margin-bottom:10px">' +
              '<div>' + t('escBannerFyiDesc').replace('{name}', (d.escalation && d.escalation.targetName) || 'Manager') + '</div>' +
              '<div style="margin-top:4px"><strong>' + t('escBannerBy') + ':</strong> ' + (d.escalation && d.escalation.by || '—') + (d.escalation && d.escalation.date ? ' ' + t('escBannerOn') + ' ' + d.escalation.date : '') + '</div>' +
              '<div style="margin-top:2px"><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
              ((d.escalation && d.escalation.note) ? '<div style="margin-top:6px;padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #BDD3EE;font-style:italic">' + d.escalation.note + '</div>' : '') +
            '</div>' +
            '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
            '<textarea id="take-ownership-note-' + d.id + '" rows="2" placeholder="' + t('takeOwnershipNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
            '<button onclick="takeOwnership(' + d.id + ')" style="width:100%;background:#2B4D8E;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">' + t('escStepInBtn') + '</button>' +
          '</div>'
        )
      ) : (
        // D: Technician — read-only pill
        '<div style="background:#F3EEFF;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin:10px 0;font-size:13px;color:#5B21B6"><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px" aria-hidden="true"></i> ' + t('escPill') + ' — ' + (d.escalation && d.escalation.reason || '') + '</div>'
      )
    ) : '') +
    // ----- HANDOFF LOG -----
    ((Array.isArray(d.handoffLog) && d.handoffLog.length > 0 && canSeeIssue(d) && canSeeDetailedRisk()) ? (
      '<div style="margin:14px 0">' +
        '<button onclick="toggleHandoffLog(' + d.id + ')" style="background:none;border:none;font-size:12px;font-weight:600;color:#555;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px">' +
          '<i class="ti ti-history" style="font-size:14px"></i> ' + t('handoffLogTitle') + ' (' + d.handoffLog.length + ') <i class="ti ti-chevron-down" style="font-size:12px" id="handoff-chevron-' + d.id + '"></i>' +
        '</button>' +
        '<div id="handoff-log-' + d.id + '" style="display:none;margin-top:8px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">' +
          [...d.handoffLog].reverse().map(function(entry, i) {
            const typeIcon = entry.type === 'escalate' ? '🚩' : entry.type === 'sendBack' ? '↩️' : entry.type === 'takeOwnership' ? '✋' : entry.type === 'partialFix' ? '⚡' : entry.type === 'resolved' ? '✅' : entry.type === 'observation' ? '👁' : '📋';
            const typeLabel = entry.type === 'escalate' ? t('handoffTypeEscalate') : entry.type === 'sendBack' ? t('handoffTypeSendBack') : entry.type === 'takeOwnership' ? t('handoffTypeTakeOwnership') : entry.type === 'partialFix' ? t('handoffTypePartialFix') : entry.type === 'resolved' ? t('handoffTypeResolved') : entry.type === 'observation' ? t('handoffTypeObservation') : t('handoffTypeAssign');
            return '<div style="padding:10px 12px;' + (i > 0 ? 'border-top:1px solid #f0f0f0;' : '') + 'background:#fafafa">' +
              '<div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">' + typeIcon + ' ' + typeLabel + ' — ' + entry.date + '</div>' +
              '<div style="font-size:12px;color:#555;margin-bottom:2px">' + (entry.from || '?') + ' → ' + (entry.to || '?') + '</div>' +
              '<div style="font-size:13px;color:#222;font-style:italic">"' + (entry.note || '') + '"</div>' +
              (entry.reason ? '<div style="font-size:11px;color:#888;margin-top:2px">' + t('escBannerReason') + ': ' + entry.reason + '</div>' : '') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    ) : '') +
    (canSeeIssue(d) && canSeeDetailedRisk() ? (
    '<div class="action-box">' +
      '<div class="action-label">' + t('recommendedAction') + '</div>' +
      '<div class="action-text">' + (d.resolved ? t('recActionResolved') : action) + '</div>' +
    '</div>' +
    // ----- PARTIAL FIX HISTORY BANNER -----
    // Only shown when NOT escalated (purple escalation banner above handles the escalated case)
    (d.partiallyResolved && !d.resolved && !d.needsOwnerAction ?
      '<div style="background:#F3EEFF;border:1px solid #C4B5FD;border-radius:10px;padding:12px 14px;margin:10px 0">' +
        '<div style="font-weight:700;color:#5B21B6;font-size:13px;margin-bottom:6px">⚡ ' + t('partiallyResolvedBadge') + '</div>' +
        '<div style="font-size:13px;color:#3B0764;line-height:1.5">' +
          '<div><strong>' + t('partialFixByLabel') + ':</strong> ' + (d.partialResolveBy || '—') + (d.partialResolveDate ? ' · ' + d.partialResolveDate : '') + '</div>' +
          '<div style="margin-top:4px;padding:8px 10px;background:#fff;border-radius:6px;border:1px solid #C4B5FD;font-style:italic">' + (d.partialResolveNote || '') + '</div>' +
        '</div>' +
      '</div>'
    : '') +
    // Password-manager guidance — only when pw not changed AND not using partial-resolve box
    // (partial box already covers the password fix step)
    ((d.pw === 'no' && !d.resolved) ? findDefaultLoginHTML(d) : '') +
    ((d.pw === 'no' && !d.resolved) ? pwManagerCardHTML() : '') +
    // Assignment status badge (shown for open, non-green issues)
    ((!d.resolved && getRisk(d.brand, d.pw) !== 'green') ?
      '<div style="display:flex;align-items:center;gap:8px;margin:10px 0;padding:8px 12px;border-radius:8px;font-size:13px;' +
        (d.assignedTo ? 'background:#EAF3EC;border:1px solid #BBD8C2;color:#1F4D2E' : 'background:#FBF6E9;border:1px solid #E6D8AE;color:#7A6514') + '">' +
        (d.assignedTo
          ? '<i class="ti ti-user-check"></i><span><strong>' + t('assignedToLabel') + ':</strong> ' + d.assignedTo + '</span>'
          : '<i class="ti ti-user-question"></i><span>' + t('unassignedLabel') + '</span>') +
      '</div>' : '')
    ) : '') +
    // ----- ASSIGN IT — only for users who can assign open, non-green issues -----
    ((canAssignIssues() && !d.resolved && (getRisk(d.brand, d.pw) !== 'green')) ? assignBoxHTML(d) : '') +
    // ----- ADDRESS THIS ISSUE — unified resolve/escalate toggle -----
    // One box, one clear choice, resolve is the default. Escalate is always
    // available as the alternative, never the only option — the assigned
    // person decides, they're not forced into escalating just because the
    // device also happens to have a structural (EOL/CVE) problem.
    (canResolveIssues(d) && canSeeIssue(d) &&
     (!d.needsOwnerAction || isEscalationPrimaryActor(d)) ? (
      (getRisk(d.brand, d.pw) === 'green' && !d.resolved ? verifyBoxHTML(d) : (
        '<div class="resolve-box" id="action-box-' + d.id + '">' +
          '<div class="resolve-title">' + t('addressIssueTitle') + '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:14px">' +
            '<button type="button" id="mode-resolve-btn-' + d.id + '" onclick="setIssueMode(' + d.id + ',\'resolve\')" class="filter-btn active" style="flex:1"><i class="ti ti-check" style="font-size:15px;vertical-align:-2px;margin-right:4px" aria-hidden="true"></i>' + t('modeResolveTab') + '</button>' +
            (shouldShowPartialResolveBox(d) ?
              '<button type="button" id="mode-escalate-btn-' + d.id + '" onclick="setIssueMode(' + d.id + ',\'escalate\')" class="filter-btn" style="flex:1"><i class="ti ti-flag" id="mode-escalate-icon-' + d.id + '" style="font-size:15px;vertical-align:-2px;margin-right:4px;color:#3B0764" aria-hidden="true"></i>' + t('modeEscalateTab') + '</button>'
            : '') +
          '</div>' +

          '<div id="mode-resolve-fields-' + d.id + '">' +
            '<p style="font-size:12px;color:#1F4D2E;line-height:1.5;margin:0 0 12px">' + t('resolveIntroDesc') + '</p>' +
            '<div style="background:#EAF3EC;border:1px solid #BBD8C2;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#1F4D2E;display:flex;gap:6px">' +
              '<i class="ti ti-device-floppy" style="font-size:15px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i>' +
              '<span>' + t('resolveStepCallout') + '</span>' +
            '</div>' +
            '<div class="health-box" style="margin-top:0">' +
              '<div class="health-title">' + t('healthTitle') + ' <span style="color:#A32D2D;font-size:11px;font-weight:600">* required</span></div>' +
              '<div id="health-warning-' + d.id + '" style="display:none;background:#FCEBEB;border:1px solid #F09595;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:12px;color:#791F1F;align-items:center;gap:6px">⚠️ Please select a device software update status before saving.</div>' +
              (Array.isArray(t('healthOpts')) ? t('healthOpts') : []).map(function(opt) {
                const sel = d.healthStatus === opt;
                return '<label class="health-opt ' + (sel ? 'selected' : '') + '">' +
                  '<input type="radio" name="health-' + d.id + '" value="' + opt + '" ' + (sel ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
                '</label>';
              }).join('') +
              (d.healthDate ? '<p class="health-stamp">' + t('healthStamp') + ' ' + d.healthDate + '</p>' : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;margin:12px 0 10px">' +
              (Array.isArray(t('resolveActions')) ? t('resolveActions') : []).map(function(opt) {
                const checked = d.resolveStatus && d.resolveStatus.split(',').map(s=>s.trim()).includes(opt);
                return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #ddd;border-radius:8px;background:' + (checked ? '#f0f9f3' : '#fff') + '">' +
                  '<input type="checkbox" value="' + opt + '" class="resolve-action" ' + (checked ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
                '</label>';
              }).join('') +
              (function() {
                const otherChecked = d.resolveStatus && d.resolveStatus.split(',').map(s=>s.trim()).some(s => s.startsWith('Other:'));
                const otherText = otherChecked ? d.resolveStatus.split(',').map(s=>s.trim()).find(s => s.startsWith('Other:')).replace('Other: ','') : '';
                return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #ddd;border-radius:8px;background:' + (otherChecked ? '#f0f9f3' : '#fff') + '">' +
                  '<input type="checkbox" id="resolve-other-check-' + d.id + '" ' + (otherChecked ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E" onchange="document.getElementById(\'resolve-other-text-' + d.id + '\').style.display = this.checked ? \'block\' : \'none\'">' + t('resolveOther') + '</label>' +
                  '<input type="text" id="resolve-other-text-' + d.id + '" placeholder="' + t('describeWhatDone') + '" value="' + otherText + '" style="display:' + (otherChecked ? 'block' : 'none') + ';width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;margin-top:-2px;font-family:inherit">';
              })() +
            '</div>' +
            '<div style="margin-bottom:12px">' +
              '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px">' + t('notes') + ' <span style="font-weight:400;color:#aaa">' + t('optional') + '</span></label>' +
              '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
              '<textarea id="resolve-note" rows="3" placeholder="' + t('notePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;resize:none;font-family:inherit">' + (d.resolveNote || '') + '</textarea>' +
            '</div>' +
            '<button class="resolve-btn" onclick="saveAll(' + d.id + ')" style="background:#1F4D2E;font-size:15px;padding:13px">' + t('saveBtn') + '</button>' +
          '</div>' +

          (shouldShowPartialResolveBox(d) ?
            '<div id="mode-escalate-fields-' + d.id + '" style="display:none">' +
              '<p style="font-size:12px;color:#5B21B6;margin:0 0 12px;line-height:1.4">' + t('partialResolveDesc') + '</p>' +
              (d.pw === 'no' ?
                '<div style="background:#EAF3EC;border:1px solid #BBD8C2;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#1F4D2E">🔑 ' + t('partialResolveStepPw') + '</div>'
              : '') +
              '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('partialFixNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
              '<textarea id="partial-fix-note-' + d.id + '" rows="2" placeholder="' + t('partialFixNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:12px"></textarea>' +
              '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('escReasonLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
              '<select id="partial-esc-reason-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:10px;background:#fff">' +
                '<option value="">' + t('escReasonPlaceholder') + '</option>' +
                (Array.isArray(t('escReasons')) ? t('escReasons') : []).map(function(r) {
                  return '<option value="' + r + '">' + r + '</option>';
                }).join('') +
              '</select>' +
              '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('escNoteLabel').replace('{target}', escalationTargetName()) + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
              '<textarea id="partial-esc-note-' + d.id + '" rows="2" placeholder="' + t('escNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:12px"></textarea>' +
              '<button onclick="partialResolveAndEscalate(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">⚡ ' + t('partialResolveBtn').replace('{target}', escalationTargetName()) + '</button>' +
            '</div>'
          : '') +
        '</div>'
      ))
    ) : '') +
    (d.resolved ? '<div class="resolved-badge" style="margin-top:14px">✅ Marked resolved: ' + d.resolveStatus + (d.resolveNote ? ' — ' + d.resolveNote : '') + (d.resolvedDate ? '<span style="font-weight:400;margin-left:8px;color:#555">(' + d.resolvedDate + ')</span>' : '') + '</div>' : '') +
    '<button onclick="toggleSettingsSection(\'device-details-' + d.id + '\', this)" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 0;background:none;border:none;border-top:1px solid #eee;cursor:pointer;text-align:left;margin-top:6px">' +
      '<span class="section-title" style="margin:0">' + t('deviceDetails') + '</span>' +
      '<span class="sec-arrow" style="font-size:14px;color:#888">▸</span>' +
    '</button>' +
    '<div id="sec-device-details-' + d.id + '" style="display:none">' +
    '<div class="detail-row"><span class="detail-key">' + t('detailBrand') + '</span><span class="detail-val">' + d.brand + '</span></div>' +
    (d.model ? '<div class="detail-row"><span class="detail-key">' + t('modelLabel') + '</span><span class="detail-val">' + d.model + '</span></div>' : '') +
    (d.serial ? '<div class="detail-row"><span class="detail-key">' + t('serialLabel') + '</span><span class="detail-val">' + d.serial + '</span></div>' : '') +
    (d.mac ? '<div class="detail-row"><span class="detail-key">' + t('macLabel') + '</span><span class="detail-val" style="font-family:monospace;font-size:13px">' + d.mac + '</span></div>' : '') +
    '<div class="detail-row"><span class="detail-key">' + t('deviceTypeLabel') + '</span><span class="detail-val">' + translateDeviceType(d.type) + '</span></div>' +
    (canSeeDetailedRisk() ? (
      '<div class="detail-row"><span class="detail-key">' + t('defaultPwChanged') + '</span><span class="detail-val">' + (d.pw==='yes'?t('detailPwYes'):t('detailPwNo')) + '</span></div>' +
      '<div class="detail-row"><span class="detail-key">' + t('manufacturerSupport') + '</span><span class="detail-val">' + t(info.support==='Limited'?'limitedLabel':info.support==='Supported'?'supportedLabel':'unknownLabel') + '</span></div>' +
      '<div class="detail-row"><span class="detail-key">' + t('knownVulnerabilities') + '</span><span class="detail-val">' + (info.cve > 0 ? info.cve + ' ' + t('cveFound') : t('cveNone')) + '</span></div>' +
      ((canResolveIssues(d) && canSeeIssue(d) && (d.brand || d.model)) ? '<div class="detail-row" style="margin-top:4px"><button onclick="checkVulnerabilities(' + d.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-weight:500">' + t('hwVulnCheck') + '</button></div>' : '') +
      '<div id="vuln-results-' + d.id + '" style="margin-top:8px"></div>' +
      (d.autoUpdate ? '<div class="detail-row"><span class="detail-key">Auto-update</span><span class="detail-val">' + d.autoUpdate + '</span></div>' : '') +
      (d.lastFirmware ? '<div class="detail-row"><span class="detail-key">Last device software update</span><span class="detail-val">' + new Date(d.lastFirmware).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) + '</span></div>' : '')
    ) : '') +
    '</div>' +
    (canSeeIssue(d) && canSeeDetailedRisk() ? deviceTimelineHTML(d) : '') +
    // ----- VIEW-ONLY note — user can neither resolve nor assign an open issue (but can see it) -----
    ((canSeeIssue(d) && !canResolveIssues() && !canAssignIssues() && !d.resolved && (getRisk(d.brand, d.pw) !== 'green')) ?
      (function() {
        const statusKey = farmHandNoteKey(d);
        const isCaution = d.farmHandStatus === 'use-caution' || d.farmHandStatus === 'do-not-use';
        const isFine = d.farmHandStatus === 'keep-using';
        const fh = isCaution
          ? { icon: 'ti-alert-triangle', color: '#7A6514', bg: '#FBF6E9', border: '#F5E9B8' }
          : isFine
          ? { icon: 'ti-thumb-up', color: '#1F4D2E', bg: '#EAF3EC', border: '#BBD8C2' }
          : { icon: 'ti-info-circle', color: '#555', bg: '#F4F6F8', border: '#dde2e6' };
        return '<div class="resolve-box" style="background:' + fh.bg + ';border:1px solid ' + fh.border + '">' +
          '<p style="font-size:13px;color:' + fh.color + ';margin:0;font-weight:600;display:flex;align-items:center;gap:8px"><i class="ti ' + fh.icon + '" style="font-size:16px" aria-hidden="true"></i> ' + t(statusKey) + '</p>' +
        '</div>';
      })() : '') +
    // ----- OBSERVATION — view-only roles can report something regardless of
    // current status; this is their only way to flag a new problem, so it
    // can't be nested inside the "already has a known issue" block above -----
    (!canSeeDetailedRisk() && canSeeIssue(d) ?
      '<div class="resolve-box" id="observation-box-' + d.id + '">' +
        '<div class="resolve-title">' + t('observationTitle') + '</div>' +
        '<p style="font-size:12px;color:#777;margin:-4px 0 10px">' + t('observationDesc') + '</p>' +
        '<textarea id="observation-note-' + d.id + '" rows="2" placeholder="' + t('observationPlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="submitObservation(' + d.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">' + t('observationBtn') + '</button>' +
      '</div>'
    : '') +
    // ----- ESCALATE: send to Manager (or Owner if no Manager) -----
    (canEscalateIssue(d) && !shouldShowPartialResolveBox(d) ? (
      '<div class="resolve-box" style="background:#FAF5FF;border:1px solid #C4B5FD;margin-top:10px">' +
        '<div class="resolve-title" style="color:#5B21B6"><i class="ti ti-flag" style="font-size:15px;vertical-align:-2px;color:#3B0764" aria-hidden="true"></i> ' + t('escTitle') + '</div>' +
        '<p style="font-size:12px;color:#5B21B6;margin:0 0 10px 0;line-height:1.4">' +
          t('escDesc').replace('{target}', escalationTargetName()) +
        '</p>' +
        '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('escReasonLabel') + '</label>' +
        '<select id="esc-reason-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:10px;background:#fff">' +
          '<option value="">' + t('escReasonPlaceholder') + '</option>' +
          (Array.isArray(t('escReasons')) ? t('escReasons') : []).map(function(r) {
            return '<option value="' + r + '">' + r + '</option>';
          }).join('') +
        '</select>' +
        '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' +
          t('escNoteLabel').replace('{target}', escalationTargetName()) +
        '</label>' +
        '<textarea id="esc-note-' + d.id + '" rows="2" placeholder="' + t('escNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="escalateIssue(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer"><i class="ti ti-flag" style="font-size:15px;vertical-align:-2px" aria-hidden="true"></i> ' +
          t('escSendBtn').replace('{target}', escalationTargetName()) +
        '</button>' +
      '</div>'
    ) : '');

  if (!keepScreen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-detail').classList.add('active');
  }
}

// Builds the "Assign this issue" box shown to users with assign permission.
// Toggles the unified resolve/escalate box between its two modes. Resolve is
// the default on every render — escalate is an available alternative the
// assigned person switches to, never the only path they're shown.
function setIssueMode(id, mode) {
  const resolveFields = document.getElementById('mode-resolve-fields-' + id);
  const escalateFields = document.getElementById('mode-escalate-fields-' + id);
  const resolveBtn = document.getElementById('mode-resolve-btn-' + id);
  const escalateBtn = document.getElementById('mode-escalate-btn-' + id);
  const escalateIcon = document.getElementById('mode-escalate-icon-' + id);
  if (resolveFields) resolveFields.style.display = mode === 'resolve' ? 'block' : 'none';
  if (escalateFields) escalateFields.style.display = mode === 'escalate' ? 'block' : 'none';
  if (resolveBtn) resolveBtn.classList.toggle('active', mode === 'resolve');
  if (escalateBtn) escalateBtn.classList.toggle('active-escalate', mode === 'escalate');
  if (escalateIcon) escalateIcon.style.color = mode === 'escalate' ? '#fff' : '#3B0764';
}

function assignBoxHTML(d) {
  const members = assignableMembers();
  if (members.length === 0) {
    return '<div class="resolve-box">' +
      '<div class="resolve-title">' + t('assignTitle') + '</div>' +
      '<p style="font-size:13px;color:#777;margin:0">' + t('noAssignableMembers') + '</p>' +
    '</div>';
  }
  const options = '<option value="">' + t('assignSelectPlaceholder') + '</option>' +
    members.map(function(m) {
      const sel = (d.assignedTo === m.name) ? ' selected' : '';
      const roleTag = m.role ? ' (' + m.role + ')' : '';
      return '<option value="' + m.name.replace(/"/g,'&quot;') + '"' + sel + '>' + m.name + roleTag + '</option>';
    }).join('');
  const primaryLabel = d.assignedTo ? t('reassignBtn') : t('assignBtn');
  const isReassign = !!d.assignedTo;
  const fhStatus = d.farmHandStatus || '';
  const fhOptions = ['', 'keep-using', 'use-caution'].map(function(val) {
    const sel = fhStatus === val ? ' selected' : '';
    const label = val === '' ? t('fhStatusDefault') : val === 'keep-using' ? t('fhStatusKeepUsing') : t('fhStatusUseCaution');
    return '<option value="' + val + '"' + sel + '>' + label + '</option>';
  }).join('');
  return '<div class="resolve-box">' +
    '<div class="resolve-title">' + t('assignTitle') + '</div>' +
    '<p style="font-size:12px;color:#777;margin:-4px 0 10px">' + t('assignDesc') + '</p>' +
    '<select id="assign-select-' + d.id + '" style="width:100%;font-size:14px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;font-family:inherit;margin-bottom:10px">' + options + '</select>' +
    '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('assignNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
    '<textarea id="assign-note-' + d.id + '" rows="2" placeholder="' + t('assignNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
    '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px">' + t('fhStatusLabel') + '</label>' +
    '<p style="font-size:11px;color:#888;margin:-2px 0 6px">' + t('fhStatusDesc') + '</p>' +
    '<select id="fh-status-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;font-family:inherit;margin-bottom:10px">' + fhOptions + '</select>' +
    '<div style="display:flex;gap:8px">' +
      '<button class="resolve-btn" onclick="assignIssue(' + d.id + ')" style="background:#1F4D2E;flex:1">' + primaryLabel + '</button>' +
      (isReassign ? '<button class="resolve-btn" onclick="unassignIssue(' + d.id + ')" style="background:#fff;color:#A32D2D;border:1px solid #E0B4B4;flex:0 0 auto;padding-left:16px;padding-right:16px">' + t('unassignBtn') + '</button>' : '') +
    '</div>' +
  '</div>';
}

function assignIssue(id) {
  if (!canAssignIssues()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  const sel = document.getElementById('assign-select-' + id);
  const noteEl = document.getElementById('assign-note-' + id);
  const fhStatusEl = document.getElementById('fh-status-' + id);
  if (!sel) return;
  const name = sel.value;
  const noteVal = noteEl ? noteEl.value.trim() : '';
  if (!name) { alert(t('assignSelectPlaceholder')); return; }
  if (!noteVal) { alert(t('handoffNoteRequired')); return; }
  const prev = d.assignedTo;
  d.assignedTo = name;
  d.farmHandStatus = fhStatusEl ? fhStatusEl.value : '';
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: prev ? 'reassign' : 'assign',
    from: currentUser.name || currentUser.role,
    to: name,
    note: noteVal,
    date: localTimestamp()
  });
  logAction(prev ? 'Reassigned issue' : 'Assigned issue',
    (d.label || d.type) + ' → ' + name + (prev ? ' (was ' + prev + ')' : '') + ' | ' + noteVal);
  renderDashList();
  renderDeviceList();
  showDetail(id);
}

function unassignIssue(id) {
  if (!canAssignIssues()) return;
  const d = devices.find(x => x.id === id);
  if (!d) return;
  const prev = d.assignedTo;
  d.assignedTo = '';
  logAction('Cleared assignment', (d.label || d.type) + (prev ? ' (was ' + prev + ')' : ''));
  renderDashList();
  renderDeviceList();
  showDetail(id);
}

function showScreen(name, btn) {
  // Leaving any detail view; will be re-set if a detail is opened afterward.
  if (name !== 'network') currentDetailView = null;
  // Apps inventory is Owner-only — block direct entry even if somehow triggered
  // by a non-Owner (e.g. stale UI state), same defense-in-depth as other role gates.
  if (name === 'apps' && !canSeeApps()) { name = 'dashboard'; btn = document.querySelector('.nav-btn'); }
  if (name === 'backups' && !canSeeBackups()) { name = 'dashboard'; btn = document.querySelector('.nav-btn'); }
  if (name === 'network' && !canSeeNetworkIssue()) { name = 'dashboard'; btn = document.querySelector('.nav-btn'); }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  // Log every tab visit so the activity log shows a full picture of who
  // viewed what and when — not just actions taken.
  var screenNames = { dashboard: 'Dashboard', devices: 'Devices', network: 'Network', settings: 'Settings', apps: 'Apps', backups: 'Backups' };
  if (screenNames[name]) logAction(t('logViewedTab').replace('{tab}', screenNames[name]), '');
  if (name === 'dashboard') renderDashList();
  if (name === 'devices') { renderDeviceList(); hideAddForm(); }
  if (name === 'settings') renderSettings();
  if (name === 'network') {
    const netForm = document.getElementById('net-add-form');
    if (netForm && netForm.style.display === 'block') toggleNetAddForm();
    renderNetworkList();
  }
  if (name === 'apps') {
    const appForm = document.getElementById('app-add-form');
    if (appForm && appForm.style.display === 'block') toggleAppAddForm();
    renderAppsList();
  }
  if (name === 'backups') renderBackupScreen();
}

function showAddForm() {
  const inline = document.getElementById('add-device-inline');
  const form = document.getElementById('screen-add');
  if (!inline || !form) return;
  if (inline.style.display === 'block') { hideAddForm(); return; }
  // Hide device list and filters while adding
  const deviceList = document.getElementById('device-list');
  const filterRow = document.querySelector('#screen-devices .filter-row');
  const sortRow = document.querySelector('#screen-devices .sort-row');
  if (deviceList) deviceList.style.display = 'none';
  if (filterRow) filterRow.style.display = 'none';
  if (sortRow) sortRow.style.display = 'none';
  // Clone the add form content into inline div
  inline.innerHTML = form.innerHTML;
  inline.style.display = 'block';
  // Re-attach event handlers by re-setting onclick for the submit button
  const btn = inline.querySelector('.submit-btn');
  if (btn) btn.onclick = addDevice;
  // Translate all form elements in the cloned inline form
  const safeInline = (sel, val) => { const el = inline.querySelector(sel); if(el) el.textContent = val; };
  const phInline = (sel, val) => { const el = inline.querySelector(sel); if(el) el.placeholder = val; };
  safeInline('[id="lbl-add-device-title"]', t('addADevice'));
  safeInline('[id="lbl-brand"]', t('brandLabel'));
  safeInline('[id="lbl-mfr-model"]', t('mfrModelNum'));
  safeInline('[id="lbl-security-lookups"]', t('usedForLookups'));
  safeInline('[id="lbl-serial"]', t('serialLabel') + ' ');
  // MAC label has a child span so update its first text node in the cloned form
  (function(){ var el=inline.querySelector('[id="lbl-mac"]'); if(el&&el.childNodes[0]&&el.childNodes[0].nodeType===3) el.childNodes[0].textContent=t('macFieldLabel')+' '; })();
  safeSet('lbl-mac-hint', t('macHint'));
  safeInline('[id="lbl-device-label"]', t('deviceNameLabel') + ' ');
  safeInline('[id="lbl-location"]', t('locationLabel'));
  safeInline('[id="lbl-conn-type"]', t('connectionLabel'));
  safeInline('[id="lbl-dealer"]', t('dealerLabel') + ' ');
  safeInline('[id="lbl-pw-changed"]', t('hasPwChanged'));
  safeInline('[id="lbl-add-device-btn"]', t('addBtn'));
  safeInline('[id="lbl-pw-yes"]', t('pwYes'));
  safeInline('[id="lbl-pw-no"]', t('pwNo'));
  safeInline('[id="opt-select-brand"]', t('selectBrand'));
  safeInline('[id="opt-other-brand"]', t('otherNotListed'));
  safeInline('[id="opt-select-type"]', t('selectType'));
  safeInline('[id="opt-type-irrigation"]', t('typeIrrigation'));
  safeInline('[id="opt-type-livestock"]', t('typeLivestock'));
  safeInline('[id="opt-type-soil"]', t('typeSoil'));
  safeInline('[id="opt-type-camera"]', t('cameraType'));
  safeInline('[id="opt-type-gps"]', t('typeGPS'));
  safeInline('[id="opt-type-barn-vent"]', t('typeBarnVent'));
  safeInline('[id="opt-type-drone"]', t('typeDrone'));
  safeInline('[id="opt-type-feed"]', t('typeFeed'));
  safeInline('[id="opt-other-type"]', t('otherNotListed'));
  safeInline('[id="opt-select-location"]', t('selectLocation'));
  safeInline('[id="opt-loc-barn"]', t('locationBarn'));
  safeInline('[id="opt-loc-main"]', t('locationMainHouse'));
  safeInline('[id="opt-loc-north"]', t('locationNorthField'));
  safeInline('[id="opt-loc-south"]', t('locationSouthField'));
  safeInline('[id="opt-loc-east"]', t('locationEastField'));
  safeInline('[id="opt-loc-west"]', t('locationWestField'));
  safeInline('[id="opt-loc-pasture"]', t('locationPasture'));
  safeInline('[id="opt-loc-grain"]', t('locationGrainBins'));
  safeInline('[id="opt-loc-dairy"]', t('locationDairyBarn'));
  safeInline('[id="opt-loc-machine"]', t('locationMachineShed'));
  safeInline('[id="opt-loc-custom"]', t('addCustomLocation'));
  safeInline('[id="opt-select-conn"]', t('selectConnType'));
  safeInline('[id="opt-conn-unknown"]', t('unknownLabel'));
  // Credential warning in cloned form
  const credWarn = inline.querySelector('.cred-warn-text');
  if (credWarn) credWarn.textContent = t('credWarning');
  phInline('#brand-input', t('enterBrandPlaceholder'));
  phInline('#device-model', t('modelPlaceholder'));
  phInline('#device-serial', t('serialPlaceholder'));
  phInline('#type-input', t('enterTypePlaceholder'));
  phInline('#device-label', t('deviceLabelPlaceholder'));
  phInline('#location-input', t('customLocationPlaceholder'));
  phInline('#device-contact-notes', t('dealerPlaceholder'));
  const brandSel = inline.querySelector('#brand-select');
  if (brandSel) brandSel.onchange = function() { handleBrandSelect(this); };
  const typeSel = inline.querySelector('#type-select');
  if (typeSel) typeSel.onchange = function() { handleTypeSelect(this); };
  const locSel = inline.querySelector('#location-select');
  if (locSel) locSel.onchange = function() { handleLocationSelect(this); };
}

function hideAddForm() {
  const inline = document.getElementById('add-device-inline');
  if (inline) inline.style.display = 'none';
  // Restore device list and filters
  const deviceList = document.getElementById('device-list');
  const filterRow = document.querySelector('#screen-devices .filter-row');
  const sortRow = document.querySelector('#screen-devices .sort-row');
  if (deviceList) deviceList.style.display = '';
  if (filterRow) filterRow.style.display = '';
  if (sortRow) sortRow.style.display = '';
}

function selectPw(el, val) {
  document.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function addDevice() {
  // Read from inline form if open, otherwise from screen-add
  const inline = document.getElementById('add-device-inline');
  const fromInline = inline && inline.style.display === 'block';
  const ctx = fromInline ? inline : document;
  const getVal = (id) => { const el = ctx.getElementById ? ctx.getElementById(id) : ctx.querySelector('#' + id); return el ? el.value : ''; };
  const getChecked = (name) => { const el = ctx.querySelector ? ctx.querySelector('input[name="' + name + '"]:checked') : document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; };

  let brand = getVal('brand-select');
  let type = getVal('type-select');

  // Resolve custom brand
  if (brand === '__other_brand__') {
    const customBrand = document.getElementById('custom-brand-input').value.trim();
    if (!customBrand) { alert(t('enterBrandName')); return; }
    brand = resolveCustomBrand(customBrand);
    if (!brand) return;
    document.getElementById('custom-brand-input').value = '';
    document.getElementById('custom-brand-row').style.display = 'none';
  }

  // Resolve custom type
  if (type === '__other_type__') {
    const customType = document.getElementById('custom-type-input').value.trim();
    if (!customType) { alert(t('enterDeviceType')); return; }
    type = resolveCustomType(customType);
    if (!type) return;
    document.getElementById('custom-type-input').value = '';
    document.getElementById('custom-type-row').style.display = 'none';
  }
  const label = document.getElementById('device-label').value.trim();
  const model = getVal('device-model') ? getVal('device-model').trim() : '';
  const serial = getVal('device-serial') ? getVal('device-serial').trim() : '';
  const mac = getVal('device-mac') ? getVal('device-mac').trim() : '';
  const pw = document.querySelector('input[name="pw"]:checked') ? document.querySelector('input[name="pw"]:checked').value : null;
  if (!brand || !type || !pw) { alert('Please complete all fields before adding the device.'); return; }
  const contactNotes = document.getElementById('device-contact-notes') ? document.getElementById('device-contact-notes').value.trim() : '';
  devices.push({ id: nextId++, addedDate: localTimestamp(), flaggedDate: (pw === 'no' ? localTimestamp() : ''), brand: brand, type: type, label: label || type, model: model, serial: serial, mac: mac, pw: pw, contactNotes: contactNotes, resolved: false, resolveStatus: '', resolveNote: '', resolvedDate: '', verifiedDate: '', autoUpdate: '', lastFirmware: '', firmwareCheckedDate: '' });
  logAction('Device added', (label || type) + ' (' + brand + ')' + (pw === 'no' ? ' — default password flagged' : ''));
  document.getElementById('brand-select').value = '';
  if (document.getElementById('device-model')) document.getElementById('device-model').value = '';
  if (document.getElementById('device-serial')) document.getElementById('device-serial').value = '';
  if (document.getElementById('device-mac')) document.getElementById('device-mac').value = '';
  if (document.getElementById('device-contact-notes')) document.getElementById('device-contact-notes').value = '';
  document.getElementById('location-select').value = '';
  document.getElementById('connection-select').value = '';
  document.getElementById('custom-location-row').style.display = 'none';
  document.getElementById('type-select').value = '';
  document.getElementById('device-label').value = '';
  document.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('input[name="pw"]').forEach(r => r.checked = false);
  showScreen('devices', document.querySelectorAll('.nav-btn')[1]);
}

// Team members
