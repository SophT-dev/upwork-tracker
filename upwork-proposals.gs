// ============================================================
// Upwork Proposal Tracker — Google Apps Script
// Paste this entire file into Extensions → Apps Script → Save
// Then run onOpen() once (or just reload the sheet)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Proposals')
    .addItem('Add Proposal', 'openSidebar')
    .addSeparator()
    .addItem('Setup Sheet Headers', 'setupHeaders')
    .addItem('Add New Headers (v2 — run once)', 'addNewHeaders')
    .addItem('Add Job Status Column (v3 — run once)', 'addJobStatusHeader')
    .addItem('Fix Job Status Dropdown (run once)', 'addJobStatusValidation')
    .addSeparator()
    .addItem('📊 Refresh Dashboard', 'buildDashboard')
    .addItem('🤖 Run AI Analysis', 'analyzeWithClaude')
    .addToUi();
}

function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var headers = [
    'Date', 'Job Title', 'Category', 'Job Type', 'Budget', 'Hours/Week',
    'Experience Level', 'Duration', 'Skills', 'Connects Required',
    'Invite?', 'Client Location', 'Payment Verified', 'Client Rating',
    'Hire Rate', 'Client Spent', 'Jobs Posted', 'Avg Hourly Rate', 'Member Since',
    'Hook', 'Proposal Sent', 'Connects Used', 'Boost Connects', 'Total Connects',
    'Viewed?', 'Replied?', 'Closed?', 'Job Status', 'Reason if Not Closed', 'Source URL',
    'Client Name', 'Company'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)  // 31 cols
    .setFontWeight('bold')
    .setBackground('#14a800')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert('Headers set up successfully!');
}

// Run this ONCE on an existing sheet to add the two new columns without touching old data
function addNewHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  sheet.getRange(1, 30).setValue('Client Name');
  sheet.getRange(1, 31).setValue('Company');
  sheet.getRange(1, 30, 1, 2)
    .setFontWeight('bold')
    .setBackground('#14a800')
    .setFontColor('#ffffff');
  SpreadsheetApp.getUi().alert('Columns 30 (Client Name) and 31 (Company) added!');
}

// Run this ONCE to insert the Job Status column after "Closed?" without touching old data.
// Inserts a new column at position 28 (after Closed? at col 27) and shifts remaining cols right.
function addJobStatusHeader() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var closedIdx = headers.indexOf('Closed?');
  if (closedIdx === -1) {
    SpreadsheetApp.getUi().alert('Could not find "Closed?" column. Make sure your header row is set up.');
    return;
  }
  var insertCol = closedIdx + 2; // one column after Closed?
  sheet.insertColumnAfter(closedIdx + 1);
  sheet.getRange(1, insertCol).setValue('Job Status');
  sheet.getRange(1, insertCol)
    .setFontWeight('bold')
    .setBackground('#14a800')
    .setFontColor('#ffffff');
  // Add dropdown validation on the entire column (rows 2 onward)
  var lastRow = Math.max(sheet.getMaxRows(), 1000);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['—', 'Hired', 'Canceled', 'Other Hired', 'Still Active'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, insertCol, lastRow - 1, 1).setDataValidation(rule);

  SpreadsheetApp.getUi().alert('Column "Job Status" inserted after "Closed?" at column ' + insertCol + ' with dropdown validation.');
}

// Run this to add the dropdown validation to an existing Job Status column
function addJobStatusValidation() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colIdx = headers.indexOf('Job Status');
  if (colIdx === -1) {
    SpreadsheetApp.getUi().alert('Could not find "Job Status" column. Run "Add Job Status Column" first.');
    return;
  }
  var col = colIdx + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('No data rows found.'); return; }
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['—', 'Hired', 'Canceled', 'Other Hired', 'Still Active'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, lastRow - 1, 1).setDataValidation(rule);
  SpreadsheetApp.getUi().alert('Dropdown added to ' + (lastRow - 1) + ' existing rows in Job Status column!');
}

function openSidebar() {
  var html = HtmlService.createHtmlOutput(getSidebarHtml())
    .setTitle('Add Proposal')
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getToday() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ── SIDEBAR: manual entry (fallback) ──────────────────────
function addProposal(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    data.date,
    data.jobTitle,
    data.jobType,
    data.budget,
    data.experienceLevel,
    data.duration,
    data.category,
    data.skills,
    data.connectsRequired,
    data.invite,
    data.clientLocation,
    data.paymentVerified,
    data.clientRating,
    data.hireRate,
    data.clientSpent,
    data.jobsPosted,
    data.hook,
    data.proposal,
    data.connectsUsed,
    data.boostConnects,
    data.totalConnects,
    data.viewed || '—',
    data.replied || '—',
    data.closed || '—',
    data.reasonIfNot || ''
  ]);
}

// ── WEB APP: receives data from the Chrome extension ──────
// Deploy as: Extensions → Apps Script → Deploy → New deployment
//   Type: Web app | Execute as: Me | Who has access: Anyone
//
// Column order is determined by your sheet's header row — rearrange freely.
// Add or remove columns without touching this script.
// Just make sure your column headers match the names in FIELD_MAP below.
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // ── Column header name → JSON key sent by the extension ──
    // Rename a column in the sheet? Update the key on the LEFT side here.
    var FIELD_MAP = {
      'Date':                'date',
      'Job Title':           'jobTitle',
      'Category':            'category',
      'Job Type':            'jobType',
      'Budget':              'budget',
      'Hours/Week':          'hoursPerWeek',
      'Experience Level':    'experienceLevel',
      'Duration':            'duration',
      'Skills':              'skills',
      'Connects Required':   'connectsRequired',
      'Invite?':             'invite',
      'Client Location':     'clientLocation',
      'Payment Verified':    'paymentVerified',
      'Client Rating':       'clientRating',
      'Hire Rate':           'hireRate',
      'Client Spent':        'clientSpent',
      'Jobs Posted':         'jobsPosted',
      'Avg Hourly Rate':     'avgHourlyRate',
      'Member Since':        'memberSince',
      'Hook':                'hook',
      'Proposal Sent':       'proposal',
      'Connects Used':       'connectsUsed',
      'Boost Connects':      'boostConnects',
      'Total Connects':      'totalConnects',
      'Viewed?':             'viewed',
      'Replied?':            'replied',
      'Closed?':             'closed',
      'Job Status':          'jobStatus',
      'Reason if Not Closed':'reasonIfNot',
      'Source URL':          'sourceUrl',
      'Client Name':         'clientName',
      'Company':             'company'
    };

    // Fields that need a default value when blank
    var DEFAULTS = {
      'invite':     'No',
      'viewed':     'No',
      'replied':    'No',
      'closed':     'No',
      'jobStatus':  '—'
    };

    // Read the current header row to find each column's position
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Build the new row, placing each value under the right header
    var newRow = new Array(lastCol).fill('');
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      var key = FIELD_MAP[header];
      if (!key) continue;
      var val = data[key];
      newRow[i] = (val !== undefined && val !== null && val !== '') ? val : (DEFAULTS[key] || '');
    }

    sheet.appendRow(newRow);

    var lastRow = sheet.getLastRow();

    // Apply Job Status dropdown to the new row only
    var jobStatusCol = headers.indexOf('Job Status');
    if (jobStatusCol !== -1) {
      var jsRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['—', 'Hired', 'Canceled', 'Other Hired', 'Still Active'], true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(lastRow, jobStatusCol + 1).setDataValidation(jsRule);
    }

    sheet.getRange(lastRow, 1, 1, lastCol).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    var hookCol = headers.indexOf('Hook');
    if (hookCol !== -1) {
      sheet.getRange(lastRow, hookCol + 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    }
    sheet.setRowHeightsForced(lastRow, 1, 68);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// ANALYTICS — PHASE 1: Stats Dashboard
// ============================================================

// Load all proposal rows + a column index by header name
function loadData_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { colIdx: {}, rows: [] };

  var all = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = all[0];
  var colIdx = {};
  for (var i = 0; i < headers.length; i++) {
    colIdx[headers[i]] = i;
  }
  var rows = all.slice(1).filter(function(r) { return r[0] !== ''; });
  return { colIdx: colIdx, rows: rows };
}

// Count views/replies/closes for a subset of rows
function calcRates_(rows, colIdx) {
  var n = rows.length;
  if (n === 0) return { count: 0, viewed: 0, viewRate: null, replied: 0, replyRate: null, closed: 0, closeRate: null };
  var viewed = 0, replied = 0, closed = 0;
  var vi = colIdx['Viewed?'], ri = colIdx['Replied?'], ci = colIdx['Closed?'];
  rows.forEach(function(r) {
    if (vi !== undefined && String(r[vi]).toLowerCase() === 'yes') viewed++;
    if (ri !== undefined && String(r[ri]).toLowerCase() === 'yes') replied++;
    if (ci !== undefined && String(r[ci]).toLowerCase() === 'yes') closed++;
  });
  return {
    count: n,
    viewed: viewed,
    viewRate: n >= 3 ? (viewed / n) : null,
    replied: replied,
    replyRate: n >= 3 ? (replied / n) : null,
    closed: closed,
    closeRate: n >= 3 ? (closed / n) : null
  };
}

function pct_(val) {
  if (val === null) return '—';
  return (val * 100).toFixed(0) + '%';
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name, 1);
  }
  return s;
}

function buildDashboard() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Building dashboard...', '📊 Analytics', 3);

  var d = loadData_();
  var rows = d.rows;
  var colIdx = d.colIdx;

  var dash = getOrCreateSheet_('📊 Analytics');
  dash.clearContents();
  dash.clearFormats();

  var output = [];

  // ── Title ──
  output.push(['Upwork Proposal Analytics', 'Updated: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a'), '', '', '', '']);
  output.push(['', '', '', '', '', '']);

  // ── Section 1: Overall Funnel ──
  output.push(['OVERALL FUNNEL', '', '', '', '', '']);
  output.push(['Metric', 'Count', 'Rate', '', '', '']);
  var all = calcRates_(rows, colIdx);
  output.push(['Total Proposals', all.count, '', '', '', '']);
  output.push(['Viewed', all.viewed, pct_(all.viewRate), '', '', '']);
  output.push(['Replied', all.replied, pct_(all.replyRate), '', '', '']);
  output.push(['Closed', all.closed, pct_(all.closeRate), '', '', '']);
  output.push(['', '', '', '', '', '']);

  // ── Section 2: By Category ──
  output.push(['BY CATEGORY', '', '', '', '', '']);
  output.push(['Category', 'Proposals', 'View %', 'Reply %', 'Close %', '']);
  var catIdx = colIdx['Category'];
  if (catIdx !== undefined) {
    var cats = {};
    rows.forEach(function(r) {
      var c = r[catIdx] || '(blank)';
      if (!cats[c]) cats[c] = [];
      cats[c].push(r);
    });
    var catRows = Object.keys(cats).map(function(c) {
      var s = calcRates_(cats[c], colIdx);
      return [c, s.count, pct_(s.viewRate), pct_(s.replyRate), pct_(s.closeRate), s.count < 3 ? 'low data' : ''];
    });
    catRows.sort(function(a, b) { return b[1] - a[1]; });
    catRows.forEach(function(r) { output.push(r); });
  }
  output.push(['', '', '', '', '', '']);

  // ── Section 3: Invite vs Organic ──
  output.push(['INVITE VS ORGANIC', '', '', '', '', '']);
  output.push(['Type', 'Proposals', 'View %', 'Reply %', 'Close %', '']);
  var invIdx = colIdx['Invite?'];
  if (invIdx !== undefined) {
    var invYes = rows.filter(function(r) { return String(r[invIdx]).toLowerCase() === 'yes'; });
    var invNo  = rows.filter(function(r) { return String(r[invIdx]).toLowerCase() !== 'yes'; });
    var si = calcRates_(invYes, colIdx);
    var so = calcRates_(invNo, colIdx);
    output.push(['Invite', si.count, pct_(si.viewRate), pct_(si.replyRate), pct_(si.closeRate), '']);
    output.push(['Organic', so.count, pct_(so.viewRate), pct_(so.replyRate), pct_(so.closeRate), '']);
  }
  output.push(['', '', '', '', '', '']);

  // ── Section 4: Boosted vs Not Boosted ──
  output.push(['BOOSTED CONNECTS', '', '', '', '', '']);
  output.push(['Type', 'Proposals', 'View %', 'Reply %', 'Close %', '']);
  var boostIdx = colIdx['Boost Connects'];
  if (boostIdx !== undefined) {
    var boosted = rows.filter(function(r) { return parseFloat(r[boostIdx]) > 0; });
    var notBoosted = rows.filter(function(r) { return !(parseFloat(r[boostIdx]) > 0); });
    var sb = calcRates_(boosted, colIdx);
    var snb = calcRates_(notBoosted, colIdx);
    output.push(['Boosted', sb.count, pct_(sb.viewRate), pct_(sb.replyRate), pct_(sb.closeRate), '']);
    output.push(['Not Boosted', snb.count, pct_(snb.viewRate), pct_(snb.replyRate), pct_(snb.closeRate), '']);
  }
  output.push(['', '', '', '', '', '']);

  // ── Section 5: Payment Verified ──
  output.push(['CLIENT PAYMENT VERIFIED', '', '', '', '', '']);
  output.push(['Payment Verified', 'Proposals', 'View %', 'Reply %', 'Close %', '']);
  var pvIdx = colIdx['Payment Verified'];
  if (pvIdx !== undefined) {
    var pvYes = rows.filter(function(r) { return String(r[pvIdx]).toLowerCase() === 'yes'; });
    var pvNo  = rows.filter(function(r) { return String(r[pvIdx]).toLowerCase() === 'no'; });
    var pvOther = rows.filter(function(r) { var v = String(r[pvIdx]).toLowerCase(); return v !== 'yes' && v !== 'no'; });
    var spy = calcRates_(pvYes, colIdx);
    var spn = calcRates_(pvNo, colIdx);
    var spo = calcRates_(pvOther, colIdx);
    output.push(['Yes', spy.count, pct_(spy.viewRate), pct_(spy.replyRate), pct_(spy.closeRate), '']);
    output.push(['No', spn.count, pct_(spn.viewRate), pct_(spn.replyRate), pct_(spn.closeRate), '']);
    if (spo.count > 0) output.push(['Unknown', spo.count, pct_(spo.viewRate), pct_(spo.replyRate), pct_(spo.closeRate), '']);
  }

  // Write stats at once
  dash.getRange(1, 1, output.length, 6).setValues(output);

  // ── Formatting ──
  var sectionRows = [];
  for (var i = 0; i < output.length; i++) {
    var cell = output[i][0];
    if (['OVERALL FUNNEL','BY CATEGORY','INVITE VS ORGANIC','BOOSTED CONNECTS','CLIENT PAYMENT VERIFIED'].indexOf(cell) !== -1) {
      sectionRows.push(i + 1); // 1-based
    }
  }
  sectionRows.forEach(function(r) {
    dash.getRange(r, 1, 1, 6)
      .setBackground('#14a800')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  });
  sectionRows.forEach(function(r) {
    dash.getRange(r + 1, 1, 1, 6)
      .setBackground('#e8f5e9')
      .setFontWeight('bold');
  });
  dash.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(12);
  dash.setColumnWidth(1, 220);
  dash.setColumnWidth(2, 90);
  dash.setColumnWidth(3, 75);
  dash.setColumnWidth(4, 75);
  dash.setColumnWidth(5, 75);
  dash.setColumnWidth(6, 80);
  dash.setFrozenRows(1);

  SpreadsheetApp.getActiveSpreadsheet().toast('Done! Check the 📊 Analytics tab.', '📊 Analytics', 4);
}


// ============================================================
// ANALYTICS — PHASE 2: AI Pattern Analysis via Claude
// ============================================================

function analyzeWithClaude() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sending data to Claude...', '🤖 AI Analysis', 5);

  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) {
    SpreadsheetApp.getUi().alert(
      'Missing API key.\n\nGo to Extensions → Apps Script → Project Settings → Script Properties\nand add: ANTHROPIC_API_KEY = your key'
    );
    return;
  }

  var d = loadData_();
  var rows = d.rows;
  var colIdx = d.colIdx;

  if (rows.length === 0) {
    SpreadsheetApp.getUi().alert('No proposal data found.');
    return;
  }

  // Split into 3 groups based on outcomes
  var today = new Date();
  var vi = colIdx['Viewed?'], ri = colIdx['Replied?'], dateIdx = colIdx['Date'];

  var groupA = []; // replied=yes
  var groupB = []; // viewed=yes, replied!=yes
  var groupC = []; // viewed!=yes, sent 3+ days ago

  rows.forEach(function(r) {
    var replied = String(r[ri] || '').toLowerCase() === 'yes';
    var viewed  = String(r[vi] || '').toLowerCase() === 'yes';
    var daysOld = 0;
    if (dateIdx !== undefined && r[dateIdx]) {
      var d = new Date(r[dateIdx]);
      daysOld = (today - d) / (1000 * 60 * 60 * 24);
    }
    if (replied) {
      groupA.push(r);
    } else if (viewed) {
      groupB.push(r);
    } else if (daysOld >= 3) {
      groupC.push(r);
    }
  });

  var hookIdx = colIdx['Hook'];
  var catIdx  = colIdx['Category'];
  var expIdx  = colIdx['Experience Level'];

  function groupSummary(group, label) {
    if (group.length === 0) return label + ': none\n';
    var lines = [label + ' (' + group.length + ' proposals):'];
    // Take up to 20 most recent
    var sample = group.slice(-20);
    sample.forEach(function(r) {
      var hook = hookIdx !== undefined ? String(r[hookIdx] || '').trim() : '';
      var cat  = catIdx  !== undefined ? String(r[catIdx]  || '') : '';
      var exp  = expIdx  !== undefined ? String(r[expIdx]  || '') : '';
      if (hook) {
        var truncated = hook.length > 160 ? hook.substring(0, 160) + '...' : hook;
        lines.push('- Hook: "' + truncated + '"' + (cat ? '  [' + cat + (exp ? ', ' + exp : '') + ']' : ''));
      }
    });
    return lines.join('\n');
  }

  var overall = calcRates_(rows, colIdx);
  var prompt =
'You are an expert Upwork freelancer coach. Analyze proposal performance data below and give specific, actionable insights.\n\n' +
'OVERALL STATS\n' +
'Total proposals: ' + overall.count + '\n' +
'View rate: ' + pct_(overall.viewRate) + '\n' +
'Reply rate: ' + pct_(overall.replyRate) + '\n' +
'Close rate: ' + pct_(overall.closeRate) + '\n\n' +
groupSummary(groupA, 'GROUP A — Got a reply (best outcome)') + '\n\n' +
groupSummary(groupB, 'GROUP B — Viewed but no reply') + '\n\n' +
groupSummary(groupC, 'GROUP C — Not viewed (sent 3+ days ago, no response)') + '\n\n' +
'ANALYSIS TASKS\n' +
'0. KEY TAKEAWAYS: Give 3-5 bullet points (starting with •) summarising the single most important things this data reveals. Each bullet max 1 sentence.\n\n' +
'For sections 1, 2, and 3 below — split each into exactly two parts using these labels:\n' +
'REASONING: the core insight or pattern (no examples here, just the finding)\n' +
'EXAMPLES: specific quotes, hook excerpts, or cases from the data that prove it\n\n' +
'1. HOOK PATTERNS THAT WORK: What specific language, framing, or opening moves appear in Group A hooks but are absent from Group C?\n' +
'2. VIEWED BUT GHOSTED: What might explain why Group B proposals were opened but got no reply?\n' +
'3. TOP 3 ACTIONS: 3 concrete things to do differently. Each action = one sentence.\n\n' +
'Be direct. Only reference what this actual data shows — no generic freelancing advice.';

  var payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
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
  if (!result.content || !result.content[0]) {
    SpreadsheetApp.getUi().alert('Claude API error: ' + response.getContentText());
    return;
  }

  var text = result.content[0].text;
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  var meta = 'Last run: ' + ts + '  |  Based on ' + rows.length + ' proposals: ' +
    groupA.length + ' replied, ' + groupB.length + ' viewed-no-reply, ' + groupC.length + ' not viewed';

  // Save to Script Properties for reference
  PropertiesService.getScriptProperties().setProperty('AI_INSIGHTS_TEXT', text);
  PropertiesService.getScriptProperties().setProperty('AI_INSIGHTS_META', meta);

  // Write to dedicated AI Analysis sheet
  writeAiAnalysisSheet_(text, meta);
}


// Write AI analysis: KEY TAKEAWAYS full-width, then 3 sections x 2 sub-columns (reasoning | examples)
function writeAiAnalysisSheet_(text, meta) {
  var sheet = getOrCreateSheet_('🤖 AI Analysis');
  sheet.clearContents();
  sheet.clearFormats();

  var allSections = parseSections_(text); // [0]=KEY TAKEAWAYS, [1-3]=main sections
  var summary  = allSections[0];
  var sections = allSections.slice(1, 4);
  var TOTAL_COLS = 6;
  var nextRow = 1;

  // ── KEY TAKEAWAYS (spans all 6 cols) ──
  if (summary && summary.reasoning.length > 0) {
    sheet.getRange(nextRow, 1, 1, TOTAL_COLS).merge()
      .setValue('KEY TAKEAWAYS')
      .setBackground('#14a800').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12);
    sheet.setRowHeight(nextRow, 30);
    nextRow++;

    var bulletText = summary.reasoning.join('\n');
    sheet.getRange(nextRow, 1, 1, TOTAL_COLS).merge()
      .setValue(bulletText)
      .setBackground('#f0f7ee')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setVerticalAlignment('top').setFontSize(11);
    sheet.setRowHeight(nextRow, Math.max(70, bulletText.split('\n').length * 22));
    nextRow++;
    sheet.setRowHeight(nextRow, 8); nextRow++; // spacer
  }

  // Meta row
  sheet.getRange(nextRow, 1, 1, TOTAL_COLS).merge().setValue(meta || '')
    .setFontColor('#666').setFontStyle('italic').setFontSize(10);
  sheet.setRowHeight(nextRow, 20);
  nextRow++;

  // ── Sub-column header row: REASONING | EXAMPLES for each section ──
  var subHeaderRow = nextRow;
  sections.forEach(function(section, i) {
    var baseCol = i * 2 + 1; // cols 1,3,5
    // Section title spans both sub-columns
    sheet.getRange(subHeaderRow, baseCol, 1, 2).merge()
      .setValue(section.title)
      .setBackground('#14a800').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11)
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(subHeaderRow, 30);

    // Sub-column labels
    sheet.getRange(subHeaderRow + 1, baseCol)
      .setValue('REASONING').setBackground('#e8f5e9').setFontWeight('bold').setFontSize(10);
    sheet.getRange(subHeaderRow + 1, baseCol + 1)
      .setValue('EXAMPLES').setBackground('#e8f5e9').setFontWeight('bold').setFontSize(10);
  });
  sheet.setRowHeight(subHeaderRow + 1, 22);
  nextRow += 2;

  // ── Content: write reasoning and examples row-by-row per section ──
  // Each section has reasoning blocks and examples blocks; write them in parallel rows
  var contentStartRow = nextRow;
  sections.forEach(function(section, i) {
    var baseCol = i * 2 + 1;
    var row = contentStartRow;

    section.reasoning.forEach(function(block) {
      if (!block.trim()) return;
      var cell = sheet.getRange(row, baseCol);
      cell.setValue(block).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
        .setVerticalAlignment('top').setFontSize(11).setBackground('#ffffff');
      var h = Math.max(40, Math.ceil(block.length / 45) * 19);
      if (sheet.getRowHeight(row) < h) sheet.setRowHeight(row, h);
      row++;
    });

    row = contentStartRow;
    section.examples.forEach(function(block) {
      if (!block.trim()) return;
      var cell = sheet.getRange(row, baseCol + 1);
      cell.setValue(block).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
        .setVerticalAlignment('top').setFontSize(11).setBackground('#fafafa');
      var h = Math.max(40, Math.ceil(block.length / 45) * 19);
      if (sheet.getRowHeight(row) < h) sheet.setRowHeight(row, h);
      row++;
    });
  });

  // Column widths
  for (var c = 1; c <= TOTAL_COLS; c++) sheet.setColumnWidth(c, 210);

  SpreadsheetApp.getActiveSpreadsheet().toast('Done! Check the 🤖 AI Analysis tab.', '🤖 AI Analysis', 5);
}

// Parse Claude's response → [{title, reasoning:[], examples:[]}] with index 0 = KEY TAKEAWAYS
function parseSections_(text) {
  var lines = text.split('\n');
  var sections = [];
  var current = null;
  var subSection = null; // 'reasoning' | 'examples' | 'blocks' (for section 0)
  var buffer = [];

  function flushBuffer() {
    if (!current || buffer.length === 0) { buffer = []; return; }
    var joined = buffer.join('\n').trim();
    buffer = [];
    if (!joined) return;
    var cleaned = joined.replace(/\*\*/g, '').trim();
    if (!cleaned) return;
    if (subSection === 'examples') {
      current.examples.push(cleaned);
    } else {
      current.reasoning.push(cleaned);
    }
  }

  function isMainHeader(line) {
    var s = line.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim();
    if (!/^[0-3][\.\)]\s/.test(s)) return false;
    // Section titles are ALL CAPS (e.g. "HOOK PATTERNS THAT WORK")
    // Numbered sentences inside sections are mixed case (e.g. "Rewrite every hook...")
    var titlePart = s.replace(/^[0-3][\.\)]\s*/, '').split(':')[0].trim();
    var firstWord = titlePart.split(/\s+/)[0];
    return firstWord.length > 1 && firstWord === firstWord.toUpperCase();
  }

  function isSubHeader(line) {
    var s = line.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim().toUpperCase();
    return s === 'REASONING:' || s === 'REASONING' || s === 'EXAMPLES:' || s === 'EXAMPLES';
  }

  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (/^---+$/.test(trimmed)) return;

    if (isMainHeader(trimmed)) {
      flushBuffer();
      if (current) sections.push(current);
      var title = trimmed.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim().split(':')[0].trim();
      current = { title: title, reasoning: [], examples: [] };
      subSection = 'reasoning';
      return;
    }

    if (isSubHeader(trimmed)) {
      flushBuffer();
      var label = trimmed.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').replace(':', '').trim().toUpperCase();
      subSection = (label === 'EXAMPLES') ? 'examples' : 'reasoning';
      return;
    }

    if (!current) return;

    if (trimmed === '') {
      flushBuffer();
      return;
    }

    buffer.push(trimmed.replace(/^#{1,4}\s*/, ''));
  });

  flushBuffer();
  if (current) sections.push(current);

  while (sections.length < 4) sections.push({ title: '—', reasoning: [], examples: [] });
  return sections.slice(0, 4);
}


function getSidebarHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; background: #fff; }
  .field { margin-bottom: 10px; }
  label { display: block; font-weight: bold; margin-bottom: 3px; color: #333; }
  input[type=text], input[type=date], select, textarea {
    width: 100%; padding: 6px 8px; border: 1px solid #ccc;
    border-radius: 4px; font-size: 13px; font-family: Arial, sans-serif;
  }
  textarea { resize: vertical; min-height: 80px; }
  textarea.proposal-text { min-height: 140px; }
  .row2 { display: flex; gap: 8px; }
  .row2 .field { flex: 1; }
  button {
    width: 100%; padding: 10px; background: #1a8f4c; color: white;
    border: none; border-radius: 4px; font-size: 14px; font-weight: bold;
    cursor: pointer; margin-top: 4px;
  }
  button:hover { background: #157a3e; }
  button:disabled { background: #aaa; cursor: default; }
  #status { text-align: center; margin-top: 8px; font-weight: bold; color: #1a8f4c; min-height: 18px; }
  #status.error { color: #c0392b; }
</style>
</head>
<body>
<div class="field">
  <label>Date</label>
  <input type="date" id="date" />
</div>
<div class="row2">
  <div class="field">
    <label>Client Name</label>
    <input type="text" id="clientName" placeholder="e.g. John D." />
  </div>
  <div class="field">
    <label>Company</label>
    <input type="text" id="company" placeholder="e.g. Acme Corp" />
  </div>
</div>
<div class="field">
  <label>Job Title</label>
  <input type="text" id="jobTitle" placeholder="e.g. Email Copywriter for SaaS Brand" />
</div>
<div class="row2">
  <div class="field">
    <label>Location</label>
    <input type="text" id="location" placeholder="e.g. USA" />
  </div>
  <div class="field">
    <label>Industry</label>
    <input type="text" id="industry" placeholder="e.g. SaaS" />
  </div>
</div>
<div class="row2">
  <div class="field">
    <label>Invite?</label>
    <select id="invite">
      <option value="No">No</option>
      <option value="Yes">Yes</option>
    </select>
  </div>
</div>
<div class="row2">
  <div class="field">
    <label>Connects Used</label>
    <input type="number" id="connectsUsed" min="0" placeholder="e.g. 6" oninput="calcTotal()" />
  </div>
  <div class="field">
    <label>Boost Connects</label>
    <input type="number" id="boostConnects" min="0" placeholder="e.g. 4" oninput="calcTotal()" />
  </div>
  <div class="field">
    <label>Total Connects</label>
    <input type="number" id="totalConnects" min="0" placeholder="auto" />
  </div>
</div>
<div class="field">
  <label>Hook of Proposal</label>
  <input type="text" id="hook" placeholder="e.g. Led with their conversion drop stat" />
</div>
<div class="field">
  <label>Proposal Sent</label>
  <textarea class="proposal-text" id="proposal" placeholder="Paste your full proposal here..."></textarea>
</div>
<div class="row2">
  <div class="field">
    <label>Viewed?</label>
    <select id="viewed">
      <option value="—">—</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  </div>
  <div class="field">
    <label>Replied?</label>
    <select id="replied">
      <option value="—">—</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  </div>
  <div class="field">
    <label>Closed?</label>
    <select id="closed">
      <option value="—">—</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  </div>
</div>
<div class="field">
  <label>Reason if not closed</label>
  <input type="text" id="reasonIfNot" placeholder="e.g. Budget mismatch" />
</div>
<button id="submitBtn" onclick="submit()">Add Proposal</button>
<div id="status"></div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    google.script.run.withSuccessHandler(function(today) {
      document.getElementById('date').value = today;
    }).getToday();
  });

  function calcTotal() {
    var used = parseFloat(document.getElementById('connectsUsed').value) || 0;
    var boost = parseFloat(document.getElementById('boostConnects').value) || 0;
    document.getElementById('totalConnects').value = used + boost || '';
  }

  function submit() {
    var btn = document.getElementById('submitBtn');
    var status = document.getElementById('status');
    var data = {
      date: document.getElementById('date').value,
      clientName: document.getElementById('clientName').value.trim(),
      company: document.getElementById('company').value.trim(),
      jobTitle: document.getElementById('jobTitle').value.trim(),
      location: document.getElementById('location').value.trim(),
      industry: document.getElementById('industry').value.trim(),
      invite: document.getElementById('invite').value,
      connectsUsed: document.getElementById('connectsUsed').value,
      boostConnects: document.getElementById('boostConnects').value,
      totalConnects: document.getElementById('totalConnects').value,
      hook: document.getElementById('hook').value.trim(),
      proposal: document.getElementById('proposal').value.trim(),
      viewed: document.getElementById('viewed').value,
      replied: document.getElementById('replied').value,
      closed: document.getElementById('closed').value,
      reasonIfNot: document.getElementById('reasonIfNot').value.trim()
    };

    if (!data.date || !data.clientName) {
      status.className = 'error';
      status.textContent = 'Date and Client Name are required.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';
    status.className = '';
    status.textContent = '';

    google.script.run
      .withSuccessHandler(function() {
        status.className = '';
        status.textContent = '✓ Proposal added!';
        btn.disabled = false;
        btn.textContent = 'Add Proposal';
        // Reset fields but keep date
        var savedDate = document.getElementById('date').value;
        ['clientName','company','jobTitle','location','industry','connectsUsed','boostConnects','totalConnects','hook','proposal','reasonIfNot'].forEach(function(id) {
          document.getElementById(id).value = '';
        });
        ['invite','viewed','replied','closed'].forEach(function(id) {
          document.getElementById(id).selectedIndex = 0;
        });
        document.getElementById('date').value = savedDate;
      })
      .withFailureHandler(function(err) {
        status.className = 'error';
        status.textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = 'Add Proposal';
      })
      .addProposal(data);
  }
</script>
</body>
</html>`;
}
