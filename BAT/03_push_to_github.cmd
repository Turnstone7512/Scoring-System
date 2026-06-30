@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "REPO_DIR=E:\Programs\GitHub\Scoring-System"
set "VERSION=20260630-0200"
set "CHANGE_SUMMARY=BMI折線圖移除空括號"
set "COMMIT_MESSAGE=%VERSION% - %CHANGE_SUMMARY%"

cd /d "%REPO_DIR%"
if errorlevel 1 (
  echo Cannot open repo directory: %REPO_DIR%
  pause
  exit /b 1
)

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
