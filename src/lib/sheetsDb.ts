import { RateCard, Project, TimesheetEntry, ProjectTeamMember } from '../types';

export interface SheetIdentity {
  name?: string;
  email?: string;
}

// Default spreadsheet ID that can be overridden
export const DEFAULT_SPREADSHEET_ID = '';

export const SHEET_TABS = {
  ENTRIES: 'Timesheet Logs',
  PROJECTS: 'Projects',
  RATE_CARDS: 'Rate Cards',
  CLIENTS: 'Clients',
  MEMBERS: 'Members',
  ROLES: 'Roles',
  EXECUTIVE_SUMMARY: 'Executive Summary',
};

// Helper to delay for backoff
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Robust fetch with exponential backoff for transient Google API errors (503, 500, 502, 504, 429)
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, options);
      
      // If successful or client authentication error (401/403/404), return immediately
      if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) {
        return res;
      }

      // Retry only on transient errors: 429 (rate limit), 500, 502, 503, 504
      const isTransient = [429, 500, 502, 503, 504].includes(res.status);
      if (!isTransient || attempt === maxRetries - 1) {
        return res;
      }

      // Exponential backoff with jitter: attempt 0 -> ~600ms, attempt 1 -> ~1500ms, attempt 2 -> ~3000ms
      const baseDelay = Math.pow(2, attempt) * 600;
      const jitter = Math.random() * 250;
      await sleep(baseDelay + jitter);
      attempt++;
    } catch (err: any) {
      if (attempt === maxRetries - 1) {
        throw err;
      }
      const baseDelay = Math.pow(2, attempt) * 600;
      const jitter = Math.random() * 250;
      await sleep(baseDelay + jitter);
      attempt++;
    }
  }
  return fetch(url, options);
}

// Helper to check for expired/invalid credentials and format API errors cleanly
async function handleResponse(res: Response) {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Google authorization has expired or is insufficient. Please click "Reconnect" to renew access.');
    }
    if (res.status === 503) {
      throw new Error('Google Sheets is temporarily unavailable (503). Local changes are preserved and will retry on next sync.');
    }
    if (res.status === 429) {
      throw new Error('Google Sheets API rate limit reached. Retrying shortly...');
    }
    const errText = await res.text().catch(() => '');
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) {
        throw new Error(`Google Sheets API (${res.status}): ${parsed.error.message}`);
      }
    } catch (e: any) {
      if (e?.message && e.message.startsWith('Google Sheets API')) throw e;
    }
    throw new Error(`Google Sheets API error (${res.status}): ${errText || res.statusText}`);
  }
  return res.json();
}

// 1. Ensure all sheet tabs exist in the spreadsheet
export async function ensureSheetTabs(token: string, spreadsheetId: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetchWithRetry(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const spreadSheetData = await handleResponse(response);
  const existingTitles = spreadSheetData.sheets?.map((s: any) => s.properties?.title) || [];

  const tabsToCreate = Object.values(SHEET_TABS).filter((title) => !existingTitles.includes(title));

  if (tabsToCreate.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const requests = tabsToCreate.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    const createResponse = await fetchWithRetry(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
    await handleResponse(createResponse);

    // Initialize headers on newly created tabs
    const headerInitializers: Promise<void>[] = [];
    if (tabsToCreate.includes(SHEET_TABS.CLIENTS)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.CLIENTS}'!A1`, [['Client Name']]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.MEMBERS)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.MEMBERS}'!A1`, [['Team Member Name']]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.ROLES)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.ROLES}'!A1`, [['Role Name']]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.RATE_CARDS)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.RATE_CARDS}'!A1`, [[
          'Rate Card ID',
          'Rate Card Name',
          'Roles Cost Configuration (JSON)',
          'Client Name',
        ]]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.PROJECTS)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.PROJECTS}'!A1`, [[
          'Project ID',
          'Project Name',
          'Client Name',
          'Rate Card ID',
          'Team Members (JSON)',
          'Scope Backlog',
          'Discount (£)',
          'Expense (£)',
          'Start Date',
          'End Date',
          'Is Non-Billable (true/false)',
          'Created By',
          'Is Completed (true/false)',
        ]]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.ENTRIES)) {
      headerInitializers.push(
        writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.ENTRIES}'!A1`, [[
          'Entry ID',
          'Project ID',
          'Team Member',
          'Hours Logged',
          'Date of Log',
          'Accomplishment Narrative',
          'Logged By (Name)',
          'Logged By (Email)',
          'Role ID',
          'Role Name',
          'Day Rate',
          'Last Synchronized Timestamp',
        ]]).catch(() => {})
      );
    }
    if (tabsToCreate.includes(SHEET_TABS.EXECUTIVE_SUMMARY)) {
      headerInitializers.push(
        writeExecutiveSummaryTemplate(token, spreadsheetId).catch(() => {})
      );
    }
    if (headerInitializers.length > 0) {
      await Promise.all(headerInitializers);
    }
  }

  // Ensure Executive Summary has formula template initialized even if tab was created previously
  try {
    const execRows = await readSheetRange(token, spreadsheetId, `'${SHEET_TABS.EXECUTIVE_SUMMARY}'!A1:A3`);
    const cellA1 = String(execRows?.[0]?.[0] || '').toUpperCase();
    const isUpgraded = cellA1.includes('UPLIFT PARTNERSHIP');
    if (!isUpgraded) {
      await writeExecutiveSummaryTemplate(token, spreadsheetId);
    }
  } catch (err) {
    // Non-blocking fallback
  }
}

// Writes native Google Sheets formulas and executive dashboard into the Executive Summary tab
export async function writeExecutiveSummaryTemplate(token: string, spreadsheetId: string): Promise<void> {
  // 1. Wipe existing content in Executive Summary to prevent residual spill overlaps
  await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.EXECUTIVE_SUMMARY}'!A1:Z500`).catch(() => {});

  // 2. Build rows for the sheet
  const summaryRows: any[][] = [];

  // Row 1: Executive Title Header
  summaryRows.push([
    'THE UPLIFT PARTNERSHIP — EXECUTIVE PORTFOLIO & FINANCIAL SUMMARY',
    ...Array(22).fill(''),
  ]);

  // Row 2: Subtitle
  summaryRows.push([
    'Live corporate performance dashboard connected to Timesheet Logs & Project Registry. Figures calculate in real time.',
    ...Array(22).fill(''),
  ]);

  // Row 3: Meta info
  summaryRows.push([
    'Last Refreshed:',
    '=NOW()',
    '',
    'System Status:',
    'LIVE & SYNCED',
    ...Array(18).fill(''),
  ]);

  // Row 4: Blank spacer
  summaryRows.push(Array(23).fill(''));

  // Row 5: KPI Section Header
  summaryRows.push([
    'EXECUTIVE PORTFOLIO KPIs (ACROSS ALL PROJECTS)',
    ...Array(22).fill(''),
  ]);

  // Row 6: KPI Column Headers
  summaryRows.push([
    'Key Metric Description',
    'Live Value',
    'Unit / Currency',
    'Primary Source Reference',
    ...Array(19).fill(''),
  ]);

  // Rows 7-12: The 6 Core Executive KPIs
  summaryRows.push([
    'Total Gross Billable Spend (Day Rates / 7)',
    "=IFERROR(SUMPRODUCT('Timesheet Logs'!D2:D, 'Timesheet Logs'!K2:K) / 7, 0)",
    'GBP (£)',
    "'Timesheet Logs'!D:D * K:K / 7",
    ...Array(19).fill(''),
  ]);
  summaryRows.push([
    'Total Project Delivery Hours Logged',
    "=IFERROR(SUM('Timesheet Logs'!D2:D), 0)",
    'Hours (hrs)',
    "'Timesheet Logs'!D:D",
    ...Array(19).fill(''),
  ]);
  summaryRows.push([
    'Active / In-Flight Client Projects',
    '=IFERROR(COUNTIF(\'Projects\'!M2:M, FALSE) + COUNTIF(\'Projects\'!M2:M, "false") + COUNTIF(\'Projects\'!M2:M, "FALSE"), 0)',
    'Live Engagements',
    "'Projects'!M:M",
    ...Array(19).fill(''),
  ]);
  summaryRows.push([
    'Completed / Approved Engagements',
    '=IFERROR(COUNTIF(\'Projects\'!M2:M, TRUE) + COUNTIF(\'Projects\'!M2:M, "true") + COUNTIF(\'Projects\'!M2:M, "TRUE"), 0)',
    'Closed Projects',
    "'Projects'!M:M",
    ...Array(19).fill(''),
  ]);
  summaryRows.push([
    'Total Registered Projects in Portfolio',
    "=IFERROR(COUNTA('Projects'!A2:A), 0)",
    'Portfolio Count',
    "'Projects'!A:A",
    ...Array(19).fill(''),
  ]);
  summaryRows.push([
    'Total Timesheet Audit Submissions',
    "=IFERROR(COUNTA('Timesheet Logs'!A2:A), 0)",
    'Entries Logged',
    "'Timesheet Logs'!A:A",
    ...Array(19).fill(''),
  ]);

  // Row 13: Spacer
  summaryRows.push(Array(23).fill(''));

  // Row 14: Panel Headers (Side by side!)
  // Columns A-K (0-10): Panel 1 - Project Performance (CEO View)
  // Column L (11): Spacer
  // Columns M-Q (12-16): Panel 2 - Team Member Capacity Breakdown
  // Column R (17): Spacer
  // Columns S-W (18-22): Panel 3 - Recent Activity Timeline
  const row14 = Array(23).fill('');
  row14[0] = 'PROJECT DELIVERY STATUS & FINANCIAL PERFORMANCE (CEO VIEW)';
  row14[12] = 'TEAM MEMBER RECORDED CAPACITY & LOGS BREAKDOWN';
  row14[18] = 'RECENT AUDIT ACTIVITY (LAST 20 TIMESHEET LOGS)';
  summaryRows.push(row14);

  // Row 15: Table Headers & Queries
  const row15 = Array(23).fill('');
  // Table 1 headers
  row15[0] = 'Project Name';
  row15[1] = 'Client Name';
  row15[2] = 'Delivery Status';
  row15[3] = 'Billing Category';
  row15[4] = 'Start Date';
  row15[5] = 'End Date';
  row15[6] = 'Hours Logged';
  row15[7] = 'Gross Spend (£)';
  row15[8] = 'Expense (£)';
  row15[9] = 'Discount (£)';
  row15[10] = 'Net Total Burn (£)';
  // Table 2 query in cell M15 (Col index 12)
  row15[12] = '=IFERROR(QUERY(\'Timesheet Logs\'!A1:L, "SELECT C, SUM(D), COUNT(A), MIN(E), MAX(E) WHERE C IS NOT NULL AND C != \'Team Member\' GROUP BY C ORDER BY SUM(D) DESC LABEL C \'Team Member\', SUM(D) \'Total Hours Logged\', COUNT(A) \'Total Submissions\', MIN(E) \'Earliest Log\', MAX(E) \'Most Recent Log\' FORMAT SUM(D) \'#,##0.0\', MIN(E) \'yyyy-mm-dd\', MAX(E) \'yyyy-mm-dd\'", 1), "No logged timesheet activity yet")';
  // Table 3 query in cell S15 (Col index 18)
  row15[18] = '=IFERROR(QUERY(\'Timesheet Logs\'!A1:L, "SELECT E, C, B, D, F WHERE E IS NOT NULL AND E != \'Date\' ORDER BY E DESC LIMIT 20 LABEL E \'Date\', C \'Team Member\', B \'Project ID\', D \'Hours Logged\', F \'Accomplishment Narrative\' FORMAT E \'yyyy-mm-dd\', D \'#,##0.0\'", 1), "No activity timeline logs yet")';
  summaryRows.push(row15);

  // Rows 16 to 65: Individual project rows (capacity for 50 projects)
  for (let r = 16; r <= 65; r++) {
    const pIdx = r - 14; // pIdx = 2, 3, 4, ... corresponds to row in 'Projects' sheet
    const row = Array(23).fill('');
    row[0] = `=IF('Projects'!$A$${pIdx}="", "", 'Projects'!$B$${pIdx})`;
    row[1] = `=IF('Projects'!$A$${pIdx}="", "", 'Projects'!$C$${pIdx})`;
    row[2] = `=IF('Projects'!$A$${pIdx}="", "", IF(OR('Projects'!$M$${pIdx}=TRUE, 'Projects'!$M$${pIdx}="true", 'Projects'!$M$${pIdx}="TRUE"), "Completed", "Active"))`;
    row[3] = `=IF('Projects'!$A$${pIdx}="", "", IF(OR('Projects'!$K$${pIdx}=TRUE, 'Projects'!$K$${pIdx}="true", 'Projects'!$K$${pIdx}="TRUE"), "Non-Billable", "Billable"))`;
    row[4] = `=IF('Projects'!$A$${pIdx}="", "", 'Projects'!$I$${pIdx})`;
    row[5] = `=IF('Projects'!$A$${pIdx}="", "", 'Projects'!$J$${pIdx})`;
    row[6] = `=IF('Projects'!$A$${pIdx}="", "", IFERROR(SUMIF('Timesheet Logs'!$B:$B, 'Projects'!$A$${pIdx}, 'Timesheet Logs'!$D:$D), 0))`;
    row[7] = `=IF('Projects'!$A$${pIdx}="", "", IFERROR(SUMPRODUCT(('Timesheet Logs'!$B:$B = 'Projects'!$A$${pIdx}) * ('Timesheet Logs'!$D:$D) * ('Timesheet Logs'!$K:$K) / 7), 0))`;
    row[8] = `=IF('Projects'!$A$${pIdx}="", "", IFERROR('Projects'!$H$${pIdx}, 0))`;
    row[9] = `=IF('Projects'!$A$${pIdx}="", "", IFERROR('Projects'!$G$${pIdx}, 0))`;
    row[10] = `=IF('Projects'!$A$${pIdx}="", "", IFERROR(H${r} + I${r} - J${r}, 0))`;
    summaryRows.push(row);
  }

  // Row 66: Portfolio Totals Summary row
  const totalRow = Array(23).fill('');
  totalRow[0] = 'PORTFOLIO TOTALS (ALL ACTIVE ROWS)';
  totalRow[6] = '=SUM(G16:G65)';
  totalRow[7] = '=SUM(H16:H65)';
  totalRow[8] = '=SUM(I16:I65)';
  totalRow[9] = '=SUM(J16:J65)';
  totalRow[10] = '=SUM(K16:K65)';
  summaryRows.push(totalRow);

  // 3. Write all values into Google Sheets
  await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.EXECUTIVE_SUMMARY}'!A1`, summaryRows);

  // 4. Apply executive styling & column sizing via batchUpdate
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metaRes = await fetchWithRetry(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const spreadSheetData = await handleResponse(metaRes);
    const execSheet = spreadSheetData.sheets?.find(
      (s: any) => s.properties?.title === SHEET_TABS.EXECUTIVE_SUMMARY
    );
    const sheetId = execSheet?.properties?.sheetId;

    if (sheetId !== undefined) {
      const requests: any[] = [
        // Title Bar (Row 1): Dark Slate, White Bold Text
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 23 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 13 },
                padding: { top: 6, bottom: 6, left: 8, right: 8 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,padding)',
          },
        },
        // Subtitle (Row 2): Dark Navy tint
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 23 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 30 / 255, green: 41 / 255, blue: 59 / 255 },
                textFormat: { foregroundColor: { red: 148 / 255, green: 163 / 255, blue: 184 / 255 }, italic: true, fontSize: 9 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // KPI Header (Row 5): Uplift Accent Orange
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 4 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 245 / 255, green: 114 / 255, blue: 10 / 255 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // KPI Column Headers (Row 6): Slate Gray
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 4 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 241 / 255, green: 245 / 255, blue: 249 / 255 },
                textFormat: { foregroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 }, bold: true, fontSize: 9 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Section Banners (Row 14): Dark Slate background
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 0, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 12, endColumnIndex: 17 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 18, endColumnIndex: 23 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Table 1 Header (Row 15, Cols A-K): Light Slate with bold text
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 14, endRowIndex: 15, startColumnIndex: 0, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 226 / 255, green: 232 / 255, blue: 240 / 255 },
                textFormat: { foregroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 }, bold: true, fontSize: 9 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Currency formatting for Table 1 (Cols H, I, J, K from row 16 to 66)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 15, endRowIndex: 66, startColumnIndex: 7, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'CURRENCY', pattern: '£#,##0.00' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Hours formatting for Table 1 (Col G from row 16 to 66)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 15, endRowIndex: 66, startColumnIndex: 6, endColumnIndex: 7 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '#,##0.0' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Date formatting for Table 1 (Cols E, F from row 16 to 66)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 15, endRowIndex: 66, startColumnIndex: 4, endColumnIndex: 6 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Total row styling (Row 66): Slate gray bold
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 65, endRowIndex: 66, startColumnIndex: 0, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 241 / 255, green: 245 / 255, blue: 249 / 255 },
                textFormat: { foregroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 }, bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Column Widths
        ...([
          { col: 0, width: 200 }, // Project Name
          { col: 1, width: 160 }, // Client Name
          { col: 2, width: 105 }, // Delivery Status
          { col: 3, width: 105 }, // Billing Category
          { col: 4, width: 95 },  // Start Date
          { col: 5, width: 95 },  // End Date
          { col: 6, width: 95 },  // Hours Logged
          { col: 7, width: 120 }, // Gross Spend
          { col: 8, width: 95 },  // Expense
          { col: 9, width: 95 },  // Discount
          { col: 10, width: 120 },// Net Burn
          { col: 11, width: 25 }, // Spacer
          { col: 12, width: 150 },// Team Member
          { col: 13, width: 110 },// Total Hours
          { col: 14, width: 110 },// Total Submissions
          { col: 15, width: 100 },// Earliest Log
          { col: 16, width: 100 },// Most Recent Log
          { col: 17, width: 25 }, // Spacer
          { col: 18, width: 95 }, // Date
          { col: 19, width: 120 },// Team Member
          { col: 20, width: 100 },// Project ID
          { col: 21, width: 85 }, // Hours Logged
          { col: 22, width: 280 },// Accomplishment Narrative
        ].map((w) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: w.col, endIndex: w.col + 1 },
            properties: { pixelSize: w.width },
            fields: 'pixelSize',
          },
        }))),
      ];

      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      await fetchWithRetry(batchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    }
  } catch (styleErr) {
    console.warn('Executive Summary style batchUpdate non-blocking fallback:', styleErr);
  }
}

// Helper to clear spreadsheet range
export async function clearSheetRange(token: string, spreadsheetId: string, range: string): Promise<void> {
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  const response = await fetchWithRetry(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse(response);
}

// Helper to write values to range
export async function writeSheetRange(token: string, spreadsheetId: string, range: string, values: any[][]): Promise<void> {
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetchWithRetry(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  await handleResponse(response);
}

// Helper to read values from range
export async function readSheetRange(token: string, spreadsheetId: string, range: string): Promise<any[][]> {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetchWithRetry(readUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse(response);
  return data.values || [];
}

// ==================== TIMESHEET ENTRIES SYNC ====================

export async function fetchEntriesFromSheet(token: string, spreadsheetId: string): Promise<TimesheetEntry[]> {
  const rows = await readSheetRange(token, spreadsheetId, `'${SHEET_TABS.ENTRIES}'!A1:L10000`);
  if (rows.length <= 1) return []; // Only headers or empty

  const [_, ...dataRows] = rows;
  return dataRows
    .filter((row) => row && row[0]) // Ensure row has valid ID
    .map((row) => {
      const hoursNum = Number(row[3]);
      return {
        id: String(row[0] || ''),
        projectId: String(row[1] || ''),
        teamMember: String(row[2] || ''),
        hours: isNaN(hoursNum) ? 0 : Math.max(0, hoursNum),
        date: String(row[4] || ''),
        description: String(row[5] || ''),
        loggedByName: row[6] ? String(row[6]) : undefined,
        loggedByEmail: row[7] ? String(row[7]) : undefined,
        roleId: row[8] ? String(row[8]) : undefined,
        roleName: row[9] ? String(row[9]) : undefined,
        dayRate: row[10] !== undefined && row[10] !== '' && !isNaN(Number(row[10])) ? Number(row[10]) : undefined,
      };
    });
}

export async function writeEntriesToSheet(token: string, spreadsheetId: string, entries: TimesheetEntry[]): Promise<void> {
  const headers = [
    'Entry ID',
    'Project ID',
    'Team Member',
    'Hours Logged',
    'Date of Log',
    'Accomplishment Narrative',
    'Logged By (Name)',
    'Logged By (Email)',
    'Role ID',
    'Role Name',
    'Day Rate',
    'Last Synchronized Timestamp',
  ];

  const nowIso = new Date().toISOString();
  const rows = entries.map((e) => [
    e.id,
    e.projectId,
    e.teamMember,
    e.hours,
    e.date,
    e.description,
    e.loggedByName || '',
    e.loggedByEmail || '',
    e.roleId || '',
    e.roleName || '',
    e.dayRate !== undefined ? e.dayRate : '',
    nowIso,
  ]);

  // Execute clear first, then write sequentially to prevent race conditions
  await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.ENTRIES}'!A1:L10000`);
  await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.ENTRIES}'!A1`, [headers, ...rows]);
}

// Helper to parse boolean values from Google Sheets (handles boolean TRUE/FALSE, 'true', 'TRUE', 'True', '1', 'yes')
export const parseBooleanValue = (val: any): boolean => {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 't';
  }
  return false;
};

// ==================== PROJECTS SYNC ====================

export async function fetchProjectsFromSheet(token: string, spreadsheetId: string): Promise<Project[]> {
  const rows = await readSheetRange(token, spreadsheetId, `'${SHEET_TABS.PROJECTS}'!A1:Z10000`);
  if (rows.length <= 1) return [];

  const [headerRow, ...dataRows] = rows;

  // Build dynamic column map from header names to handle any column ordering or missing header variations
  const colMap: Record<string, number> = {};
  if (Array.isArray(headerRow)) {
    headerRow.forEach((h: any, idx: number) => {
      if (typeof h === 'string') {
        const clean = h.trim().toLowerCase();
        colMap[clean] = idx;
      }
    });
  }

  const getIdx = (candidates: string[], fallbackIdx: number): number => {
    for (const c of candidates) {
      if (colMap[c.toLowerCase()] !== undefined) return colMap[c.toLowerCase()];
    }
    for (const c of candidates) {
      const foundKey = Object.keys(colMap).find((k) => k.includes(c.toLowerCase()));
      if (foundKey !== undefined) return colMap[foundKey];
    }
    return fallbackIdx;
  };

  const idIdx = getIdx(['project id', 'id'], 0);
  const nameIdx = getIdx(['project name', 'name'], 1);
  const clientIdx = getIdx(['client name', 'client'], 2);
  const rateCardIdx = getIdx(['rate card id', 'ratecardid', 'rate card'], 3);
  const teamMembersIdx = getIdx(['team members (json)', 'team members', 'members'], 4);
  const scopeIdx = getIdx(['scope backlog', 'scope', 'backlog'], 5);
  const discountIdx = getIdx(['discount (£)', 'discount'], 6);
  const expenseIdx = getIdx(['expense (£)', 'expense'], 7);
  const startDateIdx = getIdx(['start date', 'start'], 8);
  const endDateIdx = getIdx(['end date', 'end'], 9);
  const nonBillableIdx = getIdx(['is non-billable (true/false)', 'is non-billable', 'non-billable', 'nonbillable'], 10);
  const createdByIdx = getIdx(['created by', 'creator'], 11);
  const completedIdx = getIdx(['is completed (true/false)', 'is completed', 'completed', 'done', 'status'], 12);

  return dataRows
    .filter((row) => row && row[idIdx])
    .map((row) => {
      let teamMembers: ProjectTeamMember[] = [];
      try {
        const rawTm = row[teamMembersIdx];
        teamMembers = rawTm ? JSON.parse(rawTm) : [];
        if (!Array.isArray(teamMembers)) teamMembers = [];
      } catch (e) {
        console.error('Failed to parse team members from row', row, e);
      }

      return {
        id: String(row[idIdx] || ''),
        name: String(row[nameIdx] || ''),
        clientName: String(row[clientIdx] || ''),
        rateCardId: String(row[rateCardIdx] || ''),
        teamMembers,
        scopeBacklog: String(row[scopeIdx] || ''),
        discount: row[discountIdx] && !isNaN(Number(row[discountIdx])) ? Number(row[discountIdx]) : undefined,
        expense: row[expenseIdx] && !isNaN(Number(row[expenseIdx])) ? Number(row[expenseIdx]) : undefined,
        startDate: row[startDateIdx] ? String(row[startDateIdx]) : undefined,
        endDate: row[endDateIdx] ? String(row[endDateIdx]) : undefined,
        isNonBillable: parseBooleanValue(row[nonBillableIdx]),
        createdBy: row[createdByIdx] ? String(row[createdByIdx]) : undefined,
        isCompleted: parseBooleanValue(row[completedIdx]),
      };
    });
}

export async function writeProjectsToSheet(token: string, spreadsheetId: string, projects: Project[]): Promise<void> {
  const headers = [
    'Project ID',
    'Project Name',
    'Client Name',
    'Rate Card ID',
    'Team Members (JSON)',
    'Scope Backlog',
    'Discount (£)',
    'Expense (£)',
    'Start Date',
    'End Date',
    'Is Non-Billable (true/false)',
    'Created By',
    'Is Completed (true/false)',
  ];

  const rows = projects.map((p) => [
    p.id,
    p.name,
    p.clientName,
    p.rateCardId,
    JSON.stringify(p.teamMembers || []),
    p.scopeBacklog || '',
    p.discount !== undefined ? p.discount : '',
    p.expense !== undefined ? p.expense : '',
    p.startDate || '',
    p.endDate || '',
    p.isNonBillable ? 'TRUE' : 'FALSE',
    p.createdBy || '',
    p.isCompleted ? 'TRUE' : 'FALSE',
  ]);

  await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.PROJECTS}'!A1:Z10000`);
  await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.PROJECTS}'!A1`, [headers, ...rows]);
}

// ==================== RATE CARDS SYNC ====================

export async function fetchRateCardsFromSheet(token: string, spreadsheetId: string): Promise<RateCard[]> {
  const rows = await readSheetRange(token, spreadsheetId, `'${SHEET_TABS.RATE_CARDS}'!A1:D10000`);
  if (rows.length <= 1) return [];

  const [_, ...dataRows] = rows;
  return dataRows
    .filter((row) => row && row[0])
    .map((row) => {
      let roles = [];
      try {
        roles = row[2] ? JSON.parse(row[2]) : [];
        if (!Array.isArray(roles)) roles = [];
      } catch (e) {
        console.error('Failed to parse roles from rate card row', row, e);
      }

      return {
        id: String(row[0] || ''),
        name: String(row[1] || ''),
        roles,
        clientName: row[3] ? String(row[3]) : undefined,
      };
    });
}

export async function writeRateCardsToSheet(token: string, spreadsheetId: string, cards: RateCard[]): Promise<void> {
  const headers = [
    'Rate Card ID',
    'Rate Card Name',
    'Roles Cost Configuration (JSON)',
    'Client Name',
  ];

  const rows = cards.map((c) => [
    c.id,
    c.name,
    JSON.stringify(c.roles || []),
    c.clientName || '',
  ]);

  await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.RATE_CARDS}'!A1:D10000`);
  await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.RATE_CARDS}'!A1`, [headers, ...rows]);
}

// ==================== CLIENTS, MEMBERS, ROLES SYNC ====================

export async function fetchMetadataFromSheet(
  token: string,
  spreadsheetId: string
): Promise<{ clients: string[]; members: string[]; roles: string[] }> {
  const [clientsRows, membersRows, rolesRows] = await Promise.all([
    readSheetRange(token, spreadsheetId, `'${SHEET_TABS.CLIENTS}'!A1:A500`).catch(() => []),
    readSheetRange(token, spreadsheetId, `'${SHEET_TABS.MEMBERS}'!A1:A500`).catch(() => []),
    readSheetRange(token, spreadsheetId, `'${SHEET_TABS.ROLES}'!A1:A500`).catch(() => []),
  ]);

  const parseColumn = (rows: any[][]) => {
    if (!rows || rows.length === 0) return [];
    const firstCell = String(rows[0]?.[0] || '').trim().toLowerCase();
    const isHeader =
      firstCell.includes('name') ||
      firstCell.includes('header') ||
      firstCell.includes('title') ||
      firstCell.includes('member') ||
      firstCell.includes('client') ||
      firstCell.includes('role');
    const dataRows = isHeader ? rows.slice(1) : rows;
    return dataRows
      .map((row) => (row[0] ? String(row[0]).trim() : ''))
      .filter(Boolean);
  };

  return {
    clients: parseColumn(clientsRows),
    members: parseColumn(membersRows),
    roles: parseColumn(rolesRows),
  };
}

export async function writeMetadataToSheet(
  token: string,
  spreadsheetId: string,
  data: { clients?: string[]; members?: string[]; roles?: string[] }
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (data.clients !== undefined) {
    tasks.push((async () => {
      const clientHeaders = ['Client Name'];
      const clientRows = (data.clients || []).map((c) => [c]);
      await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.CLIENTS}'!A1:A500`);
      await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.CLIENTS}'!A1`, [clientHeaders, ...clientRows]);
    })());
  }

  if (data.members !== undefined) {
    tasks.push((async () => {
      const memberHeaders = ['Team Member Name'];
      const memberRows = (data.members || []).map((m) => [m]);
      await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.MEMBERS}'!A1:A500`);
      await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.MEMBERS}'!A1`, [memberHeaders, ...memberRows]);
    })());
  }

  if (data.roles !== undefined) {
    tasks.push((async () => {
      const roleHeaders = ['Role Name'];
      const roleRows = (data.roles || []).map((r) => [r]);
      await clearSheetRange(token, spreadsheetId, `'${SHEET_TABS.ROLES}'!A1:A500`);
      await writeSheetRange(token, spreadsheetId, `'${SHEET_TABS.ROLES}'!A1`, [roleHeaders, ...roleRows]);
    })());
  }

  await Promise.all(tasks);
}
