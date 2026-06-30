# Scoring System

Static frontend for the scoring system. The frontend can be deployed to GitHub Pages or another static host, and data is stored in Supabase.

## Deploy

1. Run required SQL files in Supabase SQL Editor when schema changes are included.
2. Deploy the root static files to GitHub Pages or upload `frontend-deploy.zip` to the selected static host.
3. Use a version query string such as `?v=YYYYMMDD-NNNN` after deployment to avoid browser cache.

## Change Log

| Version | Date | Summary |
| --- | --- | --- |
| 20260630-0050 | 2026-06-30 | 學生新增出生年欄位，身高體重 PR 年齡估算改為優先使用出生年。 |
| 20260630-0040 | 2026-06-30 | 新增學生性別註記，並於身高體重明細依性別與年級估算身高/體重 PR 百分位。 |
| 20260630-0030 | 2026-06-30 | 將身高體重折線圖 X 軸改為依量測日期間隔比例顯示。 |
| 20260630-0020 | 2026-06-30 | 將身高與體重折線圖改為上下分開顯示，讓兩者各自使用獨立比例尺。 |
| 20260630-0010 | 2026-06-30 | 新增 README 異動紀錄規則，並讓 GitHub push 批次檔自動帶入版號與簡要異動內容。 |
