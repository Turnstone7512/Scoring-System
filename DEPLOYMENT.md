# Deployment Layout

The project is now split by deployment target.

## `frontend/`

Netlify static site.

- HTML/CSS/JS pages
- `api-client.js` adapts the existing `/api/*` calls
- `netlify.toml` proxies `/api/*` to Google Apps Script

Deploy this folder to Netlify. If you connect the whole repository, set Netlify's base directory to `frontend` and publish directory to `.`.

## `google-apps-script/`

Google Apps Script backend.

- `Code.gs` handles the former `/api/*` routes
- Data is stored in Google Sheets
- Write operations use `LockService`
- Audit logs are written to the `AuditLogs` sheet

Paste `Code.gs` into Apps Script, set the `SPREADSHEET_ID` script property, run `setup()`, and deploy as a Web App.

## Legacy root files

The original Node.js + Prisma implementation remains in the repository root for reference while the new Netlify + Apps Script version is verified.
