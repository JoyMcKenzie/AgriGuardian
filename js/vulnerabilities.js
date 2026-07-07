/* AgriGuardian: CISA and NVD checks */
function getRiskBadgeLabel(risk, resolved) {
  const label = getRiskLabel(risk, resolved);
  if (!a11ySettings.colorBlind) return label;
  const icons = { red: '⛔ ', yellow: '⚠️ ', green: '✅ ' };
  const r = resolved ? 'green' : risk;
  return (icons[r] || '') + label;
}
var nvdApiKey = ''; // read by checkNVD(); saveNvdKey() removed (CL1, dead)

function checkVulnerabilities(deviceId) {
  const d = devices.find(x => x.id === deviceId);
  if (!d) return;
  const resultsEl = document.getElementById('vuln-results-' + deviceId);
  if (!resultsEl) return;

  resultsEl.innerHTML = '<div style="padding:10px;font-size:13px;color:#7A8F80;text-align:center">🔍 Checking databases...</div>';

  const brand = (d.brand || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const model = (d.model || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

  // Run CISA KEV and NVD in parallel
  Promise.all([
    checkCISA(brand, model),
    nvdApiKey ? checkNVD(brand, model) : Promise.resolve(null)
  ]).then(function(results) {
    const cisa = results[0];
    const nvd = results[1];
    renderVulnResults(resultsEl, cisa, nvd, d);
  }).catch(function(err) {
    resultsEl.innerHTML = '<div style="padding:10px;font-size:13px;color:#A32D2D">Error checking databases. Check your connection and try again.</div>';
  });
}

function checkCISA(brand, model) {
  // Try direct fetch first, fall back to CORS proxy
  const directUrl = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(directUrl);

  function filterResults(data) {
    const vulns = data.vulnerabilities || [];
    return vulns.filter(v => {
      const vendor = (v.vendorProject || '').toLowerCase();
      const product = (v.product || '').toLowerCase();
      const brandLower = brand.toLowerCase();
      const modelLower = (model || '').toLowerCase();
      return vendor.includes(brandLower) || brandLower.includes(vendor) ||
             (modelLower && (product.includes(modelLower) || modelLower.includes(product)));
    });
  }

  return fetch(directUrl)
    .then(r => { if (!r.ok) throw new Error('Direct fetch failed'); return r.json(); })
    .then(filterResults)
    .catch(function() {
      // Try CORS proxy as fallback
      return fetch(proxyUrl)
        .then(r => r.json())
        .then(filterResults)
        .catch(function() {
          return { error: 'Unable to reach CISA database. Check your internet connection.' };
        });
    });
}

function checkNVD(brand, model) {
  const query = encodeURIComponent((model || brand).substring(0, 50));
  const url = 'https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=' + query + '&resultsPerPage=5';
  const headers = nvdApiKey ? { 'apiKey': nvdApiKey } : {};
  return fetch(url, { headers: headers })
    .then(r => r.json())
    .then(data => data.vulnerabilities || [])
    .catch(() => null);
}

function renderVulnResults(el, cisa, nvd, d) {
  let html = '<div style="border:1px solid #D7E4D7;border-radius:10px;overflow:hidden;margin-bottom:8px">';

  // CISA results
  html += '<div style="background:#F3F8F2;padding:8px 12px;font-size:12px;font-weight:600;color:#5F7266;border-bottom:1px solid #D7E4D7">CISA Known Exploited Vulnerabilities</div>';
  if (cisa && cisa.error) {
    html += '<div style="padding:10px 12px;font-size:13px;color:#7A6514">⚠️ ' + cisa.error + '</div>';
  } else if (!cisa || cisa.length === 0) {
    html += '<div style="padding:10px 12px;font-size:13px;color:#2E7A4E">✅ No known exploited vulnerabilities found for ' + d.brand + '.</div>';
  } else {
    html += '<div style="padding:8px 12px;font-size:12px;color:#A32D2D;font-weight:500">⚠️ ' + cisa.length + ' known exploited vulnerabilit' + (cisa.length>1?'ies':'y') + ' found</div>';
    cisa.slice(0, 3).forEach(function(v) {
      html += '<div style="padding:8px 12px;border-top:1px solid #E4EEE4">' +
        '<div style="font-size:12px;font-weight:600;color:#22372A">' + v.cveID + '</div>' +
        '<div style="font-size:12px;color:#5F7266;margin-top:2px">' + (v.vulnerabilityName || v.shortDescription || '') + '</div>' +
        '<div style="font-size:11px;color:#7A8F80;margin-top:2px">Due: ' + (v.dueDate || 'N/A') + ' &middot; ' + (v.product || '') + '</div>' +
      '</div>';
    });
    if (cisa.length > 3) html += '<div style="padding:6px 12px;font-size:11px;color:#7A8F80;font-style:italic">+ ' + (cisa.length-3) + ' more. Visit cisa.gov/known-exploited-vulnerabilities-catalog for full list.</div>';
  }

  // NVD results
  html += '<div style="background:#F3F8F2;padding:8px 12px;font-size:12px;font-weight:600;color:#5F7266;border-top:1px solid #D7E4D7;border-bottom:1px solid #D7E4D7">NVD — National Vulnerability Database</div>';
  if (nvd === null) {
    html += '<div style="padding:10px 12px;font-size:13px;color:#5F7266">' +
      '<div style="font-weight:500;margin-bottom:4px">🔑 NVD API key not configured</div>' +
      '<div style="font-size:12px;color:#7A8F80;line-height:1.5">The NVD database provides detailed CVE records searchable by model number. A free API key is required to protect the credential server-side. ' +
      'Get one at <strong>nvd.nist.gov/developers/request-an-api-key</strong> and add it in Settings.</div>' +
    '</div>';
  } else if (!nvd || nvd.length === 0) {
    html += '<div style="padding:10px 12px;font-size:13px;color:#2E7A4E">✅ No CVEs found for this model.</div>';
  } else {
    html += '<div style="padding:8px 12px;font-size:12px;color:#7A6514;font-weight:500">' + nvd.length + ' CVE' + (nvd.length>1?'s':'') + ' found</div>';
    nvd.slice(0, 3).forEach(function(item) {
      const cve = item.cve || {};
      const desc = (cve.descriptions || []).find(d => d.lang === 'en');
      const metrics = cve.metrics?.cvssMetricV31?.[0]?.cvssData || cve.metrics?.cvssMetricV2?.[0]?.cvssData || {};
      html += '<div style="padding:8px 12px;border-top:1px solid #E4EEE4">' +
        '<div style="font-size:12px;font-weight:600;color:#22372A">' + (cve.id || '') + (metrics.baseScore ? ' <span style="background:#FBF6E9;color:#3D2B00;padding:1px 6px;border-radius:10px;font-size:10px">CVSS ' + metrics.baseScore + '</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:#5F7266;margin-top:2px">' + (desc ? desc.value.substring(0,120) + (desc.value.length>120?'...':'') : '') + '</div>' +
      '</div>';
    });
  }
  html += '</div>';
  el.innerHTML = html;
}

function setDeviceFilter(filter, btn) {
  deviceFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDeviceList();
}

// Vetted password managers suggested when a device still uses its default password.
// Edit this list as the landscape changes. `free` shows a small "Free" tag.
// `descKey` points to a translation key so each line is localized.
