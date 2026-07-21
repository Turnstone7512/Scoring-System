@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

set "REPO_DIR=E:\Programs\GitHub\Scoring-System"
set "VERSION=20260721-0060"
set "CHANGE_SUMMARY_B64=6Kq/5pW06Lqr6auY6auU6YeN5YmN5qyh5beuM+WAi+aciOmZkOWItg=="
set "COMMIT_MSG_FILE=%TEMP%\scoring-system-commit-message.txt"

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

powershell -NoProfile -ExecutionPolicy Bypass -Command "$summary=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:CHANGE_SUMMARY_B64)); $message=$env:VERSION + ' - ' + $summary; [IO.File]::WriteAllText($env:COMMIT_MSG_FILE, $message, (New-Object Text.UTF8Encoding $false)); Write-Host ('Commit message: ' + $message)"
if errorlevel 1 (
  echo Failed to prepare commit message.
  pause
  exit /b 1
)

git -C "%REPO_DIR%" commit -F "%COMMIT_MSG_FILE%"

git -C "%REPO_DIR%" push origin main

echo Push completed.
pause
