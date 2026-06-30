@echo off
chcp 65001 >nul
set "REPO_DIR=E:\Programs\GitHub\Scoring-System"
cd /d "%REPO_DIR%"

set VERSION=20260630-0050
set CHANGE_SUMMARY=新增學生出生年並優先用於 PR 年齡估算
set COMMIT_MESSAGE=%VERSION% - %CHANGE_SUMMARY%

git -C "%REPO_DIR%" status

git -C "%REPO_DIR%" add -A

git -C "%REPO_DIR%" diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to commit.
  pause
  exit /b 0
)

echo Commit message: %COMMIT_MESSAGE%
git -C "%REPO_DIR%" commit -m "%COMMIT_MESSAGE%"

git -C "%REPO_DIR%" push origin main

echo Push completed.
pause
