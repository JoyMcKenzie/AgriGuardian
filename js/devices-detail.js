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
    return '<div style="display:flex;align-items:flex-start;gap:9px;border:1px solid #D7E4D7;border-radius:8px;padding:9px 11px">' +
      '<i class="ti ' + icon + '" style="font-size:17px;color:#1A5FA8;flex-shrink:0;margin-top:1px"></i>' +
      '<div><div style="font-size:13px;font-weight:600;color:#222">' + title + '</div>' +
      '<div style="font-size:12px;color:#777;line-height:1.5">' + body + '</div></div>' +
    '</div>';
  }
  var steps = step('ti-tag', t('fdlLabelTitle'), t('fdlLabelBody')) +
    step('ti-book-2', t('fdlManualTitle'), t('fdlManualBody') + (modelHint ? ' <span style="color:#222">"' + modelHint + '"</span>.' : '.')) +
    (dealerLine ? step('ti-phone', t('fdlDealerTitle'), t('fdlDealerOnFile') + ' ' + dealerLine) : '');

  return '<div style="background:#F3F8F2;border:1px solid #D7E4D7;border-radius:12px;padding:14px;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
      '<i class="ti ti-login" style="font-size:20px;color:#1A5FA8"></i>' +
      '<span style="font-size:15px;font-weight:600;color:#222">' + t('fdlTitle') + '</span>' +
    '</div>' +
    '<p style="font-size:13px;line-height:1.6;color:#5F7266;margin:0 0 12px">' + t('fdlIntro') + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">' + steps + '</div>' +
    '<div style="display:flex;align-items:flex-start;gap:8px;background:#FBF6E9;border:1px solid #EF9F27;border-radius:8px;padding:8px 10px">' +
      '<i class="ti ti-alert-triangle" style="font-size:16px;color:#854F0B;flex-shrink:0;margin-top:1px"></i>' +
      '<span style="font-size:12px;line-height:1.5;color:#633806">' + t('fdlWarning') + '</span>' +
    '</div>' +
  '</div>';
}

function pwManagerCardHTML() {
  var rows = PW_MANAGERS.map(function(m) {
    var freeTag = m.free
      ? '<span style="font-size:10px;color:#14381F;background:#E2EFE8;border-radius:6px;padding:1px 6px;margin-left:6px">' + t('pwmFreeTag') + '</span>'
      : '';
    return '<div style="display:flex;align-items:center;gap:10px;border:1px solid #D7E4D7;border-radius:8px;padding:9px 11px">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:#222">' + m.name + freeTag + '</div>' +
        '<div style="font-size:11px;color:#777">' + t(m.descKey) + '</div>' +
      '</div>' +
      '<a href="' + m.url + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#1F4D2E;border:1px solid #BBD8C2;border-radius:6px;padding:3px 9px;white-space:nowrap;text-decoration:none">' + t('pwmVisit') + ' <i class="ti ti-external-link" style="font-size:13px"></i></a>' +
    '</div>';
  }).join('');
  return '<div style="background:#F3F8F2;border:1px solid #D7E4D7;border-radius:12px;padding:14px;margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<i class="ti ti-key" style="font-size:20px;color:#1F4D2E"></i>' +
      '<span style="font-size:15px;font-weight:600;color:#222">' + t('pwmTitle') + '</span>' +
    '</div>' +
    '<p style="font-size:13px;line-height:1.6;color:#5F7266;margin:0 0 8px">' + t('pwmIntro') + '</p>' +
    '<div style="display:flex;align-items:flex-start;gap:8px;background:#E2EFE8;border:1px solid #BBD8C2;border-radius:8px;padding:8px 10px;margin-bottom:12px">' +
      '<i class="ti ti-shield-check" style="font-size:16px;color:#1F4D2E;flex-shrink:0;margin-top:1px"></i>' +
      '<span style="font-size:12px;line-height:1.5;color:#14381F">' + t('pwmNeverStores') + '</span>' +
    '</div>' +
    '<p style="font-size:11px;font-weight:600;color:#7A8F80;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">' + t('pwmTrustedOptions') + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' + rows + '</div>' +
    '<p style="font-size:11px;line-height:1.5;color:#7A8F80;margin:10px 0 0">' + t('pwmDisclaimer') + '</p>' +
  '</div>';
}

// Returns bare timeline rows (no wrapping button/section) — merged into the
// "Device history" accordion alongside the handoff log, rather than being
// its own separate collapsible the way it used to be.
function deviceTimelineHTML(d) {
  var events = [];

  // Device added (uses installed/purchase hint from contactNotes if present, else generic)
  events.push({ date: d.addedDate || '', icon: 'ti-plus', color: '#1A5FA8', label: t('tlAdded') });

  // Current risk state — show when first flagged
  var risk = getRisk(d.brand, d.pw, d.healthStatus);
  if (!d.resolved && risk !== 'green') {
    events.push({ date: d.flaggedDate || '', icon: 'ti-alert-triangle', color: (risk === 'red' ? '#E24B4A' : '#D4C000'),
      label: (risk === 'red' ? t('tlFlaggedHigh') : t('tlFlaggedAttention')) });
  }

  // Assignment
  if (d.assignedTo) {
    events.push({ date: '', icon: 'ti-user-check', color: '#1F4D2E', label: t('tlAssigned') + ' ' + d.assignedTo });
  }

  // Health/update status recorded
  if (d.healthStatus) {
    events.push({ date: d.healthDate || '', icon: 'ti-refresh', color: '#1A5FA8',
      label: t('tlHealthSet') + ' ' + tHealth(d.healthStatus) });
  }

  // Resolved
  if (d.resolved) {
    events.push({ date: d.resolvedDate || '', icon: 'ti-circle-check', color: '#2E7A4E',
      label: t('tlResolved') + (d.resolveStatus ? ' — ' + tResolveStatus(d.resolveStatus, 'device') : '') });
  }

  // Verified
  if (d.verifiedDate) {
    events.push({ date: d.verifiedDate, icon: 'ti-shield-check', color: '#2E7A4E', label: t('tlVerified') });
  }

  if (events.length === 0) return '';

  return events.map(function(e, i) {
    var isLast = (i === events.length - 1);
    return '<div style="display:flex;gap:10px;position:relative">' +
        '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">' +
          '<div style="width:24px;height:24px;border-radius:50%;background:' + e.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ' + e.icon + '" style="color:#fff;font-size:14px"></i></div>' +
          (isLast ? '' : '<div style="width:2px;flex:1;background:#e0e0e0;margin:2px 0"></div>') +
        '</div>' +
        '<div style="padding-bottom:' + (isLast ? '0' : '14px') + ';flex:1;min-width:0">' +
          '<div style="font-size:13px;color:#22372A">' + e.label + '</div>' +
          (e.date ? '<div style="font-size:11px;color:#7A8F80">' + e.date + '</div>' : '') +
        '</div>' +
      '</div>';
  }).join('');
}

// Bare handoff log rows (no wrapping toggle button) — merged into the same
// "Device history" accordion section as the timeline above.
function handoffLogRowsHTML(d) {
  if (!Array.isArray(d.handoffLog) || d.handoffLog.length === 0) return '';
  return [...d.handoffLog].reverse().map(function(entry, i) {
    const typeIcon = entry.type === 'escalate' ? '🚩' : entry.type === 'sendBack' ? '↩️' : entry.type === 'takeOwnership' ? '✋' : entry.type === 'partialFix' ? '⚡' : entry.type === 'resolved' ? '✅' : entry.type === 'observation' ? '👁' : entry.type === 'observationDismissed' ? '☑️' : entry.type === 'investigationNoIssue' ? '✅' : entry.type === 'investigationConfirmed' ? '🔧' : entry.type === 'operationalIssueCleared' ? '☑️' : '📋';
    const typeLabel = entry.type === 'escalate' ? t('handoffTypeEscalate') : entry.type === 'sendBack' ? t('handoffTypeSendBack') : entry.type === 'takeOwnership' ? t('handoffTypeTakeOwnership') : entry.type === 'partialFix' ? t('handoffTypePartialFix') : entry.type === 'resolved' ? t('handoffTypeResolved') : entry.type === 'observation' ? t('handoffTypeObservation') : entry.type === 'observationDismissed' ? t('handoffTypeObservationDismissed') : entry.type === 'investigationNoIssue' ? t('handoffTypeInvestigationNoIssue') : entry.type === 'investigationConfirmed' ? t('handoffTypeInvestigationConfirmed') : entry.type === 'operationalIssueCleared' ? t('handoffTypeOperationalIssueCleared') : t('handoffTypeAssign');
    return '<div style="padding:10px 12px;' + (i > 0 ? 'border-top:1px solid #E4EEE4;' : '') + 'background:#F3F8F2">' +
      '<div style="font-size:11px;font-weight:700;color:#7A8F80;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">' + typeIcon + ' ' + typeLabel + ' — ' + entry.date + '</div>' +
      '<div style="font-size:12px;color:#5F7266;margin-bottom:2px">' + (entry.from || '?') + ' → ' + (entry.to || '?') + '</div>' +
      '<div style="font-size:13px;color:#222;font-style:italic">"' + (entry.note || '') + '"</div>' +
      (entry.reason ? '<div style="font-size:11px;color:#7A8F80;margin-top:2px">' + t('escBannerReason') + ': ' + entry.reason + '</div>' : '') +
    '</div>';
  }).join('');
}

// ─── Consolidated decision slot ─────────────────────────────────────────────
// Replaces 4 previously-scattered, mutually-exclusive banner blocks (returned-
// to-tech, the 3-case escalation banner, and a standalone "escalate to owner"
// box that used to render as the very last thing on the page) with ONE
// function returning ONE piece of content. This is what actually prevents the
// "device shows contradictory/duplicate banners" class of bug — there's only
// ever one thing to return, not several independently-gated blocks that can
// coexist by accident.
function deviceDecisionSlotHTML(d) {
  if (!canSeeIssue(d) || d.archived) return '';

  // Case: sent back down for rework (amber) — distinct concept from escalation
  if (d.returnedToTech && !d.resolved) {
    return '<div style="background:#FFF3E0;border:2px solid #E6823A;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
      '<div style="font-weight:700;color:#7A3200;font-size:14px;margin-bottom:6px">↩️ ' + t('returnedBannerTitle') + '</div>' +
      '<div style="font-size:13px;color:#22372A;line-height:1.5;margin-bottom:8px">' +
        '<div><strong>' + t('returnedBannerFrom') + ':</strong> ' + (d.returnedBy || t('roleManager')) + '</div>' +
        '<div style="margin-top:4px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #E6C7AA;font-style:italic">' + (d.returnNote || '') + '</div>' +
      '</div>' +
      '<p style="font-size:12px;color:#7A3200;margin:0">' + t('returnedBannerHint') + '</p>' +
    '</div>';
  }

  // Case: currently escalated upward — needs someone's decision or is FYI/read-only
  if (d.needsOwnerAction && !d.resolved && canSeeDetailedRisk()) {
    if (canSeeEscalationBanner(d)) {
      // A: partially-resolved + escalated — Owner sees one purple banner
      if (d.partiallyResolved && currentUser.role === 'Owner') {
        return '<div style="background:#EFEAF7;border:2px solid #5B21B6;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
          '<div style="font-weight:700;color:#5B21B6;font-size:14px;margin-bottom:8px">⚡ ' + t('partialEscBannerTitle') + '</div>' +
          '<div style="font-size:13px;color:#3B0764;line-height:1.5;margin-bottom:10px">' +
            '<div style="font-weight:600;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#5B21B6">' + t('partialEscWhatFixed').replace('{name}', d.partialResolveBy || t('roleTechnician')) + '</div>' +
            '<div style="padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #C4B5FD;font-style:italic;margin-bottom:10px">' + (d.partialResolveNote || '—') + '</div>' +
            '<div style="font-weight:600;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#5B21B6">' + t('partialEscWhatRemains') + '</div>' +
            '<div><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
            ((d.escalation && d.escalation.note) ? '<div style="padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #C4B5FD;font-style:italic;margin-top:6px">' + d.escalation.note + '</div>' : '') +
            '<div style="margin-top:8px;font-size:12px;color:#5B21B6;background:#EFEAF7;border-radius:6px;padding:6px 10px">' + t('partialEscHandledBy').replace('{name}', (d.escalation && d.escalation.targetName) || t('roleManager')) + '</div>' +
          '</div>' +
          '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
          '<textarea id="take-ownership-note-' + d.id + '" rows="2" placeholder="' + t('takeOwnershipNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
          '<button onclick="takeOwnership(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">' + t('escStepInBtn') + '</button>' +
        '</div>';
      }
      // B: primary actor (Manager, or Owner when no Manager) — full decision banner
      if (isEscalationPrimaryActor(d)) {
        return '<div style="background:#EFEAF7;border:2px solid #5B21B6;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
          '<div style="font-weight:700;color:#5B21B6;font-size:14px;margin-bottom:6px"><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px" aria-hidden="true"></i> ' + t('escBannerTitle') + '</div>' +
          (d.partiallyResolved ?
            '<div style="background:#F3F8F2;border:1px solid #C4B5FD;border-radius:8px;padding:8px 10px;margin-bottom:10px">' +
              '<div style="font-size:11px;font-weight:600;color:#5B21B6;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px">⚡ ' + t('partialEscWhatFixed').replace('{name}', d.partialResolveBy || t('roleTechnician')) + '</div>' +
              '<div style="font-size:13px;color:#3B0764;font-style:italic">' + (d.partialResolveNote || '') + '</div>' +
            '</div>'
          : '') +
          '<div style="font-size:13px;color:#3B0764;line-height:1.5;margin-bottom:10px">' +
            '<div><strong>' + t('escBannerBy') + ':</strong> ' + (d.escalation && d.escalation.by || '—') + (d.escalation && d.escalation.date ? ' ' + t('escBannerOn') + ' ' + d.escalation.date : '') + '</div>' +
            '<div style="margin-top:2px"><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
            ((d.escalation && d.escalation.note) ? '<div style="margin-top:6px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #C4B5FD;font-style:italic">' + d.escalation.note + '</div>' : '') +
          '</div>' +
          '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
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
        '</div>';
      }
      // C: Owner FYI when Manager is the primary target
      return '<div style="background:#E6F0FA;border:2px solid #92B4E3;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
        '<div style="font-weight:700;color:#1A5FA8;font-size:14px;margin-bottom:6px">👁 ' + t('escBannerFyiTitle') + '</div>' +
        '<div style="font-size:13px;color:#22372A;line-height:1.5;margin-bottom:10px">' +
          '<div>' + t('escBannerFyiDesc').replace('{name}', (d.escalation && d.escalation.targetName) || t('roleManager')) + '</div>' +
          '<div style="margin-top:4px"><strong>' + t('escBannerBy') + ':</strong> ' + (d.escalation && d.escalation.by || '—') + (d.escalation && d.escalation.date ? ' ' + t('escBannerOn') + ' ' + d.escalation.date : '') + '</div>' +
          '<div style="margin-top:2px"><strong>' + t('escBannerReason') + ':</strong> ' + (d.escalation && d.escalation.reason || '—') + '</div>' +
          ((d.escalation && d.escalation.note) ? '<div style="margin-top:6px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #92B4E3;font-style:italic">' + d.escalation.note + '</div>' : '') +
        '</div>' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('handoffNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
        '<textarea id="take-ownership-note-' + d.id + '" rows="2" placeholder="' + t('takeOwnershipNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="takeOwnership(' + d.id + ')" style="width:100%;background:#1A5FA8;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">' + t('escStepInBtn') + '</button>' +
      '</div>';
    }
    // D: Technician who escalated — read-only pill
    return '<div style="background:#EFEAF7;border:1px solid #C4B5FD;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px;color:#5B21B6"><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px" aria-hidden="true"></i> ' + t('escPill') + ' — ' + (d.escalation && d.escalation.reason || '') + '</div>';
  }

  // Case: Owner/Manager assigned to self, structural issue still open, not
  // currently escalated — same visual slot as the escalation banner above,
  // but framed as "you've taken this on" rather than "someone needs a
  // decision." This is what used to be a standalone box at the very bottom
  // of the page; it's now in the same slot, so position never jumps.
  if ((currentUser.role === 'Owner' || currentUser.role === 'Manager') &&
      d.assignedTo === currentUser.name && hasStructuralIssue(d) && !d.resolved) {
    const canEscFurther = canEscalateIssue(d);
    return '<div style="background:#E2EFE8;border:2px solid #1F4D2E;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
      '<div style="font-weight:700;color:#1F4D2E;font-size:14px;margin-bottom:6px">✋ ' + t('ownershipTakenTitle') + '</div>' +
      '<div style="font-size:13px;color:#17391F;line-height:1.5;' + (canEscFurther ? 'margin-bottom:10px' : '') + '">' + t('ownershipTakenDesc') + '</div>' +
      (canEscFurther ?
        '<button onclick="document.getElementById(\'esc-inline-form-' + d.id + '\').style.display=(document.getElementById(\'esc-inline-form-' + d.id + '\').style.display===\'none\'?\'block\':\'none\')" style="width:100%;background:#F3F8F2;color:#5B21B6;border:1px solid #C4B5FD;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer"><i class="ti ti-flag" style="font-size:14px;vertical-align:-2px;color:#5B21B6" aria-hidden="true"></i> ' + t('escalateToOwnerInsteadBtn') + '</button>' +
        '<div id="esc-inline-form-' + d.id + '" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #BBD8C2">' +
          '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('escReasonLabel') + '</label>' +
          '<select id="esc-reason-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:10px;background:#F3F8F2">' +
            '<option value="">' + t('escReasonPlaceholder') + '</option>' +
            (Array.isArray(t('escReasons')) ? t('escReasons') : []).map(function(r) {
              return '<option value="' + r + '">' + r + '</option>';
            }).join('') +
          '</select>' +
          '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('escNoteLabel').replace('{target}', t('roleOwner')) + '</label>' +
          '<textarea id="esc-note-' + d.id + '" rows="2" placeholder="' + t('escNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
          '<button onclick="escalateIssue(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">' + t('escSendBtn').replace('{target}', t('roleOwner')) + '</button>' +
        '</div>'
      : '') +
    '</div>';
  }

  // Case: known operational issue, confirmed but not yet cleared (2026-07-07).
  // Distinct from both "resolved" (a security fix) and "nothing wrong" (green)
  // — this is for findings like Joy's satellite example: not a password/brand
  // issue, genuinely still a problem, but outside what getRisk() models at
  // all. Stays visible (amber, not green, not the urgent investigation blue)
  // until someone explicitly clears it once actually fixed — never silently
  // reverts to a calm banner while something confirmed is still wrong.
  if (d.knownOperationalIssue && canClearEscalation()) {
    return '<div style="background:#FBF6E9;border:2px solid #EF9F27;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
      '<div style="font-weight:700;color:#854F0B;font-size:14px;margin-bottom:6px"><i class="ti ti-tool" style="font-size:15px;vertical-align:-2px" aria-hidden="true"></i> ' + t('opIssueTitle') + '</div>' +
      '<div style="font-size:13px;color:#633806;line-height:1.5;margin-bottom:10px">' +
        '<div><strong>' + t('opIssueConfirmedBy') + ':</strong> ' + (d.operationalIssueBy || '—') + (d.operationalIssueDate ? ' · ' + d.operationalIssueDate : '') + '</div>' +
        '<div style="margin-top:4px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #F5D799;font-style:italic">' + (d.operationalIssueNote || '') + '</div>' +
      '</div>' +
      '<button onclick="clearOperationalIssue(' + d.id + ')" style="width:100%;background:#F3F8F2;color:#854F0B;border:1px solid #EF9F27;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer">' + t('opIssueClearBtn') + '</button>' +
    '</div>';
  }

  // Case: assigned to investigate a reported observation (2026-07-07). Distinct
  // from the plain "reported" banner below — this stays visible the whole
  // time someone's actually looking into it, so an assignment can never make
  // the report just silently vanish back to a calm-looking page. Closes with
  // a real either/or, not a passive checkbox: did they find an actual
  // problem, or was it nothing?
  if (d.observationInvestigating && canClearEscalation()) {
    const lastObs = Array.isArray(d.handoffLog) ? [...d.handoffLog].reverse().find(e => e.type === 'observation') : null;
    return '<div style="background:#E6F0FA;border:2px dashed #1A5FA8;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
      '<div style="font-weight:700;color:#1A5FA8;font-size:14px;margin-bottom:6px"><i class="ti ti-search" style="font-size:15px;vertical-align:-2px" aria-hidden="true"></i> ' + t('obsInvestigatingTitle') + '</div>' +
      '<div style="font-size:13px;color:#22372A;line-height:1.5;margin-bottom:10px">' +
        '<div><strong>' + t('obsInvestigatingAssignedTo') + ':</strong> ' + (d.assignedTo || '—') + '</div>' +
        '<div><strong>' + t('obsBannerBy') + ':</strong> ' + (lastObs ? lastObs.from : '—') + (lastObs ? ' · ' + lastObs.date : '') + '</div>' +
        '<div style="margin-top:4px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #92B4E3;font-style:italic">' + (lastObs ? lastObs.note : '') + '</div>' +
      '</div>' +
      '<div style="font-size:11px;font-weight:600;color:#1A5FA8;margin-bottom:6px">' + t('obsCloseQuestion') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button onclick="closeInvestigationNoIssue(' + d.id + ')" style="flex:1;min-width:120px;background:#F3F8F2;color:#1F4D2E;border:1px solid #BBD8C2;border-radius:8px;padding:8px 10px;font-size:12.5px;font-weight:600;cursor:pointer">' + t('obsCloseNoIssueBtn') + '</button>' +
        '<button onclick="document.getElementById(\'op-issue-form-' + d.id + '\').style.display=(document.getElementById(\'op-issue-form-' + d.id + '\').style.display===\'none\'?\'block\':\'none\')" style="flex:1;min-width:120px;background:#F3F8F2;color:#854F0B;border:1px solid #EF9F27;border-radius:8px;padding:8px 10px;font-size:12.5px;font-weight:600;cursor:pointer">' + t('obsCloseConfirmedBtn') + '</button>' +
      '</div>' +
      '<div id="op-issue-form-' + d.id + '" style="display:none;padding-top:10px;border-top:1px solid #92B4E3">' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('opIssueNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
        '<textarea id="op-issue-note-' + d.id + '" rows="2" placeholder="' + t('opIssueNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="closeInvestigationConfirmed(' + d.id + ')" style="width:100%;background:#854F0B;color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer">' + t('opIssueConfirmBtn') + '</button>' +
      '</div>' +
    '</div>';
  }

  // Case: an unaddressed observation was reported on this device (2026-07-07).
  // Shown to Owner/Manager only — Technician/Farm Hand don't act on this
  // banner. Deliberately renders regardless of the underlying risk color —
  // this is the fix for a real gap: a device could show a plain green
  // "Looking good" banner while a Farm Hand had reported something wrong
  // that the risk model (brand/password-based) has no way to reflect. Lowest
  // priority of all decision-slot cases — an observation is "worth a look,"
  // not an active decision blocking everything else.
  if (d.observationPending && canClearEscalation()) {
    const lastObs = Array.isArray(d.handoffLog) ? [...d.handoffLog].reverse().find(e => e.type === 'observation') : null;
    return '<div style="background:#E6F0FA;border:2px solid #92B4E3;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
      '<div style="font-weight:700;color:#1A5FA8;font-size:14px;margin-bottom:6px"><i class="ti ti-eye" style="font-size:15px;vertical-align:-2px" aria-hidden="true"></i> ' + t('obsBannerTitle') + '</div>' +
      '<div style="font-size:13px;color:#22372A;line-height:1.5;margin-bottom:10px">' +
        '<div><strong>' + t('obsBannerBy') + ':</strong> ' + (lastObs ? lastObs.from : '—') + (lastObs ? ' · ' + lastObs.date : '') + '</div>' +
        '<div style="margin-top:4px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #92B4E3;font-style:italic">' + (lastObs ? lastObs.note : '') + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button onclick="document.getElementById(\'obs-dismiss-form-' + d.id + '\').style.display=(document.getElementById(\'obs-dismiss-form-' + d.id + '\').style.display===\'none\'?\'block\':\'none\')" style="flex:1;min-width:120px;background:#F3F8F2;color:#1A5FA8;border:1px solid #92B4E3;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer">' + t('obsDismissBtn') + '</button>' +
        '<button onclick="investigateObservation(' + d.id + ')" style="flex:1;min-width:120px;background:#1A5FA8;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer">' + t('obsInvestigateBtn') + '</button>' +
      '</div>' +
      '<div id="obs-dismiss-form-' + d.id + '" style="display:none;padding-top:10px;border-top:1px solid #92B4E3">' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('obsDismissNoteLabel') + ' <span style="color:#aaa;font-weight:400">' + t('optional') + '</span></label>' +
        '<textarea id="obs-dismiss-note-' + d.id + '" rows="2" placeholder="' + t('obsDismissNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="dismissObservation(' + d.id + ')" style="width:100%;background:#F3F8F2;color:#1A5FA8;border:1px solid #92B4E3;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer">' + t('obsDismissConfirmBtn') + '</button>' +
      '</div>' +
    '</div>';
  }

  return '';
}

// ─── Animated accordion helper for the device detail screen ────────────────
// Same pattern as networks.js's netAccSection()/toggleNetAcc() — nested
// wrapper so max-height:0 fully collapses with no residual padding gap, real
// scrollHeight measured at toggle time so it works for any device's actual
// content length. Kept as its own device-scoped function (not shared with
// networks.js) to avoid any risk of one screen's accordion state bleeding
// into the other's DOM ids.
function deviceAccSection(key, deviceId, iconClass, title, previewHTML, bodyHTML, startOpen) {
  var bodyId = 'dev-acc-body-' + key + '-' + deviceId;
  var btnId = 'dev-acc-btn-' + key + '-' + deviceId;
  var chevId = 'dev-acc-chev-' + key + '-' + deviceId;
  return '<div style="border:1px solid #CBD8CB;border-radius:10px;margin-bottom:8px;overflow:hidden">' +
    '<button type="button" id="' + btnId + '" onclick="toggleDeviceAcc(\'' + key + '\',' + deviceId + ')" aria-expanded="' + (startOpen?'true':'false') + '" style="width:100%;display:flex;align-items:center;gap:8px;padding:13px 12px;background:' + (startOpen?'#E2EFE8':'#fff') + ';border:none;text-align:left;cursor:pointer;min-height:44px;transition:background-color 0.2s ease;font-family:inherit">' +
      '<i class="ti ' + iconClass + '" style="font-size:16px;color:#1F4D2E;flex-shrink:0"></i>' +
      '<span style="font-size:13px;font-weight:500;color:#22372A;flex-shrink:0">' + title + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:#7A8F80;white-space:nowrap;flex-shrink:1;padding-left:6px;overflow:hidden;text-overflow:ellipsis;max-width:150px">' + (previewHTML||'') + '</span>' +
      '<i id="' + chevId + '" class="ti ti-chevron-down" style="font-size:15px;color:#7A8F80;flex-shrink:0;display:inline-block;transform:rotate(' + (startOpen?'180deg':'0deg') + ');transition:transform 0.25s ease"></i>' +
    '</button>' +
    '<div id="' + bodyId + '" data-open="' + (startOpen?'true':'false') + '" style="overflow:hidden;transition:max-height 0.3s ease;max-height:0px">' +
      '<div style="padding:0 14px 12px;border-top:1px solid #E4EEE4">' + bodyHTML + '</div>' +
    '</div>' +
  '</div>';
}
function initDeviceAccordionState(deviceId) {
  document.querySelectorAll('[id^="dev-acc-body-"][id$="-' + deviceId + '"]').forEach(function(wrap) {
    var isOpen = wrap.getAttribute('data-open') === 'true';
    var inner = wrap.firstElementChild;
    wrap.style.maxHeight = isOpen ? (inner ? inner.scrollHeight : wrap.scrollHeight) + 'px' : '0px';
  });
}
function toggleDeviceAcc(key, deviceId) {
  var wrap = document.getElementById('dev-acc-body-' + key + '-' + deviceId);
  var btn = document.getElementById('dev-acc-btn-' + key + '-' + deviceId);
  var chev = document.getElementById('dev-acc-chev-' + key + '-' + deviceId);
  if (!wrap || !btn) return;
  var inner = wrap.firstElementChild;
  var isOpen = wrap.getAttribute('data-open') === 'true';
  if (isOpen) {
    wrap.style.maxHeight = '0px';
    wrap.setAttribute('data-open', 'false');
    btn.style.backgroundColor = '#fff';
  } else {
    wrap.style.maxHeight = (inner ? inner.scrollHeight : wrap.scrollHeight) + 'px';
    wrap.setAttribute('data-open', 'true');
    btn.style.backgroundColor = '#E2EFE8';
  }
  if (chev) chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  btn.setAttribute('aria-expanded', String(!isOpen));
}

function showDetail(id, keepScreen) {
  currentDetailView = { type: 'device', id: id };
  const d = devices.find(x => x.id === id);
  if (!d) return;
  logAction({key: 'logViewedDevice', params: {device: (d.label || d.type) + ' (' + d.brand + ')'}});
  const risk = getRisk(d.brand, d.pw, d.healthStatus);
  const why = getRiskWhy(d.brand, d.pw, risk);
  const action = getRiskAction(risk, d.pw, d.brand);
  const info = getRiskData()[d.brand] || getRiskData()["Other"];
  const iconMap = {red:'ti-alert-circle', yellow:'ti-alert-triangle', green:'ti-circle-check'};
  const canSee = canSeeIssue(d);
  const canDetail = canSeeDetailedRisk();
  const canAct = canResolveIssues(d) && canSee;
  // N1: also assignable while an observation is under investigation (matters on
  // green devices) so Owner/Manager can still reassign/unassign mid-investigation.
  const canAssign = canAssignIssues() && !d.resolved && (risk !== 'green' || d.observationPending || d.observationInvestigating);
  const isViewOnlyNote = canSee && !canResolveIssues() && !canAssignIssues() && !d.resolved && risk !== 'green';

  document.getElementById('detail-content').setAttribute('data-device-id', id);
  document.getElementById('detail-content').innerHTML =
    '<div class="device-name-large">' + (d.label || d.type) + '</div>' +
    '<div class="device-sub">' + d.brand + ' &middot; ' + translateDeviceType(d.type) + '</div>' +

    (!canSee && !d.resolved && risk !== 'green' ?
      '<div class="risk-detail" style="background:#F3F8F2;border:1px solid #d9dee3"><div class="risk-detail-title" style="color:#5F7266"><i class="ti ti-lock"></i>' + t('notAssignedTitle') + '</div><p style="color:#5F7266">' + t('notAssignedDeviceBody') + '</p></div>' :
    !canDetail ? '' :
    // Suppress the green "Looking good"/resolved banner specifically when an
    // observation-related state is active (pending, under investigation, or
    // a confirmed operational issue) — showing calm-green right next to "an
    // issue was reported" is a direct contradiction a person has to mentally
    // resolve themselves. Doesn't suppress red/yellow risk banners, since
    // those aren't contradictory with an additional observation — both are
    // legitimately "something's wrong," just different somethings.
    ((d.resolved || risk === 'green') && (d.observationPending || d.observationInvestigating || d.knownOperationalIssue)) ? '' :
    d.resolved ?
      '<div class="risk-detail risk-detail-green"><div class="risk-detail-title t-green">' + t('lookingGood') + '</div><p>' + t('resolvedMsg') + (d.resolvedDate ? ' ' + d.resolvedDate : '') + '. ' + t('monitorMsg2') + '</p></div>' :
      '<div class="risk-detail risk-detail-' + risk + '"><div class="risk-detail-title t-' + risk + '"><i class="ti ' + iconMap[risk] + '"></i>' + getRiskLabel(risk, false) + '</div><p>' + why + '</p></div>'
    ) +

    // ─── ONE consolidated decision slot — see deviceDecisionSlotHTML() ───────
    deviceDecisionSlotHTML(d) +

    (canDetail ? (

      // "How to fix this" — read-only guidance, never where the actual fix happens
      ((canSee && !d.resolved && risk !== 'green') ?
        deviceAccSection('fix', d.id, 'ti-bulb', t('howToFixTitle'), '',
          '<div class="action-box" style="margin:10px 0 0">' +
            '<div class="action-label">' + t('recommendedAction') + '</div>' +
            '<div class="action-text">' + action + '</div>' +
          '</div>' +
          (d.partiallyResolved && !d.resolved && !d.needsOwnerAction ?
            '<div style="background:#EFEAF7;border:1px solid #C4B5FD;border-radius:10px;padding:12px 14px;margin:10px 0">' +
              '<div style="font-weight:700;color:#5B21B6;font-size:13px;margin-bottom:6px">⚡ ' + t('partiallyResolvedBadge') + '</div>' +
              '<div style="font-size:13px;color:#3B0764;line-height:1.5">' +
                '<div><strong>' + t('partialFixByLabel') + ':</strong> ' + (d.partialResolveBy || '—') + (d.partialResolveDate ? ' · ' + d.partialResolveDate : '') + '</div>' +
                '<div style="margin-top:4px;padding:8px 10px;background:#F3F8F2;border-radius:6px;border:1px solid #C4B5FD;font-style:italic">' + (d.partialResolveNote || '') + '</div>' +
              '</div>' +
            '</div>'
          : '') +
          ((d.pw === 'no' && !d.resolved) ? findDefaultLoginHTML(d) : '') +
          ((d.pw === 'no' && !d.resolved) ? pwManagerCardHTML() : ''),
          false) : '') +

      // Assignment — assign/reassign box for assigners, plain status for everyone else
      ((canAssign || (canSee && !canAssign && risk !== 'green' && !d.resolved)) ?
        deviceAccSection('assign', d.id, 'ti-user-question', t('assignmentTitle'),
          d.assignedTo ? d.assignedTo : t('unassignedLabel'),
          (canAssign ? assignBoxHTML(d) :
            '<div style="font-size:12.5px;color:#22372A;line-height:1.6;margin-top:10px">' +
              (d.assignedTo
                ? '<div><i class="ti ti-user-check" style="color:#1F4D2E"></i> <strong>' + t('assignedToLabel') + ':</strong> ' + d.assignedTo + '</div>'
                : '<div><i class="ti ti-user-question" style="color:#7A6514"></i> ' + t('unassignedLabel') + '</div>')
            + '</div>'
          ), false) : '') +

      // Remediation checklist — the actual action area: verify-box (green/secure),
      // the resolve/escalate toggle (open issue), or the view-only status note.
      // These are mutually exclusive by role/state, so they share one section
      // rather than being scattered as separate top-level blocks.
      (canAct ?
        deviceAccSection('remediate', d.id, 'ti-checklist', t('whatWasDone'), '',
          (risk === 'green' && !d.resolved ? verifyBoxHTML(d) : addressIssueBoxHTML(d)) +
          (d.resolved ? '<div class="resolved-badge" style="margin-top:14px">✅ ' + t('resolvedBadge') + ' ' + tResolveStatus(d.resolveStatus, 'device') + (d.resolveNote ? ' — ' + d.resolveNote : '') + (d.resolvedDate ? '<span style="font-weight:400;margin-left:8px;color:#5F7266">(' + d.resolvedDate + ')</span>' : '') + '</div>' : ''),
          false)
      : isViewOnlyNote ?
        deviceAccSection('remediate', d.id, 'ti-checklist', t('whatWasDone'), '',
          (function() {
            const statusKey = farmHandNoteKey(d);
            const isCaution = d.farmHandStatus === 'use-caution' || d.farmHandStatus === 'do-not-use';
            const isFine = d.farmHandStatus === 'keep-using';
            // R2: colors unified with dashboard/device-list Farm Hand pills.
            const fh = isCaution
              ? { icon: 'ti-alert-triangle', color: '#7A6514', bg: '#FBF6E9', border: '#F5E9B8' }
              : isFine
              ? { icon: 'ti-thumb-up', color: '#14381F', bg: '#CFE8D6', border: '#8FC49F' }
              : { icon: 'ti-info-circle', color: '#334155', bg: '#DCE3EA', border: '#B9C4CE' };
            return '<div style="background:' + fh.bg + ';border:1px solid ' + fh.border + ';border-radius:10px;padding:12px 14px;margin-top:10px">' +
              '<p style="font-size:13px;color:' + fh.color + ';margin:0;font-weight:600;display:flex;align-items:center;gap:8px"><i class="ti ' + fh.icon + '" style="font-size:16px" aria-hidden="true"></i> ' + t(statusKey) + '</p>' +
            '</div>';
          })(),
          false)
      : '') +

      // Device details — unchanged content, same collapsible
      deviceAccSection('details', d.id, 'ti-list-details', t('deviceDetails'), '',
        '<div class="detail-row"><span class="detail-key">' + t('detailBrand') + '</span><span class="detail-val">' + d.brand + '</span></div>' +
        (d.model ? '<div class="detail-row"><span class="detail-key">' + t('modelLabel') + '</span><span class="detail-val">' + d.model + '</span></div>' : '') +
        (d.serial ? '<div class="detail-row"><span class="detail-key">' + t('serialLabel') + '</span><span class="detail-val">' + d.serial + '</span></div>' : '') +
        (d.mac ? '<div class="detail-row"><span class="detail-key">' + t('macLabel') + '</span><span class="detail-val" style="font-family:monospace;font-size:13px">' + d.mac + '</span></div>' : '') +
        '<div class="detail-row"><span class="detail-key">' + t('deviceTypeLabel') + '</span><span class="detail-val">' + translateDeviceType(d.type) + '</span></div>' +
        (canDetail ? (
          '<div class="detail-row"><span class="detail-key">' + t('defaultPwChanged') + '</span><span class="detail-val">' + (d.pw==='yes'?t('detailPwYes'):t('detailPwNo')) + '</span></div>' +
          '<div class="detail-row"><span class="detail-key">' + t('manufacturerSupport') + '</span><span class="detail-val">' + t(info.support==='Limited'?'limitedLabel':info.support==='Supported'?'supportedLabel':'unknownLabel') + '</span></div>' +
          '<div class="detail-row"><span class="detail-key">' + t('knownVulnerabilities') + '</span><span class="detail-val">' + (info.cve > 0 ? info.cve + ' ' + t('cveFound') : t('cveNone')) + '</span></div>' +
          (canAct ? '<div class="detail-row" style="margin-top:4px"><button onclick="checkVulnerabilities(' + d.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-weight:500">' + t('hwVulnCheck') + '</button></div>' : '') +
          '<div id="vuln-results-' + d.id + '" style="margin-top:8px"></div>' +
          (d.autoUpdate ? '<div class="detail-row"><span class="detail-key">' + t('autoUpdate') + '</span><span class="detail-val">' + d.autoUpdate + '</span></div>' : '') +
          (d.lastFirmware ? '<div class="detail-row"><span class="detail-key">' + t('lastSoftwareUpdate') + '</span><span class="detail-val">' + new Date(d.lastFirmware).toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', {month:'short',day:'numeric',year:'numeric'}) + '</span></div>' : '')
        ) : ''),
        false) +

      // Device history — merges the old separate timeline + handoff log
      // toggles into one section, instead of two adjacent near-identical
      // collapsibles.
      (function() {
        var histBody = deviceTimelineHTML(d) + handoffLogRowsHTML(d);
        if (!histBody) return '';
        var eventCount = (Array.isArray(d.handoffLog) ? d.handoffLog.length : 0);
        return deviceAccSection('history', d.id, 'ti-history', t('tlTitle'), eventCount ? (eventCount + ' ' + t('eventsSuffix')) : '', histBody, false);
      })()

    ) : '') +

    // Notice something? — Farm Hand/Viewer only, always available regardless
    // of current status, since reporting is their one real action.
    (!canDetail && canSee ?
      deviceAccSection('observe', d.id, 'ti-eye', t('observationTitle'), '',
        '<div id="observation-box-' + d.id + '">' +
        '<p style="font-size:12px;color:#777;margin:10px 0 8px">' + t('observationDesc') + '</p>' +
        '<textarea id="observation-note-' + d.id + '" rows="2" placeholder="' + t('observationPlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
        '<button onclick="submitObservation(' + d.id + ')" style="width:100%;background:#1F4D2E;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">' + t('observationBtn') + '</button>' +
        '</div>',
        false) : '');

  if (!keepScreen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-detail').classList.add('active');
  }
  initDeviceAccordionState(id);
}

// Builds the resolve/escalate toggle box content (was inline in showDetail;
// extracted so it can sit inside the Remediation checklist accordion section).
// Behavior unchanged — same field ids, same functions (setIssueMode, saveAll,
// partialResolveAndEscalate) as before.
function addressIssueBoxHTML(d) {
  return '<div class="resolve-box" id="action-box-' + d.id + '" style="margin-top:10px">' +
    '<div style="display:flex;gap:8px;margin-bottom:14px">' +
      '<button type="button" id="mode-resolve-btn-' + d.id + '" onclick="setIssueMode(' + d.id + ',\'resolve\')" class="filter-btn active" style="flex:1"><i class="ti ti-check" style="font-size:15px;vertical-align:-2px;margin-right:4px" aria-hidden="true"></i>' + t('modeResolveTab') + '</button>' +
      (shouldShowPartialResolveBox(d) ?
        '<button type="button" id="mode-escalate-btn-' + d.id + '" onclick="setIssueMode(' + d.id + ',\'escalate\')" class="filter-btn" style="flex:1"><i class="ti ti-flag" id="mode-escalate-icon-' + d.id + '" style="font-size:15px;vertical-align:-2px;margin-right:4px;color:#3B0764" aria-hidden="true"></i>' + t('modeEscalateTab') + '</button>'
      : '') +
    '</div>' +

    '<div id="mode-resolve-fields-' + d.id + '">' +
      '<p style="font-size:12px;color:#1F4D2E;line-height:1.5;margin:0 0 12px">' + t('resolveIntroDesc') + '</p>' +
      '<div style="background:#E2EFE8;border:1px solid #BBD8C2;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#1F4D2E;display:flex;gap:6px">' +
        '<i class="ti ti-device-floppy" style="font-size:15px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i>' +
        '<span>' + t('resolveStepCallout') + '</span>' +
      '</div>' +
      '<div class="health-box" style="margin-top:0">' +
        '<div class="health-title">' + t('healthTitle') + ' <span style="color:#A32D2D;font-size:11px;font-weight:600">* ' + t('required') + '</span></div>' +
        '<div id="health-warning-' + d.id + '" style="display:none;background:#FCEBEB;border:1px solid #F09595;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:12px;color:#791F1F;align-items:center;gap:6px">' + t('healthWarnSelectStatus') + '</div>' +
        (Array.isArray(t('healthOpts')) ? t('healthOpts') : []).map(function(opt, i) {
          const code = HEALTH_CODES[i];
          const sel = healthCode(d.healthStatus) === code;
          return '<label class="health-opt ' + (sel ? 'selected' : '') + '">' +
            '<input type="radio" name="health-' + d.id + '" value="' + code + '" ' + (sel ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
          '</label>';
        }).join('') +
        (d.healthDate ? '<p class="health-stamp">' + t('healthStamp') + ' ' + d.healthDate + '</p>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin:12px 0">' +
        (Array.isArray(t('resolveActions')) ? t('resolveActions') : []).map(function(opt, i) {
          const code = RESOLVE_ACTION_CODES[i];
          const checked = actionCodes(d.resolveStatus, 'device').includes(code);
          return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #CBD8CB;border-radius:8px;background:' + (checked ? '#E2EFE8' : '#fff') + '">' +
            '<input type="checkbox" value="' + code + '" class="resolve-action" ' + (checked ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E"> ' + opt +
          '</label>';
        }).join('') +
        (function() {
          const codes = actionCodes(d.resolveStatus, 'device');
          const otherCode = codes.find(function(c) { return c.indexOf('other:') === 0; });
          const otherChecked = !!otherCode;
          const otherText = otherChecked ? otherCode.slice(6) : '';
          return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #CBD8CB;border-radius:8px;background:' + (otherChecked ? '#E2EFE8' : '#fff') + '">' +
            '<input type="checkbox" id="resolve-other-check-' + d.id + '" ' + (otherChecked ? 'checked' : '') + ' style="width:auto;accent-color:#1F4D2E" onchange="document.getElementById(\'resolve-other-text-' + d.id + '\').style.display = this.checked ? \'block\' : \'none\'">' + t('resolveOther') + '</label>' +
            '<input type="text" id="resolve-other-text-' + d.id + '" placeholder="' + t('describeWhatDone') + '" value="' + otherText + '" style="display:' + (otherChecked ? 'block' : 'none') + ';width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;margin-top:-2px;font-family:inherit">';
        })() +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:6px">' + t('notes') + ' <span style="font-weight:400;color:#aaa">' + t('optional') + '</span></label>' +
        '<p style="font-size:11px;color:#A32D2D;background:#FCEBEB;border-radius:6px;padding:6px 10px;margin-bottom:6px">⚠️ ' + t('credWarning') + '</p>' +
        '<textarea id="resolve-note" rows="3" placeholder="' + t('notePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit">' + (d.resolveNote || '') + '</textarea>' +
      '</div>' +
      '<button class="resolve-btn" onclick="saveAll(' + d.id + ')" style="background:#1F4D2E;font-size:15px;padding:13px">' + t('saveBtn') + '</button>' +
    '</div>' +

    (shouldShowPartialResolveBox(d) ?
      '<div id="mode-escalate-fields-' + d.id + '" style="display:none">' +
        '<p style="font-size:12px;color:#5B21B6;margin:0 0 12px;line-height:1.4">' + t('partialResolveDesc') + '</p>' +
        (d.pw === 'no' ?
          '<div style="background:#E2EFE8;border:1px solid #BBD8C2;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#1F4D2E">🔑 ' + t('partialResolveStepPw') + '</div>'
        : '') +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('partialFixNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
        '<textarea id="partial-fix-note-' + d.id + '" rows="2" placeholder="' + t('partialFixNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:12px"></textarea>' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('escReasonLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
        '<select id="partial-esc-reason-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:10px;background:#F3F8F2">' +
          '<option value="">' + t('escReasonPlaceholder') + '</option>' +
          (Array.isArray(t('escReasons')) ? t('escReasons') : []).map(function(r) {
            return '<option value="' + r + '">' + r + '</option>';
          }).join('') +
        '</select>' +
        '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('escNoteLabel').replace('{target}', escalationTargetName()) + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
        '<textarea id="partial-esc-note-' + d.id + '" rows="2" placeholder="' + t('escNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #C4B5FD;border-radius:8px;resize:none;font-family:inherit;margin-bottom:12px"></textarea>' +
        '<button onclick="partialResolveAndEscalate(' + d.id + ')" style="width:100%;background:#5B21B6;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">⚡ ' + t('partialResolveBtn').replace('{target}', escalationTargetName()) + '</button>' +
      '</div>'
    : '') +
  '</div>';
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
    '<select id="assign-select-' + d.id + '" style="width:100%;font-size:14px;padding:10px 12px;border:1px solid #CBD8CB;border-radius:8px;background:#F3F8F2;font-family:inherit;margin-bottom:10px">' + options + '</select>' +
    '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('assignNoteLabel') + ' <span style="color:#A32D2D;font-size:11px">*' + t('required') + '</span></label>' +
    '<textarea id="assign-note-' + d.id + '" rows="2" placeholder="' + t('assignNotePlaceholder') + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;resize:none;font-family:inherit;margin-bottom:10px"></textarea>' +
    '<label style="font-size:12px;font-weight:600;color:#5F7266;display:block;margin-bottom:4px">' + t('fhStatusLabel') + '</label>' +
    '<p style="font-size:11px;color:#7A8F80;margin:-2px 0 6px">' + t('fhStatusDesc') + '</p>' +
    '<select id="fh-status-' + d.id + '" style="width:100%;font-size:13px;padding:8px 12px;border:1px solid #CBD8CB;border-radius:8px;background:#F3F8F2;font-family:inherit;margin-bottom:10px">' + fhOptions + '</select>' +
    '<div style="display:flex;gap:8px">' +
      '<button class="resolve-btn" onclick="assignIssue(' + d.id + ')" style="background:#1F4D2E;flex:1">' + primaryLabel + '</button>' +
      (isReassign ? '<button class="resolve-btn" onclick="unassignIssue(' + d.id + ')" style="background:#F3F8F2;color:#A32D2D;border:1px solid #E0B4B4;flex:0 0 auto;padding-left:16px;padding-right:16px">' + t('unassignBtn') + '</button>' : '') +
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
  // Any assignment on a device with a pending observation moves it forward
  // to "under investigation" rather than just clearing it — the report
  // stays visible (differently styled) the whole time someone's actually
  // looking into it, instead of silently vanishing the moment it's assigned.
  if (d.observationPending) {
    d.observationPending = false;
    d.observationInvestigating = true;
  }
  if (!Array.isArray(d.handoffLog)) d.handoffLog = [];
  d.handoffLog.push({
    type: prev ? 'reassign' : 'assign',
    from: currentUser.name || currentUser.role,
    to: name,
    note: noteVal,
    date: localTimestamp()
  });
  logAction(prev ? 'logReassignedIssue' : 'logAssignedIssue',
    {raw: (d.label || d.type) + ' → ' + name + (prev ? ' (was ' + prev + ')' : '') + ' | ' + noteVal});
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
  logAction('logClearedAssignment', {raw: (d.label || d.type) + (prev ? ' (was ' + prev + ')' : '')});
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
  var navKey = { dashboard: 'navDash', devices: 'navDevices', network: 'navNetwork', settings: 'navSettings', apps: 'navApps', backups: 'navBackups' };
  if (navKey[name]) logAction('logViewedTab', {key: navKey[name]});
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
  // RBAC (C2): adding devices requires the addDevices permission.
  if (!currentPerms().addDevices) return;
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
  // Translate the cloned form declaratively — this covers every data-i18n
  // element (including the wrapped "Serial number / (optional)" style labels
  // and every option) in the active language, so newly-cloned DOM is never
  // left untranslated. The manual lines below are legacy belt-and-suspenders
  // for the few elements that pre-date the data-i18n pass.
  applyI18n(inline);
  // Translate all form elements in the cloned inline form
  const safeInline = (sel, val) => { const el = inline.querySelector(sel); if(el) el.textContent = val; };
  const phInline = (sel, val) => { const el = inline.querySelector(sel); if(el) el.placeholder = val; };
  safeInline('[id="lbl-add-device-title"]', t('addADevice'));
  safeInline('[id="lbl-brand"]', t('brandLabel'));
  // lbl-mfr-model, lbl-serial, lbl-device-label, lbl-dealer and lbl-mac are
  // wrapped label+hint spans handled by applyI18n(inline) above — setting their
  // textContent here would strip the hint spans, so they are intentionally omitted.
  safeInline('[id="lbl-location"]', t('locationLabel'));
  safeInline('[id="lbl-conn-type"]', t('connectionLabel'));
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

function selectPw(el) { // CL4: unused 2nd arg dropped
  document.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function addDevice() {
  // RBAC (C2): defense-in-depth — same gate as showAddForm().
  if (!currentPerms().addDevices) return;
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
  if (!brand || !type || !pw) { alert(t('alertCompleteFields')); return; }
  const contactNotes = document.getElementById('device-contact-notes') ? document.getElementById('device-contact-notes').value.trim() : '';
  devices.push({ id: nextId++, addedDate: localTimestamp(), flaggedDate: (pw === 'no' ? localTimestamp() : ''), brand: brand, type: type, label: label || type, model: model, serial: serial, mac: mac, pw: pw, contactNotes: contactNotes, resolved: false, resolveStatus: '', resolveNote: '', resolvedDate: '', verifiedDate: '', autoUpdate: '', lastFirmware: '', firmwareCheckedDate: '' });
  logAction('logDeviceAdded', {raw: (label || type) + ' (' + brand + ')'});
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
