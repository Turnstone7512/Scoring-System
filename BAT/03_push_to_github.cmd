@echo off
chcp 65001 >nul
cd /d E:\Programs\GitHub\Scoring-System

set VERSION=20260630-0050
set CHANGE_SUMMARY=新增學生出生年並優先用於 PR 年齡估算
set COMMIT_MESSAGE=%VERSION% - %CHANGE_SUMMARY%

git status

git add .

git diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to commit.
  pause
  exit /b 0
)

echo Commit message: %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"

git push origin main

echo Push completed.
pause
