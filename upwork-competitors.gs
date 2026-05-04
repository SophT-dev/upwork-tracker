// ============================================================
// Upwork Competitor Profiler — Google Apps Script
// Paste this entire file into a NEW Google Sheet's
// Extensions → Apps Script → Save
// Then run setupCompetitorHeaders() once from the menu.
// Deploy as Web App: Execute as Me | Anyone can access
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Competitors')
    .addItem('Setup Profiles Sheet', 'setupCompetitorHeaders')
    .addSeparator()
    .addItem('🤖 Analyze Competitors', 'analyzeCompetitors')
    .addItem('🗑️ Clear Analysis', 'clearAnalysis')
    .addToUi();
}

// ── COLUMN HEADERS ───────────────────────────────────────────
// Column order for the "Profiles" sheet.
// Add columns here to expand — doPost() maps by header name automatically.
var COMPETITOR_HEADERS = [
  'Captured Date', 'Profile URL', 'Name', 'Headline',
  'Hourly Rate', 'Job Success Score', 'Top Rated', 'Total Earnings', 'Total Jobs',
  'Description',
  'Job 1 Title', 'Job 1 Earned', 'Job 1 Type', 'Job 1 Review',
  'Job 2 Title', 'Job 2 Earned', 'Job 2 Type', 'Job 2 Review',
  'Job 3 Title', 'Job 3 Earned', 'Job 3 Type', 'Job 3 Review',
  'Portfolio Items', 'Skills',
  'Testimonial 1', 'Testimonial 2',
  'Certifications', 'Employment History', 'Other Experiences',
  'Notes'
];

function setupCompetitorHeaders() {
  var sheet = getOrCreateProfileSheet_();
  var range = sheet.getRange(1, 1, 1, COMPETITOR_HEADERS.length);
  range.setValues([COMPETITOR_HEADERS]);
  range.setFontWeight('bold')
    .setBackground('#14a800')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  // Set reasonable column widths
  var widths = [90, 120, 120, 220, 80, 120, 100, 100, 80, 300,
    180, 80, 100, 220,
    180, 80, 100, 220,
    180, 80, 100, 220,
    200, 260,
    250, 250,
    200, 200, 200,
    160];
  for (var i = 0; i < widths.length && i < COMPETITOR_HEADERS.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  SpreadsheetApp.getUi().alert('Profiles sheet is ready!');
}

// ── WEB APP ──────────────────────────────────────────────────
// Receives competitor profile data from the bookmarklet.
// Maps JSON keys → column positions by reading the current header row.
// JSON key mapping (bookmarklet field → sheet header):
var FIELD_MAP = {
  'capturedDate':      'Captured Date',
  'profileUrl':        'Profile URL',
  'name':              'Name',
  'headline':          'Headline',
  'hourlyRate':        'Hourly Rate',
  'jobSuccessScore':   'Job Success Score',
  'topRated':          'Top Rated',
  'totalEarnings':     'Total Earnings',
  'totalJobs':         'Total Jobs',
  'description':       'Description',
  'job1_title':        'Job 1 Title',
  'job1_earned':       'Job 1 Earned',
  'job1_type':         'Job 1 Type',
  'job1_review':       'Job 1 Review',
  'job2_title':        'Job 2 Title',
  'job2_earned':       'Job 2 Earned',
  'job2_type':         'Job 2 Type',
  'job2_review':       'Job 2 Review',
  'job3_title':        'Job 3 Title',
  'job3_earned':       'Job 3 Earned',
  'job3_type':         'Job 3 Type',
  'job3_review':       'Job 3 Review',
  'portfolioItems':    'Portfolio Items',
  'skills':            'Skills',
  'testimonial1':      'Testimonial 1',
  'testimonial2':      'Testimonial 2',
  'certifications':    'Certifications',
  'employmentHistory': 'Employment History',
  'otherExperiences':  'Other Experiences'
  // 'Notes' has no JSON key — it's a manual column
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateProfileSheet_();

    // Read header row to find column positions
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      // Auto-setup if headers haven't been created yet
      setupCompetitorHeaders();
      lastCol = sheet.getLastColumn();
    }
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Build row array aligned to column positions
    var newRow = new Array(lastCol).fill('');
    for (var jsonKey in FIELD_MAP) {
      var headerName = FIELD_MAP[jsonKey];
      var colIdx = headers.indexOf(headerName);
      if (colIdx === -1) continue;
      var val = data[jsonKey];
      newRow[colIdx] = (val !== undefined && val !== null) ? String(val) : '';
    }

    sheet.appendRow(newRow);

    var lastRow = sheet.getLastRow();
    // Clip wrap on all cells, wrap description and review fields
    sheet.getRange(lastRow, 1, 1, lastCol).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    var wrapCols = ['Description', 'Job 1 Review', 'Job 2 Review', 'Job 3 Review', 'Testimonial 1', 'Testimonial 2', 'Skills', 'Portfolio Items'];
    wrapCols.forEach(function(colName) {
      var ci = headers.indexOf(colName);
      if (ci !== -1) sheet.getRange(lastRow, ci + 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    });
    sheet.setRowHeight(lastRow, 80);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── HELPERS ──────────────────────────────────────────────────

function getOrCreateProfileSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName('Profiles');
  if (!s) s = ss.insertSheet('Profiles');
  return s;
}

function getOrCreateAnalysisSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName('🤖 Analysis');
  if (!s) s = ss.insertSheet('🤖 Analysis', 1);
  return s;
}

function callClaude_(key, prompt, maxTokens) {
  var payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var result = JSON.parse(response.getContentText());
  if (!result.content || !result.content[0]) return null;
  return result.content[0].text;
}

// ── LOAD ALL PROFILES ────────────────────────────────────────

function loadProfiles_() {
  var sheet = getOrCreateProfileSheet_();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { colIdx: {}, rows: [] };

  var all = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = all[0];
  var colIdx = {};
  for (var i = 0; i < headers.length; i++) colIdx[headers[i]] = i;
  var rows = all.slice(1).filter(function(r) { return r[0] !== ''; });
  return { colIdx: colIdx, rows: rows };
}

// ── ANALYSIS ────────────────────────────────────────────────

function analyzeCompetitors() {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) {
    SpreadsheetApp.getUi().alert(
      'Missing API key.\n\nGo to Extensions → Apps Script → Project Settings → Script Properties\nand add: ANTHROPIC_API_KEY = your key'
    );
    return;
  }

  var d = loadProfiles_();
  var rows = d.rows;
  var colIdx = d.colIdx;

  if (rows.length === 0) {
    SpreadsheetApp.getUi().alert('No competitor profiles found.\n\nAdd some profiles first using the bookmarklet, then run this again.');
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Analyzing ' + rows.length + ' profiles...', '🤖 Analysis', 45);

  // Build compact profile summaries for Claude
  var profileLines = rows.map(function(r, i) {
    function col(name) { var ci = colIdx[name]; return ci !== undefined ? String(r[ci] || '').trim() : ''; }
    var lines = [
      'COMPETITOR #' + (i + 1) + ': ' + col('Name'),
      'Headline: ' + col('Headline'),
      'Rate: ' + col('Hourly Rate') + ' | JSS: ' + col('Job Success Score') + ' | Status: ' + col('Top Rated'),
      'Earnings: ' + col('Total Earnings') + ' | Total Jobs: ' + col('Total Jobs'),
      'Bio (first 400 chars): ' + col('Description').substring(0, 400),
      'Top job 1: ' + col('Job 1 Title') + ' — ' + col('Job 1 Earned') + ' (' + col('Job 1 Type') + ')',
      'Top job 2: ' + col('Job 2 Title') + ' — ' + col('Job 2 Earned') + ' (' + col('Job 2 Type') + ')',
      'Top job 3: ' + col('Job 3 Title') + ' — ' + col('Job 3 Earned') + ' (' + col('Job 3 Type') + ')',
      'Skills: ' + col('Skills'),
      'Portfolio: ' + col('Portfolio Items'),
      'Testimonial 1: ' + col('Testimonial 1').substring(0, 150),
      'Certifications: ' + col('Certifications'),
      'Employment: ' + col('Employment History')
    ];
    return lines.join('\n');
  });

  var prompt =
'You are analyzing ' + rows.length + ' competitor profiles from Upwork for a cold email specialist named Taha Anwar.\n\n' +
'COMPETITOR PROFILES:\n\n' +
profileLines.join('\n\n---\n\n') + '\n\n' +
'TAHA\'S CONTEXT (for gap analysis):\n' +
'Taha is a cold email and outbound specialist. He has not provided his current profile text — focus on what patterns emerge from the competitor data and what a strong profile in this space typically includes.\n\n' +
'Respond using EXACTLY these section delimiters (copy-paste verbatim, including the === on both sides):\n\n' +
'===SECTION: OVERVIEW===\n' +
'How many profiles analyzed. Quick one-line summary of the competitive landscape (niched vs generalist, rate range, typical JSS).\n\n' +
'===SECTION: NICHE VS GENERALIST===\n' +
'For each competitor: niched or generalist? What niche if any? What does this tell us about how the top earners position themselves?\n\n' +
'===SECTION: HEADLINE PATTERNS===\n' +
'List the headline templates that appear across these profiles. For each: the pattern, an example from the data, and whether it\'s niched or broad. Which patterns correlate with higher earnings or JSS?\n\n' +
'===SECTION: TOP KEYWORDS===\n' +
'The most-used keywords across all headlines and descriptions. Group by type: (1) technical tools, (2) outcomes/results, (3) industries served, (4) process words. Which keywords appear in the highest-earning profiles?\n\n' +
'===SECTION: PROFILE STRUCTURE PATTERNS===\n' +
'What do the top earners have that lower earners don\'t? Certifications present? Portfolio items? Testimonials? Top Rated badge? Work history length? Any patterns in bio structure (opening line style, format, length)?\n\n' +
'===SECTION: COMPETITOR VERDICTS===\n' +
'For each competitor, one line:\n' +
'• Competitor #N (Name) — [what they do well / what makes their profile strong or weak]\n\n' +
'===SECTION: GAPS FOR TAHA===\n' +
'Based on what the top competitors have in common, what should Taha\'s profile include that a cold email specialist\'s profile typically needs? Be specific — call out the structural elements, keywords, and positioning angles that appear repeatedly in high-earning profiles.\n\n' +
'===SECTION: HEADLINE VARIANTS FOR TAHA===\n' +
'Write 3 headline variants Taha could use, based on the patterns above. Each should be distinct in positioning angle. Format:\n' +
'1. [Headline text] — [why this angle]\n' +
'2. ...\n' +
'3. ...\n\n' +
'===SECTION: BIO OPENING VARIANTS FOR TAHA===\n' +
'Write 3 opening sentences for Taha\'s profile bio, each using a different structure observed in top competitor bios. Format:\n' +
'1. [Opening sentence] — [structure type]\n' +
'2. ...\n' +
'3. ...\n\n' +
'Be specific throughout. Reference actual data from the profiles — not generic advice.';

  var text = callClaude_(key, prompt, 8000);
  if (!text) {
    SpreadsheetApp.getUi().alert('Claude API error. Check your API key and try again.');
    return;
  }

  // Parse sections
  var sections = parseSections_(text);
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  var meta = 'Last run: ' + ts + '  |  Based on ' + rows.length + ' competitor profiles';

  writeAnalysisSheet_(sections, meta);
}

function parseSections_(text) {
  var sections = {};
  var parts = text.split(/===SECTION:\s*/);
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (!part) continue;
    var endOfTitle = part.indexOf('===');
    var title, content;
    if (endOfTitle !== -1) {
      title = part.substring(0, endOfTitle).trim();
      content = part.substring(endOfTitle + 3).trim();
    } else {
      var nl = part.indexOf('\n');
      if (nl === -1) continue;
      title = part.substring(0, nl).trim();
      content = part.substring(nl + 1).trim();
    }
    content = content.replace(/^#{1,4}\s*/gm, '').replace(/\*\*/g, '');
    sections[title.toUpperCase()] = content;
  }
  return sections;
}

function findSection_(sections, name) {
  if (sections[name]) return sections[name];
  var keywords = name.split(/\s+/);
  var keys = Object.keys(sections);
  for (var i = 0; i < keys.length; i++) {
    var allMatch = keywords.every(function(k) { return keys[i].indexOf(k) !== -1; });
    if (allMatch) return sections[keys[i]];
  }
  return null;
}

// ── WRITE ANALYSIS SHEET ─────────────────────────────────────

function writeSection_(sheet, row, title, content, headerBg, headerFont, contentBg, cols) {
  sheet.getRange(row, 1, 1, cols).merge()
    .setValue(title)
    .setBackground(headerBg).setFontColor(headerFont)
    .setFontWeight('bold').setFontSize(12)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  var text = content || '(No data for this section)';
  sheet.getRange(row, 1, 1, cols).merge()
    .setValue(text)
    .setBackground(contentBg)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('top').setFontSize(11);
  var estHeight = Math.max(60, text.split('\n').length * 22);
  sheet.setRowHeight(row, estHeight);
  return row + 1;
}

function writeSpacer_(sheet, row, height) {
  sheet.setRowHeight(row, height || 10);
  return row + 1;
}

function writeAnalysisSheet_(sections, meta) {
  var sheet = getOrCreateAnalysisSheet_();
  sheet.clearContents();
  sheet.clearFormats();

  var COLS = 8;
  var row = 1;
  for (var c = 1; c <= COLS; c++) sheet.setColumnWidth(c, 100);

  // Title
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('🤖 COMPETITOR ANALYSIS')
    .setBackground('#14a800').setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(16)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 42);
  row++;

  // Meta
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue(meta || '')
    .setFontColor('#666666').setFontStyle('italic').setFontSize(10)
    .setBackground('#f5f5f5');
  sheet.setRowHeight(row, 24);
  row++;

  row = writeSpacer_(sheet, row, 8);

  // Overview (green)
  row = writeSection_(sheet, row, 'OVERVIEW',
    findSection_(sections, 'OVERVIEW'),
    '#2e7d32', '#ffffff', '#f1f8e9', COLS);
  row = writeSpacer_(sheet, row, 10);

  // Niche vs Generalist (blue)
  row = writeSection_(sheet, row, 'NICHE VS GENERALIST',
    findSection_(sections, 'NICHE VS GENERALIST'),
    '#1565c0', '#ffffff', '#e3f2fd', COLS);
  row = writeSpacer_(sheet, row, 8);

  // Headline Patterns (blue)
  row = writeSection_(sheet, row, 'HEADLINE PATTERNS',
    findSection_(sections, 'HEADLINE PATTERNS'),
    '#1565c0', '#ffffff', '#e3f2fd', COLS);
  row = writeSpacer_(sheet, row, 8);

  // Top Keywords (blue)
  row = writeSection_(sheet, row, 'TOP KEYWORDS',
    findSection_(sections, 'TOP KEYWORDS'),
    '#1565c0', '#ffffff', '#e3f2fd', COLS);
  row = writeSpacer_(sheet, row, 8);

  // Profile Structure Patterns (blue)
  row = writeSection_(sheet, row, 'PROFILE STRUCTURE PATTERNS',
    findSection_(sections, 'PROFILE STRUCTURE PATTERNS'),
    '#1565c0', '#ffffff', '#e3f2fd', COLS);
  row = writeSpacer_(sheet, row, 8);

  // Competitor Verdicts (purple)
  row = writeSection_(sheet, row, 'COMPETITOR VERDICTS',
    findSection_(sections, 'COMPETITOR VERDICTS'),
    '#7b1fa2', '#ffffff', '#f3e5f5', COLS);
  row = writeSpacer_(sheet, row, 12);

  // Gaps for Taha (orange)
  row = writeSection_(sheet, row, 'GAPS FOR TAHA',
    findSection_(sections, 'GAPS FOR TAHA'),
    '#e65100', '#ffffff', '#fff3e0', COLS);
  row = writeSpacer_(sheet, row, 12);

  // Divider
  sheet.getRange(row, 1, 1, COLS).merge().setValue('').setBackground('#424242');
  sheet.setRowHeight(row, 4);
  row++;
  row = writeSpacer_(sheet, row, 8);

  // Headline variants (red)
  row = writeSection_(sheet, row, 'HEADLINE VARIANTS FOR TAHA',
    findSection_(sections, 'HEADLINE VARIANTS FOR TAHA'),
    '#c62828', '#ffffff', '#ffebee', COLS);
  row = writeSpacer_(sheet, row, 8);

  // Bio opening variants (red)
  row = writeSection_(sheet, row, 'BIO OPENING VARIANTS FOR TAHA',
    findSection_(sections, 'BIO OPENING VARIANTS FOR TAHA'),
    '#c62828', '#ffffff', '#ffebee', COLS);

  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  SpreadsheetApp.getActiveSpreadsheet().toast('Done! Check the 🤖 Analysis tab.', '🤖 Analysis', 5);
}

// ── CLEAR ANALYSIS ───────────────────────────────────────────

function clearAnalysis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🤖 Analysis');
  if (sheet) {
    sheet.clearContents();
    sheet.clearFormats();
    SpreadsheetApp.getActiveSpreadsheet().toast('Analysis cleared.', '🗑️', 3);
  } else {
    SpreadsheetApp.getUi().alert('No Analysis sheet found.');
  }
}
