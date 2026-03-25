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
    'Viewed?', 'Replied?', 'Closed?', 'Reason if Not Closed', 'Source URL',
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

// ── WEB APP: receives data from the bookmarklet ───────────
// Deploy as: Extensions → Apps Script → Deploy → New deployment
//   Type: Web app | Execute as: Me | Who has access: Anyone
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      data.date            || '',   // col 1
      data.jobTitle        || '',   // col 2
      data.category        || '',   // col 3
      data.jobType         || '',   // col 4
      data.budget          || '',   // col 5
      data.hoursPerWeek    || '',   // col 6
      data.experienceLevel || '',   // col 7
      data.duration        || '',   // col 8
      data.skills          || '',   // col 9
      '',                           // col 10 — Connects Required (retired; kept for existing data alignment)
      data.invite           || 'No', // col 11
      data.clientLocation   || '',   // col 12
      data.paymentVerified  || '',   // col 13
      data.clientRating     || '',   // col 14
      data.hireRate         || '',   // col 15
      data.clientSpent      || '',   // col 16
      data.jobsPosted       || '',   // col 17
      data.avgHourlyRate    || '',   // col 18
      data.memberSince      || '',   // col 19
      data.hook             || '',   // col 20 — WRAP
      data.proposal        || '',    // col 21
      data.connectsUsed    || '',    // col 22
      data.boostConnects   || '',    // col 23
      data.totalConnects   || '',    // col 24
      data.viewed          || '—',   // col 25
      data.replied         || '—',   // col 26
      data.closed          || '—',   // col 27
      data.reasonIfNot     || '',    // col 28
      data.sourceUrl       || '',    // col 29
      data.clientName      || '',    // col 30 — NEW
      data.company         || ''     // col 31 — NEW
    ]);
    var lastRow = sheet.getLastRow();
    var totalCols = sheet.getLastColumn();
    // Clip all cells so they don't expand row height
    sheet.getRange(lastRow, 1, 1, totalCols).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    // Hook is column 20 — wrap it so row height fits the hook text
    sheet.getRange(lastRow, 20).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.autoResizeRow(lastRow);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
