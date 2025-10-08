@echo off
setlocal EnableExtensions

echo [STEP] CD TO PROJECT\QUASAR-PROJECT
cd /d "%~dp0project\quasar-project" || (
  echo [ERROR] COULD NOT CD TO "%~dp0project\quasar-project"
  goto :cleanup
)

echo [STEP] INSTALL DEPENDENCIES (npm ci -> fallback npm install)
if exist package-lock.json (
  call npm ci --no-fund --no-audit
  if errorlevel 1 (
    echo [WARN] npm ci FAILED, FALLING BACK TO npm install...
    call npm install --no-fund --no-audit
  )
) else (
  call npm install --no-fund --no-audit
)

echo [STEP] INSTALL PINIA IF MISSING
if not exist "node_modules\pinia\package.json" (
  call npm i pinia@latest --save
) else (
  echo [INFO] Pinia already installed.
)

echo [OK] ALL DONE. START DEV SERVER WITH: npm run dev

:cleanup
echo [STEP] SELF-DELETE THIS SCRIPT
rem USE POWERSHELL DELAY TO AVOID FILE LOCKING
start "" /b powershell -NoProfile -Command "Start-Sleep -Milliseconds 800; Remove-Item -LiteralPath '%~f0' -Force" >nul 2>&1

endlocal
