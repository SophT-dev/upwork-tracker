// ============================================================
// Upwork Proposal Tracker — Bookmarklet Source
//
// SAFETY: This script only READS data already displayed on
// your screen. It makes zero requests to Upwork's servers,
// automates no actions, and cannot get your account banned.
// It only sends data to YOUR OWN Google Sheet.
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
    var all = document.querySelectorAll('li, span, p, div');
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].innerText || '').trim();
      if (t.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 && t.length < 120) {
        // Try to return just the value part
        var parts = t.split(/\n|\r/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (parts.length >= 2) return parts[0]; // usually value is first line
        return t.replace(new RegExp(keyword, 'i'), '').replace(/[:\-–]/g, '').trim();
      }
    }
    return '';
  }

  function bodyHas(str) {
    return document.body.innerText.toLowerCase().indexOf(str.toLowerCase()) !== -1;
  }

  // ── DETECT PAGE TYPE ─────────────────────────────────────
  // Works on:
  //   - Job listing page:   upwork.com/jobs/~...  or /freelance-jobs/
  //   - Proposal/bid page:  upwork.com/proposals/... (after submitting)
  //   - Any Upwork job page after you've applied

  var url = window.location.href;
  var isProposalPage = url.indexOf('/proposals/') !== -1 || url.indexOf('/ab/proposals/') !== -1;

  // ── EXTRACT JOB DETAILS ──────────────────────────────────

  var jobTitle = get([
    '[data-test="job-title"]',
    'h1.m-0',
    'h1[class*="title"]',
    'h1'
  ]);

  var description = get([
    '[data-test="description"] .air3-truncation',
    '[data-test="description"]',
    '.description .break',
    '.air3-truncation',
    '[data-ev-label="job_description"]',
    '.job-description'
  ]);

  var budget = get([
    '[data-test="budget"]',
    '[data-test="price-amount"]',
    '[data-test="budgetAmount"]',
    '[data-test="hourly-rate"]',
    '[data-test="rate"]'
  ]);

  var jobType = get([
    '[data-test="job-type"]',
    '[data-test="employment-type"]'
  ]) || (bodyHas('Fixed-price') ? 'Fixed-price' : bodyHas('Hourly') ? 'Hourly' : '');

  var experienceLevel = get([
    '[data-test="expertise-level"]',
    '[data-test="experience-level"]',
    '[data-test="contractor-tier"]'
  ]);

  var duration = get([
    '[data-test="duration"]',
    '[data-test="project-duration"]',
    '[data-test="engagement"]'
  ]);

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
  if (connectsRequired) {
    var cNum = connectsRequired.match(/\d+/);
    if (cNum) connectsRequired = cNum[0];
  }

  var proposalsSoFar = get([
    '[data-test="proposals-tier"]',
    '[data-test="ClientActivity-bidsCount"]',
    '[data-test="proposals"]'
  ]);

  // ── EXTRACT CLIENT INFO ──────────────────────────────────

  var clientLocation = get([
    '[data-test="client-location"] strong',
    '[data-test="client-location"]',
    '.cfe-ui-client-location',
    '[data-test="location"]',
    '[data-ev-label="client_location"]'
  ]);

  var clientRating = get([
    '[data-test="client-rating"]',
    '.air3-rating-value-text',
    '[data-test="rating"] strong'
  ]);

  var paymentVerified = (bodyHas('Payment verified') || bodyHas('Payment method verified')) ? 'Yes' : 'No';

  var clientSpent = get([
    '[data-test="total-spent"]',
    '[data-test="amount-spent"]',
    '[data-test="money-spent"]'
  ]);

  var hireRate = get([
    '[data-test="hire-rate"]',
    '[data-test="openings-stats"]'
  ]);

  var jobsPosted = get([
    '[data-test="jobs-posted"]',
    '[data-test="jobs-count"]'
  ]);

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

  // Auto-extract hook = first non-empty paragraph of the proposal
  var hookAuto = '';
  if (submittedProposal) {
    var paragraphs = submittedProposal.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (paragraphs.length > 0) hookAuto = paragraphs[0];
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
    : '<div class="upt-manual">Tip: click the bookmarklet on the proposal confirmation page to also auto-fill your proposal text and connects.</div>';

  var html = '<div id="upt-modal">' +
    '<h2>📋 Log Upwork Proposal</h2>' +
    manualNote +

    '<div class="upt-sec">Job Info</div>' +
    '<div class="upt-row">' +
      '<div class="upt-f"><label>Date</label><input type="date" id="upt-date" value="' + today + '"></div>' +
      sel('Invite?', 'invite', ['No', 'Yes'], 'No') +
    '</div>' +
    inp('Job Title', 'jobTitle', jobTitle) +
    '<div class="upt-row">' +
      inp('Job Type', 'jobType', jobType) +
      inp('Budget', 'budget', budget) +
    '</div>' +
    '<div class="upt-row">' +
      inp('Experience Level', 'expLevel', experienceLevel) +
      inp('Duration', 'duration', duration) +
    '</div>' +
    inp('Category', 'category', category) +
    inp('Skills', 'skills', skills) +
    '<div class="upt-row">' +
      inp('Connects Required', 'connectsReq', connectsRequired) +
      inp('Proposals So Far', 'proposalsSoFar', proposalsSoFar) +
    '</div>' +

    '<div class="upt-sec">Client Info</div>' +
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

    '<div class="upt-sec">Your Proposal</div>' +
    inp('Hook (first paragraph — edit to shorten)', 'hook', hookAuto) +
    ta('Proposal Text', 'proposal', submittedProposal, 'upt-lg') +
    '<div class="upt-row">' +
      inp('Connects Used', 'connectsUsed', submittedConnects, 'number') +
      inp('Boost Connects', 'boostConnects', submittedBoost, 'number') +
      inp('Total Connects', 'totalConnects', totalConnectsAuto, 'number') +
    '</div>' +

    '<div class="upt-sec">Outcome (update later if needed)</div>' +
    '<div class="upt-row">' +
      sel('Viewed?', 'viewed', ['—', 'Yes', 'No'], '—') +
      sel('Replied?', 'replied', ['—', 'Yes', 'No'], '—') +
      sel('Closed?', 'closed', ['—', 'Yes', 'No'], '—') +
    '</div>' +
    inp('Reason if not closed', 'reasonIfNot', '') +

    '<div class="upt-btns">' +
      '<button id="upt-log">Log to Sheet</button>' +
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
      experienceLevel: v('expLevel'),
      duration:        v('duration'),
      category:        v('category'),
      skills:          v('skills'),
      connectsRequired:v('connectsReq'),
      proposalsSoFar:  v('proposalsSoFar'),
      invite:          v('invite'),
      clientLocation:  v('clientLocation'),
      paymentVerified: v('paymentVerified'),
      clientRating:    v('clientRating'),
      hireRate:        v('hireRate'),
      clientSpent:     v('clientSpent'),
      jobsPosted:      v('jobsPosted'),
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

    // mode: 'no-cors' bypasses CORS restrictions.
    // The request IS sent; we just can't read the response body.
    // We assume success if no network error occurs.
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
