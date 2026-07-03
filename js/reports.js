/* AgriGuardian: PDF and email reports */
function downloadHygieneReport() {
  if (!canExportReports()) return;
  var doc = pdfNew();
  if (!doc) { alert('PDF engine not available.'); return; }
  var h = computeHygiene();
  var active = devices.filter(function(d){ return !d.archived; });
  var farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  var now = new Date();
  var dateStr = now.toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
  var riskWord = function(r){ return r === 'red' ? t('pdfHigh') : r === 'yellow' ? t('pdfMedium') : t('pdfLow'); };
  var rgb = function(r){ return r === 'red' ? [192,57,43] : r === 'yellow' ? [201,164,0] : [46,125,50]; };

  var margin = 40, pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  var y = margin;
  function ensure(space){ if (y + space > pageH - margin) { doc.addPage(); y = margin; } }

  // Title + subtitle
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(31,77,46);
  doc.text(t('pdfReportTitle'), margin, y); y += 18;
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(120,120,120);
  doc.text(farm + '  \u00B7  ' + t('pdfGenerated') + ' ' + dateStr, margin, y); y += 22;

  // Score box
  var sc = h.overall >= 80 ? [46,125,50] : h.overall >= 50 ? [201,164,0] : [192,57,43];
  doc.setDrawColor(220,220,220); doc.roundedRect(margin, y, pageW-margin*2, 90, 6, 6);
  doc.setFillColor(sc[0],sc[1],sc[2]); doc.circle(margin+45, y+45, 28, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(sc[0],sc[1],sc[2]);
  doc.text(String(h.overall), margin+45, y+52, { align:'center' });
  var bx = margin+95, by = y+22, bw = pageW - margin - bx - 14;
  doc.setFontSize(11); doc.setTextColor(34,34,34);
  doc.text(t('hygieneTitle') + ': ' + h.overall + '/100', bx, by); by += 16;
  function scoreBar(label, val){
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(80,80,80);
    doc.text(label + ' (' + val + '%)', bx, by);
    doc.setFillColor(235,235,235); doc.rect(bx, by+3, bw, 5, 'F');
    doc.setFillColor(31,77,46); doc.rect(bx, by+3, bw*(val/100), 5, 'F'); by += 16;
  }
  scoreBar(t('hygienePassword'), h.password);
  scoreBar(t('hygieneUpdate'), h.update);
  if (h.hasNetworks) scoreBar(t('hygieneNetwork'), h.network);
  if (h.hasApps && canSeeApps()) scoreBar(t('hygieneApps'), h.apps);
  if (h.hasBackup && canSeeBackups()) scoreBar(t('hygieneBackup'), h.backup);
  y += 104;

  function sectionHeader(txt){
    ensure(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(31,77,46);
    doc.text(txt, margin, y); y += 6;
    doc.setDrawColor(31,77,46); doc.setLineWidth(1.5); doc.line(margin, y, pageW-margin, y);
    doc.setLineWidth(1); y += 14;
  }

  // Priority Action List
  sectionHeader(t('pdfActionList'));
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(40,40,40);
  var openIssues = active.filter(function(d){ return !d.resolved && getRisk(d.brand,d.pw,d.healthStatus) !== 'green'; });
  if (openIssues.length === 0) {
    doc.text(doc.splitTextToSize('\u2022 ' + t('pdfNoActions'), pageW-margin*2), margin, y); y += 16;
  }
  openIssues.forEach(function(d){
    var r = getRisk(d.brand, d.pw, d.healthStatus);
    var line = (d.label || d.type) + ' (' + d.brand + ') \u2014 ' + getRiskAction(r, d.pw, d.brand) +
      (d.assignedTo ? '  [' + t('assignedToLabel') + ': ' + d.assignedTo + ']' : '');
    var lines = doc.splitTextToSize('\u2022 ' + line, pageW-margin*2-6);
    ensure(lines.length*12 + 4); doc.text(lines, margin, y); y += lines.length*12 + 4;
  });
  y += 6;

  // Device inventory table
  sectionHeader(t('pdfDeviceInventory') + ' (' + active.length + ')');
  var dcols = [ {x:margin, w:120, label:t('pdfDevice')}, {x:margin+120, w:80, label:t('brandLabel')},
                {x:margin+200, w:110, label:t('deviceTypeLabel')}, {x:margin+310, w:55, label:t('pdfPwChanged')},
                {x:margin+365, w:75, label:t('pdfStatus')}, {x:margin+440, w:pageW-margin*2-440, label:t('assignedToLabel')} ];
  function devHeader(){
    doc.setFillColor(242,246,243); doc.rect(margin, y-11, pageW-margin*2, 18, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(31,77,46);
    dcols.forEach(function(c){ doc.text(doc.splitTextToSize(c.label, c.w-4), c.x+3, y); }); y += 13;
  }
  devHeader();
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  active.forEach(function(d){
    var r = getRisk(d.brand, d.pw, d.healthStatus);
    var statusTxt = d.resolved ? t('pdfResolved') : riskWord(r);
    var statusRgb = d.resolved ? [46,125,50] : rgb(r);
    var c0 = doc.splitTextToSize(d.label||d.type, dcols[0].w-4);
    var c1 = doc.splitTextToSize(d.brand, dcols[1].w-4);
    var c2 = doc.splitTextToSize(translateDeviceType(d.type), dcols[2].w-4);
    var c5 = doc.splitTextToSize(d.assignedTo || '\u2014', dcols[5].w-4);
    var rowH = Math.max(c0.length,c1.length,c2.length,c5.length)*10 + 6;
    ensure(rowH+4); 
    doc.setTextColor(40,40,40);
    doc.text(c0, dcols[0].x+3, y+3); doc.text(c1, dcols[1].x+3, y+3); doc.text(c2, dcols[2].x+3, y+3);
    doc.text(d.pw==='yes'?t('pdfYes'):t('pdfNo'), dcols[3].x+3, y+3);
    doc.setTextColor(statusRgb[0],statusRgb[1],statusRgb[2]); doc.setFont('helvetica','bold');
    doc.text(doc.splitTextToSize(statusTxt, dcols[4].w-4), dcols[4].x+3, y+3);
    doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
    doc.text(c5, dcols[5].x+3, y+3);
    y += rowH; doc.setDrawColor(235,235,235); doc.line(margin, y-4, pageW-margin, y-4);
  });
  y += 8;

  // Networks table
  if (networks.length) {
    sectionHeader(t('pdfNetworks') + ' (' + networks.length + ')');
    var ncols = [ {x:margin, w:200, label:t('pdfNetwork')}, {x:margin+200, w:160, label:t('pdfType')},
                  {x:margin+360, w:pageW-margin*2-360, label:t('pdfStatus')} ];
    doc.setFillColor(242,246,243); doc.rect(margin, y-11, pageW-margin*2, 18, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(31,77,46);
    ncols.forEach(function(c){ doc.text(c.label, c.x+3, y); }); y += 13;
    doc.setFont('helvetica','normal');
    networks.forEach(function(n){
      var r = getNetRisk(n); var rc = rgb(r);
      ensure(18); doc.setTextColor(40,40,40);
      doc.text(doc.splitTextToSize(n.label, ncols[0].w-4), ncols[0].x+3, y+3);
      doc.text(doc.splitTextToSize(n.type, ncols[1].w-4), ncols[1].x+3, y+3);
      doc.setTextColor(rc[0],rc[1],rc[2]); doc.setFont('helvetica','bold');
      doc.text(riskWord(r), ncols[2].x+3, y+3); doc.setFont('helvetica','normal');
      y += 16; doc.setDrawColor(235,235,235); doc.line(margin, y-4, pageW-margin, y-4);
    });
    y += 8;
  }

  // Footer disclaimer
  ensure(40);
  doc.setDrawColor(220,220,220); doc.line(margin, y, pageW-margin, y); y += 10;
  doc.setFontSize(8); doc.setTextColor(150,150,150);
  doc.text(doc.splitTextToSize(t('pdfDisclaimer'), pageW-margin*2), margin, y);

  doc.save('Hygiene_Report_' + reportFileStamp() + '.pdf');
  logAction('Exported hygiene report', t('hygieneTitle') + ': ' + h.overall + '/100');
}

// Opens the system mail client to email a hygiene report summary (mailto: stub).
// Actual email delivery requires a backend — this covers the demo.
function emailHygieneReport() {
  if (!canExportReports()) return;
  const email = currentUser.email || '';
  if (!email) { alert(t('emailRequiredForSend')); return; }
  const h = computeHygiene();
  const farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  const now = new Date().toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
  const subject = encodeURIComponent(t('pdfReportTitle') + ' — ' + farm + ' — ' + now);
  const body = encodeURIComponent(
    t('pdfReportTitle') + '\n' + farm + ' — ' + now + '\n\n' +
    t('hygieneTitle') + ': ' + h.overall + '/100\n' +
    t('hygienePassword') + ': ' + h.password + '%\n' +
    t('hygieneUpdate') + ': ' + h.update + '%\n' +
    (h.hasNetworks ? t('hygieneNetwork') + ': ' + h.network + '%\n' : '') +
    (h.hasApps && canSeeApps() ? t('hygieneApps') + ': ' + h.apps + '%\n' : '') +
    (h.hasBackup && canSeeBackups() ? t('hygieneBackup') + ': ' + h.backup + '%\n' : '') +
    '\n— ' + t('emailReportNote')
  );
  window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  logAction('Emailed hygiene report', email);
}

// Opens the system mail client to email the activity log summary.
function emailActivityReport() {
  if (!canExportReports()) return;
  const email = currentUser.email || '';
  if (!email) { alert(t('emailRequiredForSend')); return; }
  const farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  const now = new Date().toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
  const subject = encodeURIComponent(t('pdfActivityTitle') + ' — ' + farm + ' — ' + now);
  const recent = auditLog.slice(0, 10).map(function(e){ return e.ts + ' — ' + e.actor + ': ' + e.action; }).join('\n');
  const body = encodeURIComponent(
    t('pdfActivityTitle') + '\n' + farm + ' — ' + now + '\n\n' +
    (recent || t('pdfNoActivity')) + '\n\n' +
    (auditLog.length > 10 ? '(' + (auditLog.length - 10) + ' more entries in the full download)\n\n' : '') +
    '— ' + t('emailReportNote')
  );
  window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  logAction('Emailed activity log', email);
}
// Records actions only — no device identifiers — consistent with the accountability-without-
// surveillance approach.
// Builds a filename timestamp like 20260626_143052 (local time).
function reportFileStamp() {
  var d = new Date();
  var p = function(n){ return (n < 10 ? '0' : '') + n; };
  return '' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '_' +
    p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

// Shared PDF helpers built on jsPDF. doc is an A4 portrait page in points.
function pdfNew() {
  var jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
  if (!jsPDF) return null;
  return new jsPDF({ unit: 'pt', format: 'a4' });
}

function downloadActivityReport() {
  if (!canExportReports()) return;
  var doc = pdfNew();
  if (!doc) { alert('PDF engine not available.'); return; }
  var farm = (currentUser && currentUser.farm) ? currentUser.farm : t('pdfYourFarm');
  var now = new Date();
  var dateStr = now.toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });

  var margin = 40, pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  var y = margin;

  // Title
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(31,77,46);
  doc.text(t('pdfActivityTitle'), margin, y); y += 18;
  // Subtitle
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(120,120,120);
  doc.text(farm + '  \u00B7  ' + t('pdfGenerated') + ' ' + dateStr + '  \u00B7  ' +
    auditLog.length + ' ' + (auditLog.length === 1 ? t('auditAction') : t('auditActions')), margin, y); y += 20;

  // Table columns
  var cols = [ { x: margin, w: 130, label: t('pdfWhen') },
               { x: margin+130, w: 120, label: t('pdfWho') },
               { x: margin+250, w: pageW - margin*2 - 250, label: t('pdfWhat') } ];
  function header() {
    doc.setFillColor(242,246,243); doc.rect(margin, y-11, pageW-margin*2, 18, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(31,77,46);
    cols.forEach(function(c){ doc.text(c.label, c.x+4, y+1); });
    y += 12; doc.setDrawColor(220,220,220); doc.line(margin, y, pageW-margin, y); y += 8;
  }
  header();
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(40,40,40);

  if (auditLog.length === 0) {
    doc.setTextColor(150,150,150); doc.text(t('pdfNoActivity'), margin+4, y+4); y += 16;
  }
  auditLog.forEach(function(e) {
    var whatText = e.action + (e.detail ? ' \u2014 ' + e.detail : '');
    var whoText = e.actor + ' (' + e.role + ')';
    var whenLines = doc.splitTextToSize(e.ts || '', cols[0].w-8);
    var whoLines = doc.splitTextToSize(whoText, cols[1].w-8);
    var whatLines = doc.splitTextToSize(whatText, cols[2].w-8);
    var rowH = Math.max(whenLines.length, whoLines.length, whatLines.length) * 11 + 6;
    if (y + rowH > pageH - margin) { doc.addPage(); y = margin; header(); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(40,40,40); }
    doc.setTextColor(40,40,40); doc.text(whenLines, cols[0].x+4, y+4);
    doc.text(whoLines, cols[1].x+4, y+4);
    doc.text(whatLines, cols[2].x+4, y+4);
    y += rowH; doc.setDrawColor(235,235,235); doc.line(margin, y-4, pageW-margin, y-4);
  });

  // Footer disclaimer
  y = Math.min(y + 14, pageH - margin);
  doc.setDrawColor(220,220,220); doc.line(margin, y-8, pageW-margin, y-8);
  doc.setFontSize(8); doc.setTextColor(150,150,150);
  doc.text(doc.splitTextToSize(t('pdfActivityDisclaimer'), pageW-margin*2), margin, y+2);

  doc.save('Activity_Log_' + reportFileStamp() + '.pdf');
  logAction('Exported activity log', auditLog.length + ' ' + (auditLog.length === 1 ? t('auditAction') : t('auditActions')));
}

// Computes farm hygiene sub-scores (0-100) and an overall score.
