// ============================================================
// Upwork Proposal Tracker — Chrome Extension Content Script
// SAFETY: Reads only what is already visible on your screen.
// Makes zero requests to Upwork. Cannot get you banned.
// ============================================================

// ── PASTE YOUR WEB APP URL HERE ─────────────────────────────
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwFIe0-Mf7-i1njHtt38C0WDlaUc4FAoTReJvjKXXIEr-4xLW10CEQckB27IoJC7gu4ZQ/exec';
// ────────────────────────────────────────────────────────────

(function () {
  if (document.getElementById('upt-overlay')) {
    document.getElementById('upt-overlay').remove();
    var s = document.getElementById('upt-style');
    if (s) s.remove();
    return;
  }

  var url = window.location.href;
  var isProposalPage = /\/(nx\/proposals|ab\/proposals|proposals)\//i.test(url);
  var bodyText = document.body.innerText || '';

  // ── HELPERS ─────────────────────────────────────────────

  function fromBody(regex) {
    var m = bodyText.match(regex);
    return m ? (m[1] || m[0]).trim() : '';
  }

  function get(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var t = (el.innerText || el.textContent || '').trim();
        if (t) return t;
      }
    }
    return '';
  }

  function getAll(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length) {
        var vals = Array.from(els)
          .map(function (e) { return (e.innerText || '').trim(); })
          .filter(Boolean);
        if (vals.length) return vals.join(', ');
      }
    }
    return '';
  }

  // Parse "Mar 19, 2026" → "2026-03-19"
  function parsePostedDate(str) {
    if (!str) return '';
    var d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }

  // ── JOB INFO ─────────────────────────────────────────────
  // Page structure:
  //   Proposal details
  //   Job details            ← section header (NOT the title)
  //   B2B lead generation…   ← actual job title
  //   Lead Generation  Posted Mar 19, 2026

  // Skip "Job details" header, grab the line after it
  var jobTitle = fromBody(/Job details\n([^\n]+)/);

  // Category — word(s) right before "Posted Month DD, YYYY" (same line or previous line)
  var category = fromBody(/^([^\n]+?)\s+Posted\s+\w+\s+\d+,\s+\d{4}/m)
              || fromBody(/([^\n]+)\nPosted\s+\w+\s+\d+,\s+\d{4}/);

  // Date of the post — "Posted Mar 19, 2026"
  var postedDateRaw = fromBody(/Posted\s+(\w+\s+\d+,\s+\d{4})/);
  var postedDate = parsePostedDate(postedDateRaw);
  var today = new Date().toISOString().split('T')[0];
  var dateValue = postedDate || today;

  var budget = fromBody(/(\$[\d,.]+ ?[-–] ?\$[\d,.]+)\n(?:Hourly range|Fixed.price budget)/)
            || fromBody(/(\$[\d,]+(?:\.\d+)?)\nFixed.price budget/);

  var jobType = fromBody(/\n(Fixed[-\s]price|Hourly)\n/);

  var hoursPerWeek = fromBody(/((?:Less than|More than)?\s*\d+[\d\s–-]*\s*hrs?\/week)/i);

  var experienceLevel = fromBody(/([^\n]+)\nExperience level/);

  var duration = fromBody(/([^\n]+)\nProject length/);

  // Skills — between "Skills and expertise" and "Your proposed terms"
  var skillsRaw = fromBody(/Skills and expertise\n([\s\S]+?)\nYour proposed terms/);
  var skills = getAll([
    '[data-test="skills-list"] a', '[data-test="TokenTag"]',
    '.air3-badge-taglist a', '[data-test="attr-item"]',
    '.up-skill-badge', '[class*="skill"] a'
  ]);
  if (!skills && skillsRaw) {
    // Skills are CamelCase-joined in innerText — split on capital letters
    skills = skillsRaw.replace(/([a-z0-9])([A-Z])/g, '$1, $2').trim();
  }

  // ── CLIENT INFO ──────────────────────────────────────────
  // Two observed layouts:
  //
  // Layout A (company + name shown):
  //   Client
  //   iHousz ( Paul Jurjak )
  //   About the client
  //   iHousz
  //   Romania
  //   10:04 AM              ← time on its own line, no city
  //
  // Layout B (anonymous client):
  //   About the client
  //   4.84 of 34 reviews
  //   United States
  //   Dublin  5:05 AM       ← city + time on same line

  // Client name & company — extract from "Client\nX ( Y )" header when present
  var clientName = '';
  var company = '';
  var clientHeader = fromBody(/^Client\n([^\n]+)/m);
  if (clientHeader) {
    var nameParenMatch = clientHeader.match(/^(.+?)\s*\(\s*(.+?)\s*\)$/);
    if (nameParenMatch) {
      company = nameParenMatch[1].trim();
      clientName = nameParenMatch[2].trim();
    } else {
      company = clientHeader.trim();
    }
  }

  // Location — handle both layouts:
  // Layout B: Country\nCity  HH:MM AM/PM  → "City, Country"
  // Layout A: Country\nHH:MM AM/PM        → "Country" only
  var clientLocation = '';
  // Layout B: "United States\nDublin  5:05 AM" or "United States\nDublin 5:05 AM"
  var locMatchB = bodyText.match(/([A-Z][a-zA-Z ]+)\n([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+\d{1,2}:\d{2}/);
  if (locMatchB) {
    clientLocation = locMatchB[2].trim() + ', ' + locMatchB[1].trim();
  }
  if (!clientLocation) {
    // Layout A: country on its own line immediately before a time-only line
    var locMatchA = bodyText.match(/^([A-Z][a-zA-Z ]{2,})\n\s*\d{1,2}:\d{2}/m);
    if (locMatchA) clientLocation = locMatchA[1].trim();
  }
  if (!clientLocation) {
    clientLocation = get(['[data-test="client-location"] strong', '[data-test="client-location"]']);
  }

  var clientRating = fromBody(/(\d\.\d{1,2})\s+of\s+\d+\s+review/i)
                  || get(['.air3-rating-value-text', '[data-test="client-rating"]']);

  var bLow = bodyText.toLowerCase();
  var paymentVerified = (
    bLow.indexOf('payment verified') !== -1 ||
    bLow.indexOf('payment method verified') !== -1
  ) ? 'Yes' : 'No';

  var clientSpent = fromBody(/\$([\d,]+[KMB]?)\s+total\s+spent/i);
  if (clientSpent && !clientSpent.startsWith('$')) clientSpent = '$' + clientSpent;

  var hireRate = fromBody(/(\d+)%\s+hire\s+rate/i);
  if (hireRate && !hireRate.endsWith('%')) hireRate += '%';

  var jobsPosted = fromBody(/(\d+)\s+jobs?\s+posted/i);

  // Avg hourly rate — "$32.13 /hr avg" in About the client
  var avgHourlyRate = fromBody(/\$([\d.]+)\s*\/hr\s*avg/i);
  if (avgHourlyRate && !avgHourlyRate.startsWith('$')) avgHourlyRate = '$' + avgHourlyRate + '/hr avg';

  // Member since — "Member since Dec 2020"
  var memberSince = fromBody(/Member since\s+([^\n]+)/i);

  // ── PROPOSAL TEXT (proposal page only) ──────────────────

  var submittedProposal = '';
  var boostConnects = '';
  var connectsUsed = '';

  if (isProposalPage) {
    // Capture cover letter text — stop before Profile highlights / portfolio / UI chrome
    var proposalMatch = bodyText.match(/Cover letter\n\n([\s\S]+?)(?=\nProfile highlights|\nEdit proposal|\nWithdraw proposal|\nYour proposed terms|\nHourly rate\n|\nFixed.price budget\n)/i);
    if (proposalMatch) {
      submittedProposal = proposalMatch[1].trim();
    } else {
      submittedProposal = fromBody(/Cover letter\n\n([\s\S]+?)(?=\nProfile highlights|\nEdit proposal)/i);
    }

    // Boost connects — user confirmed "Your bid is set to X Connects" = boost
    boostConnects = fromBody(/Your bid is set to (\d+) Connects?/i);

    // Base connects to apply
    connectsUsed = fromBody(/(\d+)\s+Connects?\s+to\s+apply/i)
               || fromBody(/Connects?\s+to\s+Submit[:\s]+(\d+)/i);
  }

  var tcSum = (parseInt(connectsUsed) || 0) + (parseInt(boostConnects) || 0);
  var totalConnectsAuto = tcSum > 0 ? String(tcSum) : '';

  // Hook = first paragraph of proposal
  var hookAuto = '';
  if (submittedProposal) {
    var paras = submittedProposal.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (paras.length) hookAuto = paras[0];
  }

  // ── STYLES ──────────────────────────────────────────────

  var style = document.createElement('style');
  style.id = 'upt-style';
  style.textContent = [
    '#upt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483647;display:flex;align-items:flex-start;justify-content:flex-end;font-family:Arial,sans-serif;font-size:13px;line-height:1.4}',
    '#upt-modal{background:#fff;width:440px;height:100vh;overflow-y:auto;padding:14px;box-shadow:-4px 0 24px rgba(0,0,0,.3);box-sizing:border-box}',
    '#upt-modal *{box-sizing:border-box}',
    '#upt-modal h2{font-size:14px;margin:0 0 10px;color:#14a800;font-weight:700;display:flex;justify-content:space-between;align-items:center}',
    '#upt-close{background:none;border:none;font-size:18px;cursor:pointer;color:#999;line-height:1;padding:0}',
    '#upt-close:hover{color:#333}',
    '.upt-sec{font-size:10px;font-weight:700;text-transform:uppercase;color:#999;margin:10px 0 5px;border-top:1px solid #eee;padding-top:7px}',
    '.upt-f{margin-bottom:7px}',
    '.upt-f label{display:block;font-weight:700;margin-bottom:2px;color:#444;font-size:11px}',
    '#upt-modal input,#upt-modal select,#upt-modal textarea{width:100%;padding:5px 7px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:Arial,sans-serif;background:#fff;color:#000}',
    '#upt-modal textarea{resize:vertical;min-height:55px}',
    '.upt-lg{min-height:130px!important}',
    '.upt-row{display:flex;gap:6px}',
    '.upt-row .upt-f{flex:1;min-width:0}',
    '.upt-btns{display:flex;gap:8px;margin-top:10px}',
    '#upt-log{flex:1;padding:9px;background:#14a800;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer}',
    '#upt-log:hover{background:#0f8800}',
    '#upt-log:disabled{background:#aaa;cursor:default}',
    '#upt-cancel{padding:9px 14px;background:#eee;color:#333;border:none;border-radius:4px;font-size:13px;cursor:pointer}',
    '#upt-cancel:hover{background:#ddd}',
    '#upt-status{text-align:center;margin-top:8px;font-weight:700;font-size:12px;min-height:16px}',
    '.upt-tip{background:#fffbe6;border-left:3px solid #e6b800;padding:5px 7px;margin-bottom:8px;font-size:11px;color:#665500;border-radius:2px}'
  ].join('');
  document.head.appendChild(style);

  // ── HTML HELPERS ────────────────────────────────────────

  function esc(v) {
    return (v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function inp(label, id, val, type) {
    return '<div class="upt-f"><label>' + label + '</label>' +
      '<input type="' + (type||'text') + '" id="upt-' + id + '" value="' + esc(val) + '"></div>';
  }

  function ta(label, id, val, cls) {
    return '<div class="upt-f"><label>' + label + '</label>' +
      '<textarea id="upt-' + id + '" class="' + (cls||'') + '">' + esc(val) + '</textarea></div>';
  }

  function sel(label, id, options, selected) {
    var opts = options.map(function (o) {
      return '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    return '<div class="upt-f"><label>' + label + '</label><select id="upt-' + id + '">' + opts + '</select></div>';
  }

  var tip = isProposalPage ? '' :
    '<div class="upt-tip">Best results: click this icon <b>after submitting your proposal</b> — that page has your cover letter, Q&A answers, boost bid, and all job details together.</div>';

  // ── BUILD PANEL ─────────────────────────────────────────

  var html =
    '<h2>📋 Log Upwork Proposal <button id="upt-close">✕</button></h2>' +
    tip +

    '<div class="upt-sec">Job Info</div>' +
    '<div class="upt-row">' +
      '<div class="upt-f"><label>Date (from post)</label><input type="date" id="upt-date" value="' + dateValue + '"></div>' +
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

    '<div class="upt-sec">Client Info</div>' +
    '<div class="upt-row">' +
      inp('Client Name', 'clientName', clientName) +
      inp('Company', 'company', company) +
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
    ta('Hook (first paragraph — resize to read more)', 'hook', hookAuto) +
    ta('Full Proposal (incl. Q&A answers)', 'proposal', submittedProposal, 'upt-lg') +
    '<div class="upt-row">' +
      inp('Connects Used', 'connectsUsed', connectsUsed, 'number') +
      inp('Boost Connects', 'boostConnects', boostConnects, 'number') +
      inp('Total Connects', 'totalConnects', totalConnectsAuto, 'number') +
    '</div>' +

    '<div class="upt-sec">Outcome</div>' +
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
    '<div id="upt-status"></div>';

  var overlay = document.createElement('div');
  overlay.id = 'upt-overlay';
  var modal = document.createElement('div');
  modal.id = 'upt-modal';
  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ── EVENTS ──────────────────────────────────────────────

  function v(id) {
    var el = document.getElementById('upt-' + id);
    return el ? (el.value || '').trim() : '';
  }

  function calcTotal() {
    var u = parseInt(v('connectsUsed')) || 0;
    var b = parseInt(v('boostConnects')) || 0;
    var el = document.getElementById('upt-totalConnects');
    if (el) el.value = (u + b) || '';
  }
  ['connectsUsed','boostConnects'].forEach(function (id) {
    var el = document.getElementById('upt-' + id);
    if (el) el.addEventListener('input', calcTotal);
  });

  function close() {
    overlay.remove();
    var s = document.getElementById('upt-style');
    if (s) s.remove();
  }

  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.getElementById('upt-close').addEventListener('click', close);
  document.getElementById('upt-cancel').addEventListener('click', close);

  document.getElementById('upt-log').addEventListener('click', function () {
    var btn = document.getElementById('upt-log');
    var status = document.getElementById('upt-status');

    if (!WEB_APP_URL || WEB_APP_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
      status.style.color = '#c0392b';
      status.textContent = 'Open content.js and paste your Web App URL first.';
      return;
    }

    var payload = {
      date: v('date'), jobTitle: v('jobTitle'), category: v('category'),
      jobType: v('jobType'), budget: v('budget'), hoursPerWeek: v('hoursPerWeek'),
      experienceLevel: v('expLevel'), duration: v('duration'), skills: v('skills'),
      invite: v('invite'), clientLocation: v('clientLocation'),
      paymentVerified: v('paymentVerified'), clientRating: v('clientRating'),
      hireRate: v('hireRate'), clientSpent: v('clientSpent'),
      jobsPosted: v('jobsPosted'), avgHourlyRate: v('avgHourlyRate'),
      memberSince: v('memberSince'), hook: v('hook'), proposal: v('proposal'),
      connectsUsed: v('connectsUsed'), boostConnects: v('boostConnects'),
      totalConnects: v('totalConnects'), viewed: v('viewed'),
      replied: v('replied'), closed: v('closed'),
      reasonIfNot: v('reasonIfNot'), sourceUrl: window.location.href,
      clientName: v('clientName'), company: v('company')
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
      setTimeout(close, 1800);
    }).catch(function (err) {
      status.style.color = '#c0392b';
      status.textContent = 'Send failed — check F12 console.';
      console.error('[Upwork Tracker]', err);
      btn.disabled = false;
      btn.textContent = 'Log to Sheet';
    });
  });

})();
