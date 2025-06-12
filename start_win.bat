@echo off
echo [START] Starting Docker containers...
for /f "tokens=2 delims==" %%A in ('findstr ^ENVIRONMENT= .env') do set ENVIRONMENT=%%A
if /I "%ENVIRONMENT%"=="instant" (
  docker compose up -d api client-admin
) else (
  docker compose up -d
)
echo.
echo Kouchou-AI is now running!
if /I "%ENVIRONMENT%" NEQ "instant" (
  echo   http://localhost:3000 - Report Viewer
)
echo   http://localhost:4000 - Admin Panel
pause