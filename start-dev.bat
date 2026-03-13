@echo off
echo ==========================================
echo    PromptHunter WebApp - Dev Start Script
echo ==========================================

echo [1/3] Checking dependencies (npm install)...
call npm install 2>> error.log
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed! See error.log for details.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Starting Frontend (Vite)...
:: Runs 'npm run dev'. Errors are captured in error.log. If it crashes, it outputs a message and pauses to keep window open.
start "Vite Frontend" cmd /k "npm run dev 2>> error.log || (echo [CRASH] Frontend failed. Check error.log & pause)"

echo Done! The frontend server is starting up in a separate window. Allow it a moment to initialize.
