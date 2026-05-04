// ============================================================
// Upwork Competitor Profiler — Chrome Extension Content Script
// SAFETY: Reads only what is already visible on your screen.
// Makes zero requests to Upwork. Cannot get you banned.
// ============================================================

var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzXsNk-M2oJgOv7C0k7aQpIkoR0YkCvQMYDnlUPNHDg0nhlJsU7FgnWBgq23l8taFaQ_w/exec';

(function () {

  // Toggle: click again to close
  if (document.getElementById('upc-overlay')) {
    document.getElementById('upc-overlay').remove();
    var s = document.getElementById('upc-style');
    if (s) s.remove();
    return;
  }

  // ── VALIDATE PAGE ─────────────────────────────────────────
  var url = window.location.href;
  if (url.indexOf('/freelancers/') === -1 && url.indexOf('/agencies/') === -1) {
    alert('This extension only works on Upwork freelancer profile pages.\n\nNavigate to a profile (upwork.com/freelancers/~...) and try again.');
    return;
  }

  // ── HELPERS ───────────────────────────────────────────────

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
      if (els.length > 0) {
        var vals = Array.from(els).map(function (e) {
          return (e.innerText || e.textContent || '').trim();
        }).filter(Boolean);
        if (vals.length) return vals.join(', ');
      }
    }
    return '';
  }

  function bodyHas(str) {
    return document.body.innerText.toLowerCase().indexOf(str.toLowerCase()) !== -1;
  }

  // ── EXTRACT PROFILE DATA ──────────────────────────────────

  // Name
  var name = get([
    '[data-test="freelancer-title"] h2',
    '[data-test="freelancer-title"]',
    '.identity-name h2',
    '.identity-name',
    'h1.mb-0',
    'h2.mb-0',
    '[class*="ProfileHeader"] h2',
    '[class*="profileHeader"] h2'
  ]);
  if (!name) {
    var h2s = document.querySelectorAll('h2');
    for (var i = 0; i < h2s.length; i++) {
      var t = (h2s[i].innerText || '').trim();
      if (t && t.length > 2 && t.length < 60 && t.indexOf('\n') === -1) {
        name = t; break;
      }
    }
  }

  // Headline
  var headline = get([
    '[data-test="freelancer-overview-title"]',
    '[data-test="freelancer-title-info"] p',
    '.title',
    '[class*="title"][class*="Profile"]',
    '[class*="ProfileTitle"]',
    '[class*="profileTitle"]',
    'h2 + p',
    'h2 ~ p'
  ]);
  if (headline === name) headline = '';

  // Hourly rate
  var hourlyRate = get(['[data-test="rate"]', '[data-test="hourly-rate"]', '.rate strong', '[class*="rate"]']);
  if (!hourlyRate) {
    var rm = document.body.innerText.match(/\$[\d,]+(?:\.\d+)?\/hr/i);
    if (rm) hourlyRate = rm[0];
  }

  // Job Success Score
  var jobSuccessScore = get(['[data-test="job-success-score"]', '[data-test="jss-score"]', '[class*="JobSuccess"]', '[class*="jobSuccess"]']);
  if (!jobSuccessScore) {
    var jssm = document.body.innerText.match(/(\d+)%\s*[Jj]ob\s*[Ss]uccess/);
    if (jssm) jobSuccessScore = jssm[1] + '% Job Success';
  }

  // Top Rated
  var topRated = 'No';
  if (bodyHas('Top Rated Plus')) topRated = 'Top Rated Plus';
  else if (bodyHas('Top Rated')) topRated = 'Top Rated';

  // Total Earnings
  var totalEarnings = get(['[data-test="total-earnings"]', '[data-test="earnings-badge"]', '[class*="earnings"]']);
  if (!totalEarnings) {
    var em = document.body.innerText.match(/\$([\d.]+[KkMm+]+)\+?\s*(?:earned|total earned)?/i);
    if (em) totalEarnings = em[0];
    if (!totalEarnings) {
      em = document.body.innerText.match(/\$1M\+/i);
      if (em) totalEarnings = em[0];
    }
  }

  // Total Jobs
  var totalJobs = '';
  var tjm = document.body.innerText.match(/(\d+)\s*[Tt]otal\s*[Jj]obs?/);
  if (tjm) totalJobs = tjm[1] + ' total jobs';

  // Description / bio (first 600 chars)
  var description = get([
    '[data-test="freelancer-overview-bio"]',
    '[data-test="description"]',
    '.air3-truncation',
    '[class*="Overview"] p',
    '[class*="overview"] p',
    '[class*="About"] p',
    '[class*="about"] p'
  ]);
  if (description && description.length > 600) description = description.substring(0, 600);

  // ── WORK HISTORY — top 3 jobs ─────────────────────────────
  function extractWorkJobs() {
    var results = [];
    var cardSelectors = [
      '[data-test="work-history-item"]',
      '[class*="work-history"] li',
      '[class*="WorkHistory"] li',
      '[class*="workHistory"] li',
      '[class*="job-tile"]',
      '[class*="JobTile"]'
    ];
    var cards = [];
    for (var s = 0; s < cardSelectors.length; s++) {
      var found = document.querySelectorAll(cardSelectors[s]);
      if (found.length > 0) { cards = Array.from(found); break; }
    }
    for (var c = 0; c < Math.min(cards.length, 3); c++) {
      var card = cards[c];
      var cardText = (card.innerText || '').trim();
      var titleEl = card.querySelector('a, h4, h5, h3, strong');
      var title = titleEl ? (titleEl.innerText || '').trim() : '';
      if (!title && cardText) title = cardText.split('\n')[0].trim();
      var earnedMatch = cardText.match(/\$([\d,]+(?:\.\d+)?)/);
      var earned = earnedMatch ? '$' + earnedMatch[1] : '';
      var type = '';
      if (cardText.toLowerCase().indexOf('weekly retainer') !== -1) type = 'Weekly retainer';
      else if (cardText.toLowerCase().indexOf('fixed') !== -1) type = 'Fixed price';
      else if (cardText.toLowerCase().indexOf('hourly') !== -1) type = 'Hourly';
      var reviewEl = card.querySelector('blockquote, em, i, [class*="feedback"], [class*="review"]');
      var review = reviewEl ? (reviewEl.innerText || '').trim().substring(0, 120) : '';
      results.push({ title: title, earned: earned, type: type, review: review });
    }
    return results;
  }
  var jobs = extractWorkJobs();
  var job1 = jobs[0] || {};
  var job2 = jobs[1] || {};
  var job3 = jobs[2] || {};

  // ── PORTFOLIO ─────────────────────────────────────────────
  var portfolioItems = '';
  var portSelectors = [
    '[class*="portfolio-item"] h3', '[class*="portfolioItem"] h3',
    '[class*="portfolio"] h3', '[class*="Portfolio"] h3',
    '[data-test="portfolio-item-title"]',
    '[class*="portfolio"] .title', '[class*="portfolio"] h4'
  ];
  for (var ps = 0; ps < portSelectors.length; ps++) {
    var portEls = document.querySelectorAll(portSelectors[ps]);
    if (portEls.length > 0) {
      var portTitles = Array.from(portEls).slice(0, 6).map(function(e) {
        return (e.innerText || '').trim();
      }).filter(Boolean);
      if (portTitles.length) { portfolioItems = portTitles.join(', '); break; }
    }
  }

  // ── SKILLS ────────────────────────────────────────────────
  var skills = getAll([
    '[data-test="skills-list"] a', '[data-test="TokenTag"]',
    '.air3-badge-taglist a', '[class*="skill-badge"] a',
    '[class*="SkillBadge"]', '[class*="skills"] a', '[class*="Skills"] a'
  ]);

  // ── TESTIMONIALS ──────────────────────────────────────────
  function extractTestimonials() {
    var results = [];
    var selectors = ['blockquote', '[class*="testimonial"]', '[class*="Testimonial"]', '[data-test="testimonial"]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length > 0) {
        Array.from(els).slice(0, 2).forEach(function(el) {
          var t = (el.innerText || '').trim().substring(0, 200);
          if (t.length > 20) results.push(t);
        });
        if (results.length > 0) break;
      }
    }
    return results;
  }
  var testimonials = extractTestimonials();

  // ── CERTIFICATIONS ────────────────────────────────────────
  function extractCertifications() {
    var results = [];
    var selectors = ['[class*="certification"]', '[class*="Certification"]', '[data-test*="cert"]', '[class*="certificate"]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length > 0) {
        Array.from(els).forEach(function(el) {
          var lines = (el.innerText || '').trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
          if (lines[0]) results.push([lines[0], lines[1] || '', lines[2] || ''].filter(Boolean).join(' | '));
        });
        if (results.length > 0) break;
      }
    }
    return results.join(', ');
  }

  // ── EMPLOYMENT ────────────────────────────────────────────
  function extractEmployment() {
    var results = [];
    var selectors = ['[class*="employment-item"]', '[class*="employmentItem"]', '[class*="employment"] li', '[class*="Employment"] li', '[data-test*="employment"]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length > 0) {
        Array.from(els).forEach(function(el) {
          var lines = (el.innerText || '').trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
          if (lines.length >= 2) results.push(lines[0] + ' | ' + lines[1]);
          else if (lines[0]) results.push(lines[0]);
        });
        if (results.length > 0) break;
      }
    }
    return results.join(', ');
  }

  // ── OTHER EXPERIENCES ─────────────────────────────────────
  function extractOtherExperiences() {
    var results = [];
    var selectors = ['[class*="other-experience"]', '[class*="otherExperience"]', '[class*="OtherExperience"]', '[data-test*="other-experience"]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      if (els.length > 0) {
        Array.from(els).forEach(function(el) {
          var lines = (el.innerText || '').trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
          if (lines[0]) {
            var body = lines.slice(1).join(' ').substring(0, 100);
            results.push(body ? lines[0] + ' — ' + body : lines[0]);
          }
        });
        if (results.length > 0) break;
      }
    }
    return results.join(' | ');
  }

  var capturedDate = new Date().toISOString().split('T')[0];
  var skillCount = skills ? skills.split(',').length : 0;
  var jobCount = [job1.title, job2.title, job3.title].filter(Boolean).length;
  var certifications = extractCertifications();
  var certCount = certifications ? certifications.split(',').length : 0;

  var payload = {
    capturedDate:      capturedDate,
    profileUrl:        url,
    name:              name,
    headline:          headline,
    hourlyRate:        hourlyRate,
    jobSuccessScore:   jobSuccessScore,
    topRated:          topRated,
    totalEarnings:     totalEarnings,
    totalJobs:         totalJobs,
    description:       description,
    job1_title:        job1.title || '',
    job1_earned:       job1.earned || '',
    job1_type:         job1.type || '',
    job1_review:       job1.review || '',
    job2_title:        job2.title || '',
    job2_earned:       job2.earned || '',
    job2_type:         job2.type || '',
    job2_review:       job2.review || '',
    job3_title:        job3.title || '',
    job3_earned:       job3.earned || '',
    job3_type:         job3.type || '',
    job3_review:       job3.review || '',
    portfolioItems:    portfolioItems,
    skills:            skills,
    testimonial1:      testimonials[0] || '',
    testimonial2:      testimonials[1] || '',
    certifications:    certifications,
    employmentHistory: extractEmployment(),
    otherExperiences:  extractOtherExperiences()
  };

  // ── STYLES ────────────────────────────────────────────────

  var style = document.createElement('style');
  style.id = 'upc-style';
  style.textContent = [
    '#upc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483647;display:flex;align-items:flex-start;justify-content:flex-end;font-family:Arial,sans-serif;font-size:13px;line-height:1.5}',
    '#upc-modal{background:#fff;width:320px;height:100vh;overflow-y:auto;padding:16px;box-shadow:-4px 0 24px rgba(0,0,0,.35);box-sizing:border-box}',
    '#upc-modal *{box-sizing:border-box}',
    '#upc-modal h2{font-size:14px;margin:0 0 12px;color:#14a800;font-weight:700;display:flex;justify-content:space-between;align-items:center}',
    '#upc-close{background:none;border:none;font-size:18px;cursor:pointer;color:#999;line-height:1;padding:0}',
    '#upc-close:hover{color:#333}',
    '#upc-headline{font-size:12px;color:#555;margin:-8px 0 12px;font-style:italic;line-height:1.4}',
    '.upc-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px}',
    '.upc-row .lbl{color:#888;font-weight:600}',
    '.upc-row .val{color:#222;text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.upc-row .val.good{color:#14a800}',
    '.upc-row .val.miss{color:#bbb;font-style:italic}',
    '.upc-btns{display:flex;gap:8px;margin-top:14px}',
    '#upc-save{flex:1;padding:9px;background:#14a800;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer}',
    '#upc-save:hover{background:#0f8800}',
    '#upc-save:disabled{background:#aaa;cursor:default}',
    '#upc-cancel{padding:9px 14px;background:#eee;color:#333;border:none;border-radius:4px;font-size:13px;cursor:pointer}',
    '#upc-cancel:hover{background:#ddd}',
    '#upc-status{text-align:center;margin-top:8px;font-weight:700;font-size:12px;min-height:16px}'
  ].join('');
  document.head.appendChild(style);

  // ── BUILD PANEL ───────────────────────────────────────────

  function row(label, val) {
    var cls = val ? 'good' : 'miss';
    var display = val || '—';
    if (display.length > 28) display = display.substring(0, 28) + '…';
    return '<div class="upc-row"><span class="lbl">' + label + '</span><span class="val ' + cls + '">' + display + '</span></div>';
  }

  var html =
    '<h2>🕵️ Competitor Profile <button id="upc-close">✕</button></h2>' +
    '<div id="upc-headline">' + (headline || name || 'Profile captured') + '</div>' +
    row('Name', name) +
    row('Rate', hourlyRate) +
    row('Job Success', jobSuccessScore) +
    row('Status', topRated !== 'No' ? topRated : '') +
    row('Earnings', totalEarnings) +
    row('Total Jobs', totalJobs) +
    row('Skills', skillCount > 0 ? skillCount + ' skills captured' : '') +
    row('Work History', jobCount > 0 ? jobCount + ' jobs captured' : '') +
    row('Certs', certCount > 0 ? certCount + ' certs' : '') +
    row('Portfolio', portfolioItems ? portfolioItems.split(',').length + ' items' : '') +
    '<div class="upc-btns">' +
      '<button id="upc-save">Save to Sheet</button>' +
      '<button id="upc-cancel">Cancel</button>' +
    '</div>' +
    '<div id="upc-status"></div>';

  var overlay = document.createElement('div');
  overlay.id = 'upc-overlay';
  var modal = document.createElement('div');
  modal.id = 'upc-modal';
  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ── EVENTS ────────────────────────────────────────────────

  function close() {
    overlay.remove();
    var s = document.getElementById('upc-style');
    if (s) s.remove();
  }

  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.getElementById('upc-close').addEventListener('click', close);
  document.getElementById('upc-cancel').addEventListener('click', close);

  document.getElementById('upc-save').addEventListener('click', function () {
    var btn = document.getElementById('upc-save');
    var status = document.getElementById('upc-status');

    btn.disabled = true;
    btn.textContent = 'Saving...';
    status.style.color = '#666';
    status.textContent = '';

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function () {
      status.style.color = '#14a800';
      status.textContent = '✓ Saved to Competitors sheet!';
      setTimeout(close, 1800);
    }).catch(function (err) {
      status.style.color = '#c0392b';
      status.textContent = 'Send failed — check F12 console.';
      console.error('[Competitor Profiler]', err);
      btn.disabled = false;
      btn.textContent = 'Save to Sheet';
    });
  });

})();
