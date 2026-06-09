# Scoring System Frontend

This folder is the Netlify static site.

## Deploy

1. Deploy this `frontend` folder to Netlify.
2. Deploy `../google-apps-script/Code.gs` as a Google Apps Script Web App.
3. Replace `YOUR_APPS_SCRIPT_DEPLOYMENT_ID` in `netlify.toml`.
4. Publish again.

Netlify serves the HTML/CSS/JS files and proxies `/api/*` requests to Google Apps Script. This proxy is important because direct browser calls to Apps Script can run into CORS restrictions.

For local testing, use Netlify CLI from this folder so the rewrite rules are active.
