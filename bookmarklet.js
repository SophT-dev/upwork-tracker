// ============================================================
// Upwork Proposal Tracker — Bookmarklet Source
//
// SAFETY: This script only READS data already displayed on
// your screen. It makes zero requests to Upwork's servers,
// automates no actions, and cannot get your account banned.
// It only sends data to YOUR OWN Google Sheet and proposal agent.
//
// SETUP:
// 1. Deploy upwork-proposals.gs as a Web App (see README)
// 2. Paste your Web App URL below
// 3. Minify this file and add "javascript:" prefix for bookmarklet
// ============================================================

(function () {
  'use strict';

  // ── PASTE YOUR WEB APP URL HERE ─────────────────────────
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbywI--e3u7s4sQ3arObzNuOgkG2Piac8-U3IIBAatid0jxW8MllLdkuvmkD4xdwY0cn9A/exec';
  // ────────────────────────────────────────────────────────

  // Prevent double-injection
  if (document.getElementById('upt-overlay')) {
    document.getElementById('upt-overlay').remove();
    return;
  }

  // ── EXTRACTION HELPERS ───────────────────────────────────

  // Try a list of CSS selectors, return first non-empty text match
  function get(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var t = el.innerText || el.textContent || '';
        t = t.trim();
        if (t) return t;
      }
    }
    return '';
  }

  // Collect all matching elements, join as comma list
  function getAll(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length > 0) {
        var vals = Array.from(els).map(function (e) {
          return (e.innerText || e.textContent || '').trim();
        }).filter(Boolean);
        if (vals.length) return vals.join(', ');
      }
    }
    return '';
  }

  // Search all text nodes for a keyword label, return the value near it
  function findNear(keyword) {
    var all = document.querySelectorAll('li, span, p, div, section, strong, small');
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].innerText || '').trim();
      if (t.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 && t.length < 150) {
        var parts = t.split(/\n|\r/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (parts.length >= 2) return parts[parts.length - 1];
        return t.replace(new RegExp(keyword, 'i'), '').replace(/[:\-–]/g, '').trim();
      }
    }
    return '';
  }

  // Find a text block that contains keyword and extract the first number from it
  function findNumber(keyword) {
    var t = findNear(keyword);
    if (t) {
      var m = t.match(/[\d,]+\.?\d*/);
      if (m) return m[0];
    }
    return '';
  }

  // Check if the page body contains a string (case-insensitive)
  function bodyHas(str) {
    return document.body.innerText.toLowerCase().indexOf(str.toLowerCase()) !== -1;
  }

  // Get the full text content of the "About the client" sidebar section
  function getClientSection() {
    var headers = document.querySelectorAll('h2, h3, h4, h5, strong, [class*="header"], [class*="Header"]');
    for (var i = 0; i < headers.length; i++) {
      var t = (headers[i].innerText || '').trim().toLowerCase();
      if (t.indexOf('about the client') !== -1) {
        var parent = headers[i].parentElement;
        while (parent && parent.innerText.length < 100) parent = parent.parentElement;
        return parent ? parent.innerText : '';
      }
    }
    return '';
  }

  // ── DETECT PAGE TYPE ─────────────────────────────────────
  var url = window.location.href;
  var isProposalPage = url.indexOf('/proposals/') !== -1 || url.indexOf('/ab/proposals/') !== -1;
  var clientSection = getClientSection();

  // ── EXTRACT JOB DETAILS ──────────────────────────────────

  var jobTitle = get([
    '[data-test="job-title"]',
    'h1.m-0',
    'h1[class*="title"]',
    'h1[class*="Title"]',
    '.job-title',
    'h1'
  ]);
  // Clean up: if h1 grabbed nav text or something too short, ignore
  if (jobTitle && jobTitle.length < 5) jobTitle = '';

  // Description: try selectors, then scan for Summary section
  var description = get([
    '[data-test="description"] .air3-truncation',
    '[data-test="description"]',
    '[data-test="job-description"]',
    '.description .break',
    '.air3-truncation',
    '[data-ev-label="job_description"]',
    '.job-description',
    '.up-truncation'
  ]);
  if (!description) {
    // Try to find the Summary section specifically
    var summaryHeaders = document.querySelectorAll('h2, h3, h4, strong, [class*="header"]');
    for (var sh = 0; sh < summaryHeaders.length; sh++) {
      var ht = (summaryHeaders[sh].innerText || '').trim().toLowerCase();
      if (ht === 'summary' || ht === 'description') {
        var nextEl = summaryHeaders[sh].nextElementSibling;
        while (nextEl) {
          var nt = (nextEl.innerText || '').trim();
          if (nt.length > 80) { description = nt; break; }
          nextEl = nextEl.nextElementSibling;
        }
        if (!description) {
          var par = summaryHeaders[sh].parentElement;
          if (par) {
            var pt = par.innerText.replace(/^summary\s*/i, '').trim();
            if (pt.length > 80) description = pt;
          }
        }
        break;
      }
    }
  }
  if (!description) {
    // Last resort: longest paragraph on page
    var allPs = document.querySelectorAll('p, .break, section p');
    var longest = '';
    Array.from(allPs).forEach(function(el) {
      var t = (el.innerText || '').trim();
      if (t.length > longest.length) longest = t;
    });
    if (longest.length > 100) description = longest;
  }

  var budget = get([
    '[data-test="budget"]',
    '[data-test="price-amount"]',
    '[data-test="budgetAmount"]',
    '[data-test="hourly-rate"]',
    '[data-test="rate"]'
  ]);
  if (!budget) {
    var budgetText = findNear('Est. budget') || findNear('Budget');
    if (budgetText) {
      var bm = budgetText.match(/\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$[\d,]+(?:\.\d+)?)?(?:\/hr)?/);
      if (bm) budget = bm[0];
    }
  }

  var jobType = get([
    '[data-test="job-type"]',
    '[data-test="employment-type"]'
  ]) || (bodyHas('Fixed-price') ? 'Fixed-price' : bodyHas('Hourly') ? 'Hourly' : '');

  var hoursPerWeek = '';
  var hrsPatterns = ['Less than 30 hrs/week', 'More than 30 hrs/week', '30+ hrs/week'];
  hrsPatterns.forEach(function(p) {
    if (!hoursPerWeek && bodyHas(p)) hoursPerWeek = p;
  });

  var experienceLevel = get([
    '[data-test="expertise-level"]',
    '[data-test="experience-level"]',
    '[data-test="contractor-tier"]',
    '[data-test="contractor-tier-label"]'
  ]);
  if (!experienceLevel) {
    ['Expert', 'Intermediate', 'Entry Level'].forEach(function(lvl) {
      if (!experienceLevel && bodyHas(lvl)) experienceLevel = lvl;
    });
  }

  var duration = get([
    '[data-test="duration"]',
    '[data-test="project-duration"]',
    '[data-test="engagement"]',
    '[data-test="project-length"]'
  ]);
  if (!duration) {
    var durPatterns = ['Less than 1 month', '1 to 3 Months', '1 to 3 months', '3 to 6 months', '3 to 6 Months', 'More than 6 months', 'Ongoing'];
    durPatterns.forEach(function(d) {
      if (!duration && bodyHas(d)) duration = d;
    });
  }

  var category = get([
    '[data-test="category"]',
    '[data-test="subcategory"]',
    '.up-breadcrumb li:last-child a',
    'nav[aria-label*="breadcrumb"] li:last-child'
  ]);

  var skills = getAll([
    '[data-test="skills-list"] a',
    '[data-test="TokenTag"]',
    '.air3-badge-taglist a',
    '[data-test="attr-item"]',
    '.up-skill-badge',
    'a[href*="/nx/search/jobs/?q="]'
  ]);

  // Connects required to apply
  var connectsRequired = get([
    '[data-test="connects-count"]',
    '[data-test="tierLabel"]',
    '[data-test="connect-price"]'
  ]);
  if (!connectsRequired) {
    var crText = findNear('Send a proposal for') || findNear('Connects');
    if (crText) {
      var crm = crText.match(/(\d+)\s*Connect/i);
      if (crm) connectsRequired = crm[1];
    }
  }
  if (connectsRequired) {
    var cNum = connectsRequired.match(/\d+/);
    if (cNum) connectsRequired = cNum[0];
  }

  var proposalsSoFar = get([
    '[data-test="proposals-tier"]',
    '[data-test="ClientActivity-bidsCount"]',
    '[data-test="proposals"]'
  ]);
  if (!proposalsSoFar) {
    var propText = findNear('Proposals');
    if (propText) {
      var pm = propText.match(/\d+\s*to\s*\d+|\d+/);
      if (pm) proposalsSoFar = pm[0];
    }
  }

  // ── EXTRACT CLIENT INFO ──────────────────────────────────

  var clientLocation = get([
    '[data-test="client-location"] strong',
    '[data-test="client-location"]',
    '.cfe-ui-client-location',
    '[data-test="location"]',
    '[data-ev-label="client_location"]'
  ]);
  if (!clientLocation && clientSection) {
    // Look for country name in the "About the client" section
    // Common pattern: country name appears on its own line, often after payment/phone verified
    var csLines = clientSection.split(/\n/).map(function(s) { return s.trim(); }).filter(Boolean);
    var countries = ['United States', 'USA', 'United Kingdom', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'India',
      'Netherlands', 'Switzerland', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Ireland', 'Israel', 'Singapore',
      'UAE', 'Saudi Arabia', 'Brazil', 'Mexico', 'Spain', 'Italy', 'Japan', 'South Korea', 'China', 'New Zealand',
      'Belgium', 'Austria', 'Portugal', 'Poland', 'Czech Republic', 'Romania', 'Bulgaria', 'Croatia', 'Hungary',
      'Egypt', 'Nigeria', 'Kenya', 'South Africa', 'Pakistan', 'Bangladesh', 'Philippines', 'Vietnam', 'Thailand',
      'Indonesia', 'Malaysia', 'Turkey', 'Greece', 'Colombia', 'Argentina', 'Chile', 'Peru'];
    for (var ci = 0; ci < csLines.length; ci++) {
      for (var cj = 0; cj < countries.length; cj++) {
        if (csLines[ci].indexOf(countries[cj]) !== -1 && csLines[ci].length < 40) {
          clientLocation = countries[cj];
          break;
        }
      }
      if (clientLocation) break;
    }
  }
  // Strip time zone suffix (e.g. "Phoenix 8:44 AM" → keep as-is for city context)

  var clientName = '';
  var clientCompany = '';
  // These aren't reliably available on job listing pages — leave for manual entry

  var clientRating = get([
    '[data-test="client-rating"]',
    '.air3-rating-value-text',
    '[data-test="rating"] strong'
  ]);
  if (!clientRating && clientSection) {
    var rm = clientSection.match(/([\d.]+)\s*of\s*\d+\s*review/i);
    if (rm) clientRating = rm[1];
    if (!clientRating) {
      rm = clientSection.match(/★+.*?([\d.]+)/);
      if (rm) clientRating = rm[1];
    }
  }

  var paymentVerified = (bodyHas('Payment verified') || bodyHas('Payment method verified')) ? 'Yes' : 'No';

  var clientSpent = get([
    '[data-test="total-spent"]',
    '[data-test="amount-spent"]',
    '[data-test="money-spent"]'
  ]);
  if (!clientSpent && clientSection) {
    var sm = clientSection.match(/\$([\d.]+[KkMm]?)\s*total\s*spent/i);
    if (sm) clientSpent = '$' + sm[1];
    if (!clientSpent) {
      sm = clientSection.match(/total\s*spent[:\s]*\$([\d,.]+[KkMm]?)/i);
      if (sm) clientSpent = '$' + sm[1];
    }
  }

  var hireRate = get([
    '[data-test="hire-rate"]',
    '[data-test="openings-stats"]'
  ]);
  if (!hireRate && clientSection) {
    var hrm = clientSection.match(/(\d+%)\s*hire\s*rate/i);
    if (hrm) hireRate = hrm[1];
  }

  var jobsPosted = get([
    '[data-test="jobs-posted"]',
    '[data-test="jobs-count"]'
  ]);
  if (!jobsPosted && clientSection) {
    var jpm = clientSection.match(/(\d+)\s*jobs?\s*posted/i);
    if (jpm) jobsPosted = jpm[1];
  }

  var avgHourlyRate = '';
  if (clientSection) {
    var ahrm = clientSection.match(/\$([\d.]+)\s*\/hr\s*avg/i) || clientSection.match(/avg\s*hourly\s*rate\s*paid[:\s]*\$([\d.]+)/i);
    if (ahrm) avgHourlyRate = '$' + ahrm[1] + '/hr avg';
  }

  var memberSince = '';
  if (clientSection) {
    var msm = clientSection.match(/Member\s*since\s*([A-Za-z]+\s*\d{1,2},?\s*\d{4}|[A-Za-z]+\s+\d{4})/i);
    if (msm) memberSince = msm[1];
  }

  // ── EXTRACT YOUR SUBMITTED PROPOSAL (if on proposal page) ──

  var submittedProposal = '';
  var submittedConnects = '';
  var submittedBoost = '';

  if (isProposalPage) {
    submittedProposal = get([
      '[data-test="cover-letter"]',
      '[data-test="cover-letter-text"]',
      '.cover-letter',
      '[data-test="bid-cover-letter"]',
      '[data-ev-label="cover_letter"]',
      '.freelancer-cover-letter'
    ]);

    submittedConnects = get([
      '[data-test="bid-connects"]',
      '[data-test="connects-used"]',
      '[data-test="bid-connects-count"]'
    ]);
    if (submittedConnects) {
      var scNum = submittedConnects.match(/\d+/);
      if (scNum) submittedConnects = scNum[0];
    }

    submittedBoost = get([
      '[data-test="boost-connects"]',
      '[data-test="bid-boost"]',
      '[data-test="boosted-connects"]'
    ]);
    if (submittedBoost) {
      var sbNum = submittedBoost.match(/\d+/);
      if (sbNum) submittedBoost = sbNum[0];
    }
  }

  var totalConnectsAuto = '';
  if (submittedConnects || submittedBoost) {
    var tc = (parseInt(submittedConnects) || 0) + (parseInt(submittedBoost) || 0);
    totalConnectsAuto = tc > 0 ? String(tc) : '';
  }

  // Hook = first 231 characters of proposal
  var hookAuto = '';
  if (submittedProposal) {
    hookAuto = submittedProposal.trim().substring(0, 231);
  }

  var today = new Date().toISOString().split('T')[0];

  // ── INJECT STYLES ────────────────────────────────────────

  var style = document.createElement('style');
  style.id = 'upt-style';
  style.textContent = [
    '#upt-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.55);z-index:2147483647;display:flex;align-items:flex-start;justify-content:flex-end;font-family:Arial,sans-serif;font-size:13px;line-height:1.4}',
    '#upt-modal{background:#fff;width:430px;height:100vh;overflow-y:auto;padding:14px;box-shadow:-4px 0 24px rgba(0,0,0,.35);box-sizing:border-box}',
    '#upt-modal *{box-sizing:border-box}',
    '#upt-modal h2{font-size:14px;margin:0 0 10px;color:#14a800;font-weight:700}',
    '.upt-sec{font-size:10px;font-weight:700;text-transform:uppercase;color:#888;margin:10px 0 5px;border-top:1px solid #eee;padding-top:7px}',
    '.upt-f{margin-bottom:7px}',
    '.upt-f label{display:block;font-weight:700;margin-bottom:2px;color:#333;font-size:11px}',
    '#upt-modal input,#upt-modal select,#upt-modal textarea{width:100%;padding:5px 7px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:Arial,sans-serif;background:#fff;color:#000}',
    '#upt-modal textarea{resize:vertical;min-height:60px}',
    '#upt-modal textarea.upt-lg{min-height:110px}',
    '.upt-row{display:flex;gap:6px}',
    '.upt-row .upt-f{flex:1}',
    '.upt-btns{display:flex;gap:8px;margin-top:10px}',
    '#upt-log{flex:1;padding:9px;background:#14a800;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer}',
    '#upt-log:hover{background:#0f8800}',
    '#upt-log:disabled{background:#999;cursor:default}',
    '#upt-generate{flex:1;padding:9px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer}',
    '#upt-generate:hover{background:#1d4ed8}',
    '#upt-generate:disabled{background:#999;cursor:default}',
    '#upt-cancel{padding:9px 14px;background:#eee;color:#333;border:none;border-radius:4px;font-size:13px;cursor:pointer}',
    '#upt-cancel:hover{background:#ddd}',
    '#upt-status{text-align:center;margin-top:7px;font-weight:700;font-size:12px;min-height:16px}',
    '.upt-manual{background:#fffbe6;border-left:3px solid #f0c000;padding:4px 6px;margin-bottom:4px;font-size:11px;color:#665500}'
  ].join('');
  document.head.appendChild(style);

  // ── BUILD MODAL HTML ─────────────────────────────────────

  function inp(label, id, val, type) {
    val = (val || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return '<div class="upt-f"><label>' + label + '</label>' +
      '<input type="' + (type || 'text') + '" id="upt-' + id + '" value="' + val + '"></div>';
  }

  function ta(label, id, val, cls) {
    val = (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div class="upt-f"><label>' + label + '</label>' +
      '<textarea id="upt-' + id + '" class="' + (cls || '') + '">' + val + '</textarea></div>';
  }

  function sel(label, id, options, selected) {
    var opts = options.map(function (o) {
      return '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    return '<div class="upt-f"><label>' + label + '</label><select id="upt-' + id + '">' + opts + '</select></div>';
  }

  var manualNote = isProposalPage
    ? ''
    : '<div class="upt-manual">Best results: click this icon after submitting your proposal — that page has your cover letter, Q&A answers, boost bid, and all job details together.</div>';

  var html = '<div id="upt-modal">' +
    '<h2>📋 Log Upwork Proposal</h2>' +
    manualNote +

    '<div class="upt-sec">Job Info</div>' +
    '<div class="upt-row">' +
      '<div class="upt-f"><label>Date (from post)</label><input type="date" id="upt-date" value="' + today + '"></div>' +
      sel('Invite?', 'invite', ['No', 'Yes'], 'No') +
    '</div>' +
    inp('Job Title', 'jobTitle', jobTitle) +
    '<div class="upt-row">' +
      inp('Category', 'category', category) +
      inp('Job Type', 'jobType', jobType) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Budget / Rate', 'budget', budget) +
      inp('Hours/Week', 'hoursPerWeek', hoursPerWeek) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Experience Level', 'expLevel', experienceLevel) +
      inp('Duration', 'duration', duration) +
    '</div>' +
    inp('Skills', 'skills', skills) +
    '<div class="upt-row">' +
      inp('Connects Required', 'connectsReq', connectsRequired) +
      inp('Proposals So Far', 'proposalsSoFar', proposalsSoFar) +
    '</div>' +

    '<div class="upt-sec">Client Info</div>' +
    '<div class="upt-row">' +
      inp('Client Name', 'clientName', clientName) +
      inp('Company', 'company', clientCompany) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Client Location', 'clientLocation', clientLocation) +
      inp('Payment Verified', 'paymentVerified', paymentVerified) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Rating', 'clientRating', clientRating) +
      inp('Hire Rate', 'hireRate', hireRate) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Total Spent', 'clientSpent', clientSpent) +
      inp('Jobs Posted', 'jobsPosted', jobsPosted) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Avg Hourly Rate', 'avgHourlyRate', avgHourlyRate) +
      inp('Member Since', 'memberSince', memberSince) +
    '</div>' +

    '<div class="upt-sec">Your Proposal</div>' +
    inp('Hook (first 231 chars — auto-extracted)', 'hook', hookAuto) +
    ta('Full Proposal (incl. Q&A answers)', 'proposal', submittedProposal, 'upt-lg') +
    '<div class="upt-row">' +
      inp('Connects Used', 'connectsUsed', submittedConnects, 'number') +
      inp('Boost Connects', 'boostConnects', submittedBoost, 'number') +
      inp('Total Connects', 'totalConnects', totalConnectsAuto, 'number') +
    '</div>' +

    '<div class="upt-sec">Outcome</div>' +
    '<div class="upt-row">' +
      sel('Viewed?', 'viewed', ['No', 'Yes'], 'No') +
      sel('Replied?', 'replied', ['No', 'Yes'], 'No') +
      sel('Closed?', 'closed', ['No', 'Yes'], 'No') +
    '</div>' +
    inp('Reason if not closed', 'reasonIfNot', '') +

    '<div class="upt-btns">' +
      '<button id="upt-log">Log to Sheet</button>' +
      '<button id="upt-generate">Generate Proposal</button>' +
      '<button id="upt-cancel">Cancel</button>' +
    '</div>' +
    '<div id="upt-status"></div>' +
  '</div>';

  var overlay = document.createElement('div');
  overlay.id = 'upt-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // ── WIRE UP EVENTS ───────────────────────────────────────

  function v(id) {
    var el = document.getElementById('upt-' + id);
    return el ? (el.value || '').trim() : '';
  }

  // Auto-calc total connects
  function calcTotal() {
    var u = parseInt(v('connectsUsed')) || 0;
    var b = parseInt(v('boostConnects')) || 0;
    var tot = document.getElementById('upt-totalConnects');
    if (tot) tot.value = (u + b) || '';
  }
  ['upt-connectsUsed', 'upt-boostConnects'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', calcTotal);
  });

  // Close on backdrop click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('upt-cancel').addEventListener('click', function () {
    overlay.remove();
  });

  // ── GENERATE PROPOSAL (sends to proposal agent server) ──

  document.getElementById('upt-generate').addEventListener('click', function () {
    var btn = document.getElementById('upt-generate');
    var status = document.getElementById('upt-status');

    btn.disabled = true;
    btn.textContent = 'Sending...';
    status.style.color = '#2563eb';
    status.textContent = 'Starting proposal generation...';

    var payload = {
      url: window.location.href,
      title: v('jobTitle'),
      description: description,
      budget: v('budget'),
      job_type: v('jobType'),
      client_country: v('clientLocation'),
      rating: v('clientRating'),
      total_spent: v('clientSpent'),
      total_hires: '',
      avg_hourly_rate_paid: v('avgHourlyRate'),
      experience_level: v('expLevel'),
      duration: v('duration'),
      payment_verified: v('paymentVerified'),
      connects_required: v('connectsReq')
    };

    fetch('http://localhost:8000/jobs/from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (resp) {
      return resp.json().then(function (data) { return { ok: resp.ok, data: data }; });
    }).then(function (result) {
      if (!result.ok) {
        status.style.color = '#c0392b';
        status.textContent = result.data.detail || 'Error starting proposal.';
        btn.disabled = false;
        btn.textContent = 'Generate Proposal';
        return;
      }
      status.style.color = '#14a800';
      status.textContent = '✓ Proposal pipeline started!';
      window.open('http://localhost:8000/review/' + result.data.job_id, '_blank');
      setTimeout(function () { overlay.remove(); }, 1500);
    }).catch(function () {
      status.style.color = '#c0392b';
      status.textContent = 'Could not reach server. Is it running on port 8000?';
      btn.disabled = false;
      btn.textContent = 'Generate Proposal';
    });
  });

  // ── LOG TO SHEET ────────────────────────────────────────

  document.getElementById('upt-log').addEventListener('click', function () {
    var btn = document.getElementById('upt-log');
    var status = document.getElementById('upt-status');

    if (WEB_APP_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
      status.style.color = '#c0392b';
      status.textContent = 'Set WEB_APP_URL in the bookmarklet first!';
      return;
    }

    var payload = {
      date:            v('date'),
      jobTitle:        v('jobTitle'),
      jobType:         v('jobType'),
      budget:          v('budget'),
      hoursPerWeek:    v('hoursPerWeek'),
      experienceLevel: v('expLevel'),
      duration:        v('duration'),
      category:        v('category'),
      skills:          v('skills'),
      connectsRequired:v('connectsReq'),
      proposalsSoFar:  v('proposalsSoFar'),
      invite:          v('invite'),
      clientName:      v('clientName'),
      company:         v('company'),
      clientLocation:  v('clientLocation'),
      paymentVerified: v('paymentVerified'),
      clientRating:    v('clientRating'),
      hireRate:        v('hireRate'),
      clientSpent:     v('clientSpent'),
      jobsPosted:      v('jobsPosted'),
      avgHourlyRate:   v('avgHourlyRate'),
      memberSince:     v('memberSince'),
      hook:            v('hook'),
      proposal:        v('proposal'),
      connectsUsed:    v('connectsUsed'),
      boostConnects:   v('boostConnects'),
      totalConnects:   v('totalConnects'),
      viewed:          v('viewed'),
      replied:         v('replied'),
      closed:          v('closed'),
      reasonIfNot:     v('reasonIfNot'),
      sourceUrl:       window.location.href
    };

    btn.disabled = true;
    btn.textContent = 'Logging...';
    status.style.color = '#666';
    status.textContent = '';

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function () {
      status.style.color = '#14a800';
      status.textContent = '✓ Logged to sheet!';
      setTimeout(function () { overlay.remove(); }, 1800);
    }).catch(function (err) {
      status.style.color = '#c0392b';
      status.textContent = 'Failed to send. Check console (F12).';
      console.error('[Upwork Tracker]', err);
      btn.disabled = false;
      btn.textContent = 'Log to Sheet';
    });
  });

})();
