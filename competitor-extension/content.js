// ============================================================
// Upwork Competitor Profiler — Chrome Extension Content Script
// ============================================================

var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzXsNk-M2oJgOv7C0k7aQpIkoR0YkCvQMYDnlUPNHDg0nhlJsU7FgnWBgq23l8taFaQ_w/exec';

(function () {

  if (document.getElementById('upc-overlay')) {
    document.getElementById('upc-overlay').remove();
    var s = document.getElementById('upc-style');
    if (s) s.remove();
    return;
  }

  var url = window.location.href;
  if (url.indexOf('/freelancers/') === -1 && url.indexOf('/agencies/') === -1) {
    alert('This extension only works on Upwork freelancer profile pages.\n\nNavigate to a profile (upwork.com/freelancers/~...) and try again.');
    return;
  }

  var bodyText = document.body.innerText || '';

  // ── HELPERS ───────────────────────────────────────────────

  function fromBody(regex) {
    var m = bodyText.match(regex);
    return m ? (m[1] || m[0]).trim() : '';
  }

  function sectionText(headingText, endHeadings) {
    // Find text block under a specific heading, ending at any of endHeadings
    var startMarker = '\n' + headingText + '\n';
    var idx = bodyText.indexOf(startMarker);
    if (idx === -1) return '';
    var after = bodyText.substring(idx + startMarker.length);
    var ends = endHeadings || ['Portfolio', 'Skills', 'Testimonials', 'Certifications', 'Employment history', 'Other experiences', 'Work history'];
    var endIdx = after.length;
    for (var i = 0; i < ends.length; i++) {
      var ei = after.indexOf('\n' + ends[i] + '\n');
      if (ei !== -1 && ei < endIdx) endIdx = ei;
    }
    return after.substring(0, endIdx).trim();
  }

  // ── NAME ──────────────────────────────────────────────────
  var name = '';
  var h2s = document.querySelectorAll('h2');
  for (var i = 0; i < h2s.length; i++) {
    var t = (h2s[i].innerText || '').trim();
    if (t && t.length > 2 && t.length < 80) { name = t; break; }
  }

  // ── H3 SCAN: headline + rate ───────────────────────────────
  // From DOM inspection: rate = h3 matching "$X/hr", headline = first meaningful h3 before the rate
  var SKIP_H3 = ['Portfolio', 'Testimonials', 'Certifications', 'Employment history',
                 'Other experiences', 'Book a consultation', 'Contract-to-hire', 'Work history',
                 'Skills', 'Skills and Expertise'];
  var allH3s = Array.from(document.querySelectorAll('h3'));
  var headline = '';
  var hourlyRate = '';

  for (var hi = 0; hi < allH3s.length; hi++) {
    var ht = allH3s[hi].innerText.trim();
    if (!ht) continue;
    if (/^\$[\d,]+\.?\d*\/hr/.test(ht)) {
      if (!hourlyRate) hourlyRate = ht;
      continue;
    }
    if (SKIP_H3.indexOf(ht) !== -1) continue;
    if (ht === name) continue;
    if (ht.length < 8) continue;
    // Headline is the first meaningful h3 that's not a rate or section label
    if (!headline && !hourlyRate) {
      // Only accept before we've seen the rate (headline comes before rate in DOM)
      headline = ht;
    }
  }
  // Fallback if headline wasn't set before rate
  if (!headline) {
    for (var hi2 = 0; hi2 < allH3s.length; hi2++) {
      var ht2 = allH3s[hi2].innerText.trim();
      if (!ht2 || /^\$[\d,]+\.?\d*\/hr/.test(ht2)) continue;
      if (SKIP_H3.indexOf(ht2) !== -1) continue;
      if (ht2 === name || ht2.length < 8) continue;
      headline = ht2;
      break;
    }
  }

  // ── JOB SUCCESS SCORE ─────────────────────────────────────
  var jobSuccessScore = fromBody(/(\d+)%\s*[Jj]ob\s*[Ss]uccess/);
  if (jobSuccessScore) jobSuccessScore += '% Job Success';

  // ── TOP RATED ─────────────────────────────────────────────
  var topRated = 'No';
  if (bodyText.indexOf('Top Rated Plus') !== -1) topRated = 'Top Rated Plus';
  else if (bodyText.indexOf('Top Rated') !== -1) topRated = 'Top Rated';

  // ── TOTAL EARNINGS ────────────────────────────────────────
  var totalEarnings = fromBody(/(\$\d+(?:\.\d+)?[KkMm+]+)/);

  // ── TOTAL JOBS ────────────────────────────────────────────
  var totalJobs = fromBody(/(\d+)\n[Tt]otal jobs/);
  if (!totalJobs) totalJobs = fromBody(/(\d+)\s*[Tt]otal\s*[Jj]obs?/);
  if (totalJobs) totalJobs += ' total jobs';

  // ── TOTAL HOURS ───────────────────────────────────────────
  var totalHours = fromBody(/([\d,]+)\n[Tt]otal hours/);
  if (!totalHours) totalHours = fromBody(/([\d,]+)\s*[Tt]otal\s*[Hh]ours?/);
  if (!totalHours) {
    // Also catch standalone "X,XXX hours" near stats (e.g. in agency block)
    var thm = bodyText.match(/([\d,]{2,})\s+hours\b/i);
    if (thm) totalHours = thm[1];
  }
  if (totalHours) totalHours = totalHours.replace(/,/g, '') + ' hours';

  // ── LOCATION ─────────────────────────────────────────────
  // Upwork shows: "Houston, TX, USA – 5:03 am local time"
  // Anchor on "local time" to avoid grabbing unrelated lines
  var location = '';
  var locMatch = bodyText.match(/(.+?)\s*[–—-]\s*\d+:\d+\s*(?:am|pm)\s*local time/i);
  if (locMatch) {
    // Take only the last line of the match (avoids "Verified\nHouston, TX, USA")
    var locLines = locMatch[1].split('\n');
    location = locLines[locLines.length - 1].trim();
  }
  if (!location) {
    var locEl = document.querySelector('[data-test="location"], [class*="location"], [class*="Location"]');
    if (locEl) location = (locEl.innerText || '').trim().split('–')[0].split('—')[0].trim();
  }

  // ── AGENCY ────────────────────────────────────────────────
  var agencyName = 'N/A';
  var assocRaw = sectionText('Associated with', ['Hours per week', 'Avg. response', 'Languages', 'Verifications', 'Work history', 'Portfolio']);
  if (assocRaw) {
    var assocLines = assocRaw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) {
      if (!l || l.length < 2) return false;
      if (l === 'Associated with') return false;
      if (/^\d+%/.test(l)) return false;            // "97% Job Success"
      if (/Top Rated/i.test(l)) return false;       // badge
      if (/^\d[\d,]*\s*hours?\s*$/i.test(l)) return false; // "412 hours"
      return true;
    });
    if (assocLines.length > 0) agencyName = assocLines[0];
  }

  // ── CONSULTATION RATE ────────────────────────────────────
  // Upwork structure: "Book a consultation\n[Title]\n$X.XX for Y minutes"
  // We want the price line, not the title line
  var consultationRate = '';
  var consultIdx = bodyText.indexOf('Book a consultation');
  if (consultIdx !== -1) {
    var consultBlock = bodyText.substring(consultIdx, consultIdx + 300);
    // Find a dollar amount in the block: "$50.00 for 30 minutes" or "$X/session"
    var priceMatch = consultBlock.match(/\$([\d,.]+)/);
    if (priceMatch) consultationRate = priceMatch[0].trim();
  }
  if (!consultationRate) {
    var cm = bodyText.match(/\$([\d,.]+)\s+for\s+\d+\s*min/i);
    if (cm) consultationRate = '$' + cm[1].trim();
  }

  // ── DESCRIPTION / BIO ─────────────────────────────────────
  // Bio is the text block immediately after the rate h3 in body text
  var description = '';
  if (hourlyRate) {
    var rateIdx = bodyText.indexOf(hourlyRate);
    if (rateIdx !== -1) {
      var afterRate = bodyText.substring(rateIdx + hourlyRate.length).replace(/^\s+/, '');
      // End exactly at a known section heading on its own line
      var bioEnd = afterRate.search(/\nPortfolio\n|\nWork history\n|\nCompleted jobs\n|\nTestimonials\n|\nCertifications\n|\nEmployment history\n|\nOther experiences\n/i);
      description = bioEnd !== -1 ? afterRate.substring(0, bioEnd).trim() : afterRate.substring(0, 8000).trim();
      // Strip consultation block from end of bio
      description = description.replace(/\s*Book a consultation[\s\S]*$/i, '').trim();
      if (description.length > 8000) description = description.substring(0, 8000);
    }
  }

  // ── WORK HISTORY — body text parsing ──────────────────────
  // Structure per job:
  //   [Title]
  //   Rating is 5.0 out of 5.   ← anchor for jobs with ratings
  //   5.0
  //   [Date range]
  //   "[Review]... See more"     ← optional
  //   [Badge labels...]          ← optional, skip
  //   $X,XXX.XX /week            ← skip (weekly rate, not total)
  //   Weekly retainer            ← type
  //   $XX,XXX.XX                 ← total earned
  // OR for fixed:
  //   $X,XXX.XX
  //   Fixed price
  function extractWorkJobs() {
    var results = [];
    var startIdx = bodyText.indexOf('Completed jobs');
    if (startIdx === -1) startIdx = bodyText.indexOf('Work history');
    if (startIdx === -1) return results;

    var after = bodyText.substring(startIdx);
    var endOffset = after.search(/\nPortfolio\n|\nSkills\n|\nTestimonials\n/i);
    var workText = endOffset !== -1 ? after.substring(0, endOffset) : after.substring(0, 10000);
    var lines = workText.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

    var current = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // ANCHOR: "Rating is X out of 5." → previous meaningful line = title
      // Also catch date-only jobs: line matching date range → previous line = title
      var isRatingAnchor = /^Rating is \d/.test(line);
      var isDateAnchor   = /^\w+ \d+,\s*\d{4}\s*[-–]\s*\w+ \d+,\s*\d{4}/.test(line);

      if (isRatingAnchor || isDateAnchor) {
        // Walk back to find the job title (the last clean non-header line)
        var title = '';
        for (var j = i - 1; j >= 0; j--) {
          var c = lines[j];
          if (!c || c.length < 2) continue;
          if (/^Completed jobs|^In progress|^Rating is|^\$[\d,]|^No feedback|^Work history|^Insights from/.test(c)) continue;
          if (/^\w+ \d+,\s*\d{4}/.test(c)) continue; // another date line
          if (/^\d+\.?\d*$/.test(c)) continue; // pure number like "5.0", "3.0" (rating value)
          title = c;
          break;
        }

        // Only create new job if title is different from last job
        var lastTitle = current ? current.title : '';
        if (title && title !== lastTitle) {
          if (results.length >= 3) break;
          current = { title: title, earned: '', type: '', review: '' };
          results.push(current);
        }
        continue;
      }

      if (!current) continue;

      // Job type
      if (line === 'Weekly retainer' || line === 'Fixed price' || line === 'Hourly') {
        current.type = line;
      }

      // Dollar amounts — capture total earned
      // Skip lines with /week or /hr (those are rates, not totals)
      if (/^\$[\d,]+(?:\.\d{2})?$/.test(line)) {
        // Standalone dollar amount — this is the total
        current.earned = line;
      }

      // Review: quoted line starting with " or "
      if (!current.review && line.length > 20 && (line[0] === '"' || line.charCodeAt(0) === 0x201C)) {
        current.review = line
          .replace(/^["\u201c\u2018]/, '')
          .replace(/["\u201d\u2019]\s*$/, '')
          .replace(/\s*See more\s*$/, '')
          .substring(0, 120);
      }
    }

    return results;
  }

  var jobs = extractWorkJobs();
  var job1 = jobs[0] || {};
  var job2 = jobs[1] || {};
  var job3 = jobs[2] || {};

  // ── PORTFOLIO ─────────────────────────────────────────────
  // Parse portfolio section from body text
  var portfolioItems = '';
  var portRaw = sectionText('Portfolio', ['Skills', 'Testimonials', 'Work history', 'Certifications']);
  if (portRaw) {
    var portLines = portRaw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) {
      if (l.length < 4 || l.length > 100) return false;
      if (l.toLowerCase() === 'portfolio') return false;
      if (l.indexOf('://') !== -1 || l.indexOf('.com') !== -1 || l.indexOf('.org') !== -1) return false;
      if (/^\d+$/.test(l)) return false; // pure numbers
      return true;
    });
    if (portLines.length) portfolioItems = portLines.slice(0, 6).join(', ');
  }

  // ── SKILLS ────────────────────────────────────────────────
  // Skills section may appear in body text without an h3 heading
  var skills = '';
  var skillsRaw = sectionText('Skills', ['Testimonials', 'Work history', 'Certifications', 'Portfolio']);
  if (!skillsRaw) skillsRaw = sectionText('Skills and Expertise', ['Testimonials', 'Work history', 'Certifications', 'Portfolio']);
  if (skillsRaw) {
    var skillLines = skillsRaw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) {
      return l.length > 1 && l.length < 60 && !/^Skills/.test(l);
    });
    if (skillLines.length > 1) skills = skillLines.join(', ');
  }
  // DOM fallback
  if (!skills) {
    var skillEls = document.querySelectorAll('[data-test="skills-list"] a, [data-test="TokenTag"], .air3-badge-taglist a');
    if (skillEls.length > 1) { // >1 to avoid picking up lone insight badges
      skills = Array.from(skillEls).map(function(e) { return e.innerText.trim(); }).filter(Boolean).join(', ');
    }
  }

  // ── TESTIMONIALS ──────────────────────────────────────────
  var testimonial1 = '';
  var testimonial2 = '';
  var endorIdx = bodyText.indexOf('Endorsements from past clients');
  if (endorIdx !== -1) {
    var endorText = bodyText.substring(endorIdx, endorIdx + 4000);
    // Testimonials are long text blocks (>60 chars), often starting with "I was" / "John" etc.
    var endorLines = endorText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) {
      return l.length > 60 && l !== 'Endorsements from past clients';
    });
    testimonial1 = endorLines[0] ? endorLines[0].substring(0, 200) : '';
    testimonial2 = endorLines[1] ? endorLines[1].substring(0, 200) : '';
  }

  // ── CERTIFICATIONS ────────────────────────────────────────
  var certifications = '';
  var certRaw = sectionText('Certifications', ['Employment history', 'Other experiences', 'Work history']);
  if (certRaw) {
    var certLines = certRaw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
    var certResults = [];
    var ci = 0;
    while (ci < certLines.length) {
      var certName = certLines[ci];
      if (certName === 'Show description' || certName.length < 2 || certName === 'Certifications') { ci++; continue; }
      var provider = '';
      var issued = '';
      if (certLines[ci + 1] && /^Provider:/i.test(certLines[ci + 1])) {
        provider = certLines[ci + 1].replace(/^Provider:\s*/i, '').trim();
        ci++;
      }
      if (certLines[ci + 1] && /^Issued:/i.test(certLines[ci + 1])) {
        issued = certLines[ci + 1].replace(/^Issued:\s*/i, '').trim();
        ci++;
      }
      certResults.push([certName, provider, issued].filter(Boolean).join(' | '));
      ci++;
    }
    certifications = certResults.join(', ');
  }

  // ── EMPLOYMENT HISTORY ────────────────────────────────────
  var employmentHistory = '';
  var empRaw = sectionText('Employment history', ['Other experiences', 'Work history', 'Certifications']);
  if (empRaw) {
    var empLines = empRaw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) {
      return l.length > 1 && l !== 'Employment history' && l !== 'Show more' && l !== 'Show less';
    });
    var empResults = [];
    // Upwork body text: title on one line, company on next line, then date range
    // Group into pairs: skip date-looking lines
    var ei2 = 0;
    while (ei2 < empLines.length && empResults.length < 4) {
      var eline = empLines[ei2];
      // Skip pure date lines or very short lines
      if (/^\w+ \d{4}/.test(eline) || /^\d{4}/.test(eline) || eline.length < 3) { ei2++; continue; }
      // If next line exists and is also not a date, treat as Title | Company
      var nextLine = empLines[ei2 + 1] || '';
      if (nextLine && !/^\w+ \d{4}/.test(nextLine) && !/^\d{4}/.test(nextLine) && nextLine.length > 2) {
        empResults.push(eline + ' | ' + nextLine);
        ei2 += 2; // skip company line too
      } else {
        empResults.push(eline);
        ei2++;
      }
      // Skip any following date line
      if (empLines[ei2] && /^\w+ \d{4}/.test(empLines[ei2])) ei2++;
    }
    employmentHistory = empResults.join(', ');
  }

  // ── OTHER EXPERIENCES ─────────────────────────────────────
  var otherExperiences = '';
  var otherRaw = sectionText('Other experiences', ['Work history', 'Employment history', 'Completed jobs']);
  if (otherRaw) {
    var otherLines = otherRaw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
    var otherResults = [];
    for (var oi = 0; oi < otherLines.length - 1; oi++) {
      var ol = otherLines[oi];
      var onext = otherLines[oi + 1];
      if (ol.length > 3 && ol.length < 80 && onext && onext.length > 20 && onext !== 'more') {
        otherResults.push(ol + ' — ' + onext.substring(0, 100));
        oi++;
      }
      if (otherResults.length >= 3) break;
    }
    otherExperiences = otherResults.join(' | ');
  }

  // ── ASSEMBLE ──────────────────────────────────────────────
  var capturedDate = new Date().toISOString().split('T')[0];
  var skillCount = skills ? skills.split(',').length : 0;
  var jobCount = [job1.title, job2.title, job3.title].filter(Boolean).length;

  var payload = {
    capturedDate:      capturedDate,
    profileUrl:        url,
    name:              name,
    headline:          headline,
    hourlyRate:        hourlyRate,
    jobSuccessScore:   jobSuccessScore,
    topRated:          topRated,
    totalEarnings:     totalEarnings,
    totalHours:        totalHours,
    totalJobs:         totalJobs,
    agencyName:        agencyName,
    location:          location,
    consultationRate:  consultationRate,
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
    testimonial1:      testimonial1,
    testimonial2:      testimonial2,
    certifications:    certifications,
    employmentHistory: employmentHistory,
    otherExperiences:  otherExperiences
  };

  // ── DEBUG: log payload to console ─────────────────────────
  console.log('[Competitor Profiler] Captured:', JSON.stringify(payload, null, 2));

  // ── STYLES ────────────────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'upc-style';
  style.textContent = [
    '#upc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483647;display:flex;align-items:flex-start;justify-content:flex-end;font-family:Arial,sans-serif;font-size:13px;line-height:1.5}',
    '#upc-modal{background:#fff;width:340px;height:100vh;overflow-y:auto;padding:16px;box-shadow:-4px 0 24px rgba(0,0,0,.35);box-sizing:border-box}',
    '#upc-modal *{box-sizing:border-box}',
    '#upc-modal h2{font-size:14px;margin:0 0 12px;color:#14a800;font-weight:700;display:flex;justify-content:space-between;align-items:center}',
    '#upc-close{background:none;border:none;font-size:18px;cursor:pointer;color:#999;line-height:1;padding:0}',
    '#upc-close:hover{color:#333}',
    '#upc-subtitle{font-size:11px;color:#555;margin:-8px 0 12px;font-style:italic;line-height:1.4}',
    '.upc-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px}',
    '.upc-row .lbl{color:#888;font-weight:600;flex-shrink:0;margin-right:8px}',
    '.upc-row .val{color:#222;text-align:right;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
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
    if (display.length > 32) display = display.substring(0, 32) + '…';
    return '<div class="upc-row"><span class="lbl">' + label + '</span><span class="val ' + cls + '">' + display + '</span></div>';
  }

  var html =
    '<h2>🕵️ Competitor Profile <button id="upc-close">✕</button></h2>' +
    '<div id="upc-subtitle">' + (headline || name || 'Profile captured') + '</div>' +
    row('Name', name) +
    row('Rate', hourlyRate) +
    row('Job Success', jobSuccessScore) +
    row('Status', topRated !== 'No' ? topRated : '') +
    row('Earnings', totalEarnings) +
    row('Hours', totalHours) +
    row('Total Jobs', totalJobs) +
    row('Agency', agencyName !== 'N/A' ? agencyName : '') +
    row('Location', location) +
    row('Consult Rate', consultationRate) +
    row('Bio', description ? '✓ captured' : '') +
    row('Job 1', job1.title || '') +
    row('Job 2', job2.title || '') +
    row('Job 3', job3.title || '') +
    row('Skills', skillCount > 0 ? skillCount + ' skills' : '') +
    row('Employment', employmentHistory ? '✓ captured' : '') +
    row('Certs', certifications || '') +
    row('Other exp.', otherExperiences ? '✓ captured' : '') +
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

    // Use text/plain to avoid CORS preflight — Apps Script reads e.postData.contents as normal
    fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function() { return { action: 'created' }; });
    }).then(function (result) {
      status.style.color = '#14a800';
      status.textContent = result.action === 'updated'
        ? '✓ Profile updated — blank cells filled in!'
        : '✓ New profile saved to sheet!';
      setTimeout(close, 2000);
    }).catch(function (err) {
      status.style.color = '#c0392b';
      status.textContent = 'Send failed — check F12 console.';
      console.error('[Competitor Profiler]', err);
      btn.disabled = false;
      btn.textContent = 'Save to Sheet';
    });
  });

})();
