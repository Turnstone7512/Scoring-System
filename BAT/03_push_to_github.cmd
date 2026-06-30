@echo off
cd /d E:\Programs\GitHub\Scoring-System

git status

git add .

set /p msg=Enter commit message:
git commit -m "%msg%"

git push origin main

echo Push completed.
pause