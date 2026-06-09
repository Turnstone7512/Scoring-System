# Scoring System Google Apps Script Backend

This folder is the Google Apps Script backend. It stores data in Google Sheets.

## Setup

1. Create a Google Sheet.
2. Open Extensions > Apps Script.
3. Paste `Code.gs` into the script editor.
4. Set Script property `SPREADSHEET_ID` to your Google Sheet ID.
5. Run `setup()` once and grant permissions.
6. Deploy > New deployment > Web app.
7. Execute as: yourself.
8. Who has access: choose the users who should use the system, or your organization.
9. Copy the Web App deployment ID into `../frontend/netlify.toml`.

The script creates these sheets automatically:

- `Students`
- `ScoreItems`
- `ScoreTransactions`
- `AuditLogs`
- `UserAccounts`

Use Google Sheets version history or scheduled exports for backup.
