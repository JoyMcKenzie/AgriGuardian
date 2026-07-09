/* AgriGuardian: in-app report viewers */
// ===== In-app report viewers (open instead of download) =====
function _openReportViewer(titleText, bodyHtml) {
  var overlay = document.getElementById('report-viewer-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'report-viewer-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML =
      '<div style="background:#FFFFFF;max-width:520px;width:100%;max-height:90vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.25)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1F4D2E;color:#fff">' +
      '<span id="report-viewer-title" style="font-size:14px;font-weight:600"></span>' +
      '<button onclick="closeReportViewer()" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer">' + t('closeLabel') + '</button>' +
      '</div>' +
      '<div id="report-viewer-body" style="padding:16px;overflow:auto;font-size:13px;color:#222;line-height:1.5"></div>' +
      '</div>';
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeReportViewer(); });
    document.body.appendChild(overlay);
  }
  document.getElementById('report-viewer-title').textContent = titleText;
  document.getElementById('report-viewer-body').innerHTML = bodyHtml;
  overlay.style.display = 'flex';
}
function closeReportViewer() {
  var o = document.getElementById('report-viewer-overlay');
  if (o) o.style.display = 'none';
}

function viewHygieneReport() {
  if (!canExportReports()) return;
  var h = computeHygiene();
  var active = devices.filter(function(d){ return !d.archived; });
  var farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  var dateStr = new Date().toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
  var scColor = h.overall >= 80 ? '#2E7A4E' : h.overall >= 50 ? '#D4C000' : '#E24B4A';
  var bar = function(label, val){
    return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px;color:#5F7266"><span>' + label + '</span><span>' + val + '%</span></div>' +
      '<div style="background:#ebebeb;height:6px;border-radius:4px;overflow:hidden;margin-top:3px"><div style="background:#1F4D2E;height:100%;width:' + val + '%"></div></div></div>';
  };
  var openIssues = active.filter(function(d){ return !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green'; });
  var html = '<div style="color:#7A8F80;font-size:12px;margin-bottom:10px">' + farm + ' &middot; ' + t('pdfGenerated') + ' ' + dateStr + '</div>' +
    '<div style="border:1px solid #D7E4D7;border-radius:10px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:14px">' +
      '<div style="width:64px;height:64px;border:3px solid ' + scColor + ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:' + scColor + '">' + h.overall + '</div>' +
      '<div style="flex:1"><div style="font-weight:600;margin-bottom:4px">' + t('hygieneTitle') + ': ' + h.overall + '/100</div>' +
        bar(t('hygienePassword'), h.password) + bar(t('hygieneUpdate'), h.update) +
        (h.hasNetworks ? bar(t('hygieneNetwork'), h.network) : '') +
        (h.hasApps && canSeeApps() ? bar(t('hygieneApps'), h.apps) : '') +
        (h.hasBackup && canSeeBackups() ? bar(t('hygieneBackup'), h.backup) : '') +
      '</div></div>' +
    '<div style="font-weight:600;color:#1F4D2E;margin-bottom:6px">' + t('pdfActionList') + '</div>';
  if (openIssues.length === 0) {
    html += '<div style="color:#5F7266;font-size:13px;margin-bottom:14px">' + t('pdfNoActions') + '</div>';
  } else {
    html += '<ul style="padding-left:18px;margin-bottom:14px">' + openIssues.map(function(d){
      var r = getRisk(d.brand, d.pw, d.healthStatus);
      return '<li style="margin-bottom:6px">' + (d.label || d.type) + ' (' + d.brand + ') &mdash; ' + getRiskAction(r, d.pw, d.brand) +
        (d.assignedTo ? ' <span style="color:#7A8F80">[' + t('assignedToLabel') + ': ' + d.assignedTo + ']</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  html += '<div style="font-weight:600;color:#1F4D2E;margin-bottom:6px">' + t('pdfDeviceInventory') + ' (' + active.length + ')</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px">' +
    '<tr style="background:#FFFFFF;color:#1F4D2E"><th style="text-align:left;padding:6px">' + t('pdfDevice') + '</th><th style="text-align:left;padding:6px">' + t('brandLabel') + '</th><th style="text-align:left;padding:6px">' + t('pdfStatus') + '</th></tr>' +
    active.map(function(d){
      var r = getRisk(d.brand, d.pw, d.healthStatus);
      var statusTxt = d.resolved ? t('pdfResolved') : (r === 'red' ? t('pdfHigh') : r === 'yellow' ? t('pdfMedium') : t('pdfLow'));
      var color = d.resolved ? '#2E7A4E' : (r === 'red' ? '#E24B4A' : r === 'yellow' ? '#D4C000' : '#2E7A4E');
      return '<tr style="border-top:1px solid #eee"><td style="padding:6px">' + (d.label||d.type) + '</td><td style="padding:6px">' + d.brand + '</td><td style="padding:6px;color:' + color + ';font-weight:600">' + statusTxt + '</td></tr>';
    }).join('') + '</table>' +
    '<div style="font-size:11px;color:#7A8F80;margin-top:12px;border-top:1px solid #eee;padding-top:8px">' + t('pdfDisclaimer') + '</div>';
  _openReportViewer(t('pdfReportTitle'), html);
  logAction('logViewedHygieneReport', {raw: t('hygieneTitle') + ': ' + h.overall + '/100'});
}

function viewActivityReport() {
  if (!canExportReports()) return;
  var farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  var dateStr = new Date().toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
  var html = '<div style="color:#7A8F80;font-size:12px;margin-bottom:10px">' + farm + ' &middot; ' + t('pdfGenerated') + ' ' + dateStr + ' &middot; ' +
    auditLog.length + ' ' + (auditLog.length === 1 ? t('auditAction') : t('auditActions')) + '</div>';
  if (auditLog.length === 0) {
    html += '<div style="color:#7A8F80;font-size:13px">' + t('pdfNoActivity') + '</div>';
  } else {
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<tr style="background:#FFFFFF;color:#1F4D2E"><th style="text-align:left;padding:6px">' + t('pdfWhen') + '</th><th style="text-align:left;padding:6px">' + t('pdfWho') + '</th><th style="text-align:left;padding:6px">' + t('pdfWhat') + '</th></tr>' +
      auditLog.map(function(e){
        var detail = tAudit(e.detail);
        return '<tr style="border-top:1px solid #eee"><td style="padding:6px;color:#5F7266;white-space:nowrap">' + formatAuditTs(e.ts) + '</td>' +
          '<td style="padding:6px">' + e.actor + ' <span style="color:#7A8F80">(' + tRole(e.role) + ')</span></td>' +
          '<td style="padding:6px">' + tAudit(e.actionKey) + (detail ? ' &mdash; <span style="color:#5F7266">' + detail + '</span>' : '') + '</td></tr>';
      }).join('') + '</table>';
  }
  html += '<div style="font-size:11px;color:#7A8F80;margin-top:12px;border-top:1px solid #eee;padding-top:8px">' + t('pdfActivityDisclaimer') + '</div>';
  _openReportViewer(t('pdfActivityTitle'), html);
  logAction('logViewedActivityLog', {raw: auditLog.length + ' ' + (auditLog.length === 1 ? t('auditAction') : t('auditActions'))});
}
