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
    .addItem('🎨 Apply Job Status Colors', 'applyJobStatusColors')
    .addItem('⚙️ Set Recent Count', 'setRecentCount')
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
  applyJobStatusColors_();
  SpreadsheetApp.getUi().alert('Dropdown added to ' + (lastRow - 1) + ' existing rows in Job Status column!');
}

// Apply conditional formatting colors to Job Status column
function applyJobStatusColors_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = headers.indexOf('Job Status');
  if (col === -1) return;
  col++; // 1-based
  var range = sheet.getRange(2, col, sheet.getMaxRows() - 1, 1);

  // Remove any existing conditional format rules that target this column
  var existing = sheet.getConditionalFormatRules();
  var kept = existing.filter(function(r) {
    var ranges = r.getRanges();
    for (var i = 0; i < ranges.length; i++) {
      if (ranges[i].getColumn() === col && ranges[i].getNumColumns() === 1) return false;
    }
    return true;
  });

  // Add color rules: Hired=green, Other Hired=red, Canceled=blue
  kept.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Hired')
    .setBackground('#d4edda').setFontColor('#155724')
    .setRanges([range]).build());
  kept.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Other Hired')
    .setBackground('#f8d7da').setFontColor('#721c24')
    .setRanges([range]).build());
  kept.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Canceled')
    .setBackground('#cce5ff').setFontColor('#004085')
    .setRanges([range]).build());

  sheet.setConditionalFormatRules(kept);
}

// Menu-callable wrapper
function applyJobStatusColors() {
  applyJobStatusColors_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Job Status colors applied!', '🎨 Formatting', 3);
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

// ── WEB APP ─────────────────────────────────────────────────
// Deploy as: Extensions → Apps Script → Deploy → New deployment
//   Type: Web app | Execute as: Me | Who has access: Anyone
//
// doGet: serves agent insights export (GET ?action=insights)
// doPost: receives proposal data from Chrome extension

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'insights') {
    var export_ = PropertiesService.getScriptProperties().getProperty('AGENT_EXPORT') || '';
    return ContentService.createTextOutput(export_).setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService.createTextOutput('ok');
}

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
    applyJobStatusColors_();

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

  // ── ROI helper: total connects + cost metrics for a group of rows ──
  var COST_PER_CONNECT = 0.15; // 300 connects = $45
  var tcIdx = colIdx['Total Connects'];

  function roiMetrics(subset, colIdx) {
    var totalConnects = 0;
    subset.forEach(function(r) {
      totalConnects += parseFloat(r[tcIdx] || 0) || 0;
    });
    var totalCost = totalConnects * COST_PER_CONNECT;
    var rates = calcRates_(subset, colIdx);
    return {
      count: rates.count,
      totalConnects: totalConnects,
      totalCost: totalCost,
      avgConnects: rates.count > 0 ? (totalConnects / rates.count) : 0,
      avgCost: rates.count > 0 ? (totalCost / rates.count) : 0,
      viewed: rates.viewed,
      replied: rates.replied,
      closed: rates.closed,
      costPerView: rates.viewed > 0 ? (totalCost / rates.viewed) : null,
      costPerReply: rates.replied > 0 ? (totalCost / rates.replied) : null,
      costPerClose: rates.closed > 0 ? (totalCost / rates.closed) : null
    };
  }

  function dollar(val) {
    if (val === null || val === undefined) return '—';
    return '$' + val.toFixed(2);
  }

  // ── Section 0: CONNECT ROI ──
  var roiAll = roiMetrics(rows, colIdx);

  output.push(['CONNECT ROI', '', '', '', '', '']);
  output.push(['Metric', 'Value', '', '', '', '']);
  output.push(['Total Connects Spent', roiAll.totalConnects, '', '', '', '']);
  output.push(['Total Cost', dollar(roiAll.totalCost), '', '', '', '']);
  output.push(['Avg Connects / Proposal', roiAll.avgConnects > 0 ? roiAll.avgConnects.toFixed(1) : '—', '', '', '', '']);
  output.push(['Avg Cost / Proposal', dollar(roiAll.avgCost), '', '', '', '']);
  output.push(['Cost / View', dollar(roiAll.costPerView), '', '', '', '']);
  output.push(['Cost / Reply', dollar(roiAll.costPerReply), '', '', '', '']);
  output.push(['Cost / Close (Hire)', dollar(roiAll.costPerClose), '', '', '', '']);
  output.push(['', '', '', '', '', '']);

  // ── ROI by Category ──
  output.push(['ROI BY CATEGORY', '', '', '', '', '']);
  output.push(['Category', 'Proposals', 'Connects', 'Cost', '$/Reply', '$/Close']);
  var catIdx2 = colIdx['Category'];
  if (catIdx2 !== undefined) {
    var catGroups = {};
    rows.forEach(function(r) {
      var c = r[catIdx2] || '(blank)';
      if (!catGroups[c]) catGroups[c] = [];
      catGroups[c].push(r);
    });
    var catRoiRows = Object.keys(catGroups).map(function(c) {
      var m = roiMetrics(catGroups[c], colIdx);
      return [c, m.count, m.totalConnects, dollar(m.totalCost), dollar(m.costPerReply), dollar(m.costPerClose)];
    });
    catRoiRows.sort(function(a, b) { return b[1] - a[1]; });
    catRoiRows.forEach(function(r) { output.push(r); });
  }
  output.push(['', '', '', '', '', '']);

  // ── ROI: Invite vs Organic ──
  output.push(['ROI: INVITE VS ORGANIC', '', '', '', '', '']);
  output.push(['Type', 'Proposals', 'Connects', 'Cost', '$/Reply', '$/Close']);
  var invIdx2 = colIdx['Invite?'];
  if (invIdx2 !== undefined) {
    var invY = rows.filter(function(r) { return String(r[invIdx2]).toLowerCase() === 'yes'; });
    var invN = rows.filter(function(r) { return String(r[invIdx2]).toLowerCase() !== 'yes'; });
    var mi = roiMetrics(invY, colIdx);
    var mo = roiMetrics(invN, colIdx);
    output.push(['Invite', mi.count, mi.totalConnects, dollar(mi.totalCost), dollar(mi.costPerReply), dollar(mi.costPerClose)]);
    output.push(['Organic', mo.count, mo.totalConnects, dollar(mo.totalCost), dollar(mo.costPerReply), dollar(mo.costPerClose)]);
  }
  output.push(['', '', '', '', '', '']);

  // ── ROI: Boosted vs Not Boosted ──
  output.push(['ROI: BOOSTED VS NOT BOOSTED', '', '', '', '', '']);
  output.push(['Type', 'Proposals', 'Connects', 'Cost', '$/Reply', '$/Close']);
  var boostIdx2 = colIdx['Boost Connects'];
  if (boostIdx2 !== undefined) {
    var bY = rows.filter(function(r) { return parseFloat(r[boostIdx2]) > 0; });
    var bN = rows.filter(function(r) { return !(parseFloat(r[boostIdx2]) > 0); });
    var mb = roiMetrics(bY, colIdx);
    var mnb = roiMetrics(bN, colIdx);
    output.push(['Boosted', mb.count, mb.totalConnects, dollar(mb.totalCost), dollar(mb.costPerReply), dollar(mb.costPerClose)]);
    output.push(['Not Boosted', mnb.count, mnb.totalConnects, dollar(mnb.totalCost), dollar(mnb.costPerReply), dollar(mnb.costPerClose)]);
  }
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
    if (['CONNECT ROI','ROI BY CATEGORY','ROI: INVITE VS ORGANIC','ROI: BOOSTED VS NOT BOOSTED','OVERALL FUNNEL','BY CATEGORY','INVITE VS ORGANIC','BOOSTED CONNECTS','CLIENT PAYMENT VERIFIED'].indexOf(cell) !== -1) {
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

// Set how many recent proposals to analyze (stored in Script Properties)
function setRecentCount() {
  var current = PropertiesService.getScriptProperties().getProperty('RECENT_COUNT') || '10';
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt('Set Recent Count',
    'How many recent proposals should the AI deep-dive analyze?\nCurrent: ' + current,
    ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;
  var val = parseInt(result.getResponseText());
  if (isNaN(val) || val < 1 || val > 50) {
    ui.alert('Please enter a number between 1 and 50.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('RECENT_COUNT', String(val));
  ui.alert('Recent count set to ' + val + '. This will take effect next time you run AI Analysis.');
}

// Serialize all proposal rows into compact pipe-delimited format for Claude
function buildProposalDataForClaude_(rows, colIdx) {
  var fields = [
    'Date', 'Job Title', 'Category', 'Job Type', 'Budget', 'Hours/Week',
    'Experience Level', 'Duration', 'Skills', 'Connects Required', 'Invite?',
    'Boost Connects', 'Client Location', 'Payment Verified', 'Client Rating',
    'Hire Rate', 'Client Spent', 'Jobs Posted', 'Avg Hourly Rate', 'Member Since',
    'Hook', 'Viewed?', 'Replied?', 'Closed?', 'Job Status'
  ];

  var lines = [];
  lines.push('Format: # | ' + fields.join(' | '));

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var vals = [];
    for (var f = 0; f < fields.length; f++) {
      var key = fields[f];
      var idx = colIdx[key];
      var val = (idx !== undefined) ? String(r[idx] || '').trim() : '—';
      // Truncate hooks to 200 chars in the overall view
      if (key === 'Hook' && val.length > 200) val = val.substring(0, 200) + '...';
      vals.push(val);
    }
    lines.push('#' + (i + 1) + ' | ' + vals.join(' | '));
  }
  return lines.join('\n');
}

// Extract the N most recent proposals with full untruncated hook text
function buildRecentForClaude_(rows, colIdx, count) {
  var recent = rows.slice(-count);
  var startNum = rows.length - recent.length + 1;

  var fields = [
    'Date', 'Job Title', 'Category', 'Job Type', 'Budget', 'Hours/Week',
    'Experience Level', 'Duration', 'Skills', 'Connects Required', 'Invite?',
    'Boost Connects', 'Client Location', 'Payment Verified', 'Client Rating',
    'Hire Rate', 'Client Spent', 'Jobs Posted', 'Avg Hourly Rate', 'Member Since',
    'Hook', 'Viewed?', 'Replied?', 'Closed?', 'Job Status'
  ];

  var lines = [];
  for (var i = 0; i < recent.length; i++) {
    var r = recent[i];
    var vals = [];
    for (var f = 0; f < fields.length; f++) {
      var key = fields[f];
      var idx = colIdx[key];
      var val = (idx !== undefined) ? String(r[idx] || '').trim() : '—';
      // Full hook text — no truncation
      vals.push(val);
    }
    lines.push('#' + (startNum + i) + ' | ' + vals.join(' | '));
  }
  return lines.join('\n');
}

// Call Claude API and return text response (or null on failure)
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

function analyzeWithClaude() {
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

  var overall = calcRates_(rows, colIdx);
  var allData = buildProposalDataForClaude_(rows, colIdx);

  // Find date range
  var dateIdx = colIdx['Date'];
  var earliest = '—', latest = '—';
  if (dateIdx !== undefined && rows.length > 0) {
    earliest = String(rows[0][dateIdx] || '—');
    latest = String(rows[rows.length - 1][dateIdx] || '—');
  }

  // ── API Call 1: Overall Portfolio Analysis ──
  SpreadsheetApp.getActiveSpreadsheet().toast('Analyzing overall patterns... (1/2)', '🤖 AI Analysis', 30);

  var prompt1 =
'You are an elite Upwork freelance strategist. Analyze this freelancer\'s complete proposal history and deliver brutally specific, data-backed insights. No generic advice — every point must reference actual numbers or patterns from this data.\n\n' +
'PORTFOLIO STATS\n' +
'Total proposals: ' + overall.count + '\n' +
'View rate: ' + pct_(overall.viewRate) + ' | Reply rate: ' + pct_(overall.replyRate) + ' | Close rate: ' + pct_(overall.closeRate) + '\n' +
'Date range: ' + earliest + ' to ' + latest + '\n\n' +
'FULL PROPOSAL DATA (one row per proposal):\n' +
allData + '\n\n' +
'Respond with EXACTLY these sections using these EXACT headers (===SECTION: NAME=== format). Under each header, give 3-6 bullet points starting with •. Every bullet must cite specific data (numbers, percentages, examples from above).\n\n' +
'===SECTION: KEY TAKEAWAYS===\n' +
'The 4-5 most important patterns this data reveals. Each bullet = one sharp sentence.\n\n' +
'===SECTION: CLIENT PROFILE WINNERS VS LOSERS===\n' +
'What client profiles get replies vs don\'t? Analyze: client rating ranges, hire rate ranges, total spend ranges, payment verified vs not, jobs posted count, member since (tenure). Which combos predict success?\n\n' +
'===SECTION: BUDGET AND RATE PATTERNS===\n' +
'What budget ranges and hourly rate ranges get replies? Fixed vs hourly performance? Where is the sweet spot?\n\n' +
'===SECTION: CATEGORY AND SKILLS PERFORMANCE===\n' +
'Which categories and skill combinations have the best/worst view and reply rates? Where should this freelancer focus?\n\n' +
'===SECTION: CONNECT SPEND EFFECTIVENESS===\n' +
'Boost vs no boost performance. Invite vs organic. Connects spent vs outcome. Is boosting worth it? Are invites converting?\n\n' +
'===SECTION: HOOK PATTERNS THAT CONVERT===\n' +
'What specific language, framing, or opening moves appear in replied proposals but not in ignored ones? Quote specific hooks.\n\n' +
'===SECTION: LOCATION AND TIMING PATTERNS===\n' +
'Any geographic patterns? Client locations that respond more? Day-of-week or date patterns?\n\n' +
'===SECTION: THE GHOSTING PROBLEM===\n' +
'Proposals that were viewed but got no reply — what do they have in common? What\'s different about them vs. replied proposals?\n\n' +
'===SECTION: TOP 5 ACTIONS===\n' +
'The 5 most impactful changes to make immediately based on everything above. Each action = one concrete sentence with a specific number or target.\n\n' +
'Be ruthlessly specific. If a pattern only has 1-2 data points, say so. Never generalize beyond what the data shows.';

  var text1 = callClaude_(key, prompt1, 4000);
  if (!text1) {
    SpreadsheetApp.getUi().alert('Claude API error on overall analysis. Check your API key and try again.');
    return;
  }

  // ── API Call 2: Recent N Deep Dive ──
  var recentCount = parseInt(PropertiesService.getScriptProperties().getProperty('RECENT_COUNT') || '10');
  var actualRecent = Math.min(recentCount, rows.length);

  SpreadsheetApp.getActiveSpreadsheet().toast('Analyzing recent ' + actualRecent + ' proposals... (2/2)', '🤖 AI Analysis', 30);

  var recentData = buildRecentForClaude_(rows, colIdx, actualRecent);

  var prompt2 =
'You are an elite Upwork freelance strategist. Below are the ' + actualRecent + ' most recent proposals this freelancer sent. Give specific, critical feedback on each one individually — then an overall pattern assessment.\n\n' +
'OVERALL PORTFOLIO CONTEXT (for reference):\n' +
'Total proposals all-time: ' + overall.count + ' | View rate: ' + pct_(overall.viewRate) + ' | Reply rate: ' + pct_(overall.replyRate) + ' | Close rate: ' + pct_(overall.closeRate) + '\n\n' +
'THE ' + actualRecent + ' MOST RECENT PROPOSALS (full detail):\n' +
recentData + '\n\n' +
'Respond with EXACTLY these sections using these EXACT headers (===SECTION: NAME=== format):\n\n' +
'===SECTION: INDIVIDUAL VERDICTS===\n' +
'For each proposal, write exactly one line in this format:\n' +
'• #{number} {Job Title} — {VERDICT: Strong/Weak/Risky/Smart} — {one sentence explaining why, referencing specific client data or hook choice}\n\n' +
'===SECTION: PATTERN DIAGNOSIS===\n' +
'3-5 bullets: What patterns do you see across these ' + actualRecent + ' specifically? Are things improving or getting worse compared to the overall portfolio? Any repeated mistakes?\n\n' +
'===SECTION: WHAT TO CHANGE NEXT WEEK===\n' +
'3 specific, concrete changes for the next 5-10 proposals based on what these recent ' + actualRecent + ' reveal.\n\n' +
'Be direct. Be critical. No encouragement fluff.';

  var text2 = callClaude_(key, prompt2, 2000);

  // Parse both responses
  var overallSections = parseSectionsV2_(text1);
  var recentSections = text2 ? parseSectionsV2_(text2) : {};

  // Build metadata
  var vi = colIdx['Viewed?'], ri = colIdx['Replied?'];
  var repliedCount = 0, viewedCount = 0, notViewedCount = 0;
  rows.forEach(function(r) {
    var replied = String(r[ri] || '').toLowerCase() === 'yes';
    var viewed = String(r[vi] || '').toLowerCase() === 'yes';
    if (replied) repliedCount++;
    else if (viewed) viewedCount++;
    else notViewedCount++;
  });
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  var meta = 'Last run: ' + ts + '  |  Based on ' + rows.length + ' proposals: ' +
    repliedCount + ' replied, ' + viewedCount + ' viewed-no-reply, ' + notViewedCount + ' not viewed';

  // Save to Script Properties
  PropertiesService.getScriptProperties().setProperty('AI_INSIGHTS_TEXT', text1 + '\n\n---RECENT---\n\n' + (text2 || ''));
  PropertiesService.getScriptProperties().setProperty('AI_INSIGHTS_META', meta);

  // Build compact agent export (max 10 rules) and store for live fetch
  var agentExport = buildAgentExport_(overallSections);

  // Write to sheet
  writeAiAnalysisSheetV2_(overallSections, recentSections, meta, actualRecent, agentExport);
}


// Extract hook-focused writing insights for the proposal agent.
// Only pulls from HOOK PATTERNS and GHOSTING sections — no job filtering or strategy advice.
function buildAgentExport_(overallSections) {
  var hooks = findSection_(overallSections, 'HOOK PATTERNS THAT CONVERT') || '';
  var ghosting = findSection_(overallSections, 'THE GHOSTING PROBLEM') || '';

  // Extract bullet lines only
  var hookLines = hooks.split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.indexOf('•') === 0 || l.indexOf('-') === 0; });

  var ghostLines = ghosting.split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.indexOf('•') === 0 || l.indexOf('-') === 0; });

  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var parts = ['Updated: ' + ts];

  if (hookLines.length > 0) {
    parts.push('');
    parts.push('HOOKS THAT GET VIEWS AND REPLIES:');
    parts = parts.concat(hookLines.slice(0, 6));
  }

  if (ghostLines.length > 0) {
    parts.push('');
    parts.push('HOOKS THAT GET IGNORED OR GHOSTED:');
    parts = parts.concat(ghostLines.slice(0, 4));
  }

  var export_ = parts.join('\n');

  PropertiesService.getScriptProperties().setProperty('AGENT_EXPORT', export_);
  return export_;
}


// Parse Claude response using ===SECTION: NAME=== delimiters
function parseSectionsV2_(text) {
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
      // Fallback: use first newline
      var nl = part.indexOf('\n');
      if (nl === -1) continue;
      title = part.substring(0, nl).trim();
      content = part.substring(nl + 1).trim();
    }
    // Strip markdown bold/headers
    content = content.replace(/^#{1,4}\s*/gm, '').replace(/\*\*/g, '');
    sections[title.toUpperCase()] = content;
  }
  return sections;
}


// Fuzzy lookup: find a section by keyword fragments (case-insensitive)
// e.g. findSection_(sections, 'TOP 5 ACTIONS') matches 'TOP 5 ACTIONS TO IMPLEMENT'
function findSection_(sections, name) {
  // Exact match first
  if (sections[name]) return sections[name];

  // Keyword-based fallback: all words in `name` must appear in the key
  var keywords = name.split(/\s+/);
  var keys = Object.keys(sections);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var allMatch = true;
    for (var k = 0; k < keywords.length; k++) {
      if (key.indexOf(keywords[k]) === -1) { allMatch = false; break; }
    }
    if (allMatch) return sections[key];
  }
  return null;
}

// Reusable: write one section (header + content) to the sheet, return next row
function writeSection_(sheet, row, title, content, headerBg, headerFont, contentBg, cols) {
  // Header row
  sheet.getRange(row, 1, 1, cols).merge()
    .setValue(title)
    .setBackground(headerBg).setFontColor(headerFont)
    .setFontWeight('bold').setFontSize(12)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  // Content row
  var text = content || '(No data for this section)';
  sheet.getRange(row, 1, 1, cols).merge()
    .setValue(text)
    .setBackground(contentBg)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('top').setFontSize(11);
  var estHeight = Math.max(50, text.split('\n').length * 22);
  sheet.setRowHeight(row, estHeight);
  row++;

  return row;
}

// Write spacer row
function writeSpacer_(sheet, row, height) {
  sheet.setRowHeight(row, height || 10);
  return row + 1;
}


// Full-width stacked layout for AI Analysis sheet
function writeAiAnalysisSheetV2_(overallSections, recentSections, meta, recentCount, agentExport) {
  var sheet = getOrCreateSheet_('🤖 AI Analysis');
  sheet.clearContents();
  sheet.clearFormats();

  var COLS = 8;
  var row = 1;

  // Column widths (8 x 100 = 800px reading width)
  for (var c = 1; c <= COLS; c++) sheet.setColumnWidth(c, 100);

  // ── Title bar ──
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('🤖 AI ANALYSIS')
    .setBackground('#14a800').setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(16)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 42);
  row++;

  // ── Meta row ──
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue(meta || '')
    .setFontColor('#666666').setFontStyle('italic').setFontSize(10)
    .setBackground('#f5f5f5');
  sheet.setRowHeight(row, 24);
  row++;

  row = writeSpacer_(sheet, row, 6);

  // ── KEY TAKEAWAYS ──
  row = writeSection_(sheet, row, 'KEY TAKEAWAYS',
    findSection_(overallSections, 'KEY TAKEAWAYS'),
    '#2e7d32', '#ffffff', '#f1f8e9', COLS);
  row = writeSpacer_(sheet, row, 12);

  // ── Main analysis sections (blue) ──
  var blueSections = [
    'CLIENT PROFILE WINNERS VS LOSERS',
    'BUDGET AND RATE PATTERNS',
    'CATEGORY AND SKILLS PERFORMANCE',
    'CONNECT SPEND EFFECTIVENESS',
    'HOOK PATTERNS THAT CONVERT',
    'LOCATION AND TIMING PATTERNS'
  ];
  for (var b = 0; b < blueSections.length; b++) {
    row = writeSection_(sheet, row, blueSections[b],
      findSection_(overallSections, blueSections[b]),
      '#1565c0', '#ffffff', '#e3f2fd', COLS);
    row = writeSpacer_(sheet, row, 8);
  }

  row = writeSpacer_(sheet, row, 4);

  // ── THE GHOSTING PROBLEM (purple) ──
  row = writeSection_(sheet, row, 'THE GHOSTING PROBLEM',
    findSection_(overallSections, 'THE GHOSTING PROBLEM'),
    '#7b1fa2', '#ffffff', '#f3e5f5', COLS);
  row = writeSpacer_(sheet, row, 12);

  // ── TOP 5 ACTIONS (red) ──
  row = writeSection_(sheet, row, 'TOP 5 ACTIONS',
    findSection_(overallSections, 'TOP 5 ACTIONS'),
    '#c62828', '#ffffff', '#ffebee', COLS);
  row = writeSpacer_(sheet, row, 20);

  // ═══ DIVIDER ═══
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('')
    .setBackground('#424242');
  sheet.setRowHeight(row, 4);
  row++;
  row = writeSpacer_(sheet, row, 8);

  // ── RECENT N TITLE ──
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('📋 RECENT ' + recentCount + ' PROPOSALS — DEEP DIVE')
    .setBackground('#00695c').setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(14)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 38);
  row++;

  if (recentSections && Object.keys(recentSections).length > 0) {
    row = writeSpacer_(sheet, row, 6);

    // ── INDIVIDUAL VERDICTS (teal) ──
    row = writeSection_(sheet, row, 'INDIVIDUAL VERDICTS',
      findSection_(recentSections, 'INDIVIDUAL VERDICTS'),
      '#00897b', '#ffffff', '#e0f2f1', COLS);
    row = writeSpacer_(sheet, row, 8);

    // ── PATTERN DIAGNOSIS (teal) ──
    row = writeSection_(sheet, row, 'PATTERN DIAGNOSIS',
      findSection_(recentSections, 'PATTERN DIAGNOSIS'),
      '#00897b', '#ffffff', '#e0f2f1', COLS);
    row = writeSpacer_(sheet, row, 8);

    // ── WHAT TO CHANGE NEXT WEEK (orange) ──
    row = writeSection_(sheet, row, 'WHAT TO CHANGE NEXT WEEK',
      findSection_(recentSections, 'WHAT TO CHANGE NEXT WEEK'),
      '#e65100', '#ffffff', '#fff3e0', COLS);
  } else {
    row = writeSpacer_(sheet, row, 6);
    sheet.getRange(row, 1, 1, COLS).merge()
      .setValue('⚠️ Recent analysis could not be generated. Try running again.')
      .setFontColor('#c62828').setFontStyle('italic').setFontSize(11);
    sheet.setRowHeight(row, 30);
  }

  // ── AGENT EXPORT block ──
  if (agentExport) {
    row = writeSpacer_(sheet, row, 20);

    sheet.getRange(row, 1, 1, COLS).merge()
      .setValue('AGENT EXPORT — auto-fed to proposal agent')
      .setBackground('#424242').setFontColor('#ffffff')
      .setFontWeight('bold').setFontSize(11);
    sheet.setRowHeight(row, 28);
    row++;

    sheet.getRange(row, 1, 1, COLS).merge()
      .setValue(agentExport)
      .setBackground('#f5f5f5').setFontColor('#333333')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setVerticalAlignment('top').setFontSize(10)
      .setFontFamily('Roboto Mono');
    var exportHeight = Math.max(60, agentExport.split('\n').length * 20);
    sheet.setRowHeight(row, exportHeight);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Done! Check the 🤖 AI Analysis tab.', '🤖 AI Analysis', 5);
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
