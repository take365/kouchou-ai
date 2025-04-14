@echo off
setlocal enabledelayedexpansion

rem === Check if .env exists ===
if not exist ".env" (
    echo [ERROR] .env file not found.
    echo Please create it using the following steps:
    echo   1. Copy .env.example to .env
    echo   2. Edit environment variables - see .env.example for details
    echo.
    pause
    exit /b 1
)

rem ----- Initialization -----
set CLIENT_ENV=client\.env
set ADMIN_ENV=client-admin\.env
set SERVER_ENV=server\.env

(del %CLIENT_ENV%) >nul 2>&1
(del %ADMIN_ENV%) >nul 2>&1
(del %SERVER_ENV%) >nul 2>&1

rem ----- Parse .env and generate per-service env files -----
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    set KEY=%%A
    set VALUE=%%B

    rem Skip empty lines and comments
    echo !KEY! | findstr /b "#" >nul && (
        rem skip comment
    ) || if not "!KEY!"=="" (
        rem server env
        if /i "!KEY!"=="OPENAI_API_KEY" (
            echo !KEY!=!VALUE!>>%SERVER_ENV%
        ) else if /i "!KEY!"=="PUBLIC_API_KEY" (
            echo !KEY!=!VALUE!>>%SERVER_ENV%
        ) else if /i "!KEY!"=="ADMIN_API_KEY" (
            echo !KEY!=!VALUE!>>%SERVER_ENV%
        ) else if /i "!KEY!"=="ENVIRONMENT" (
            echo !KEY!=!VALUE!>>%SERVER_ENV%
        ) else if /i "!KEY!"=="STORAGE_TYPE" (
            echo !KEY!=!VALUE!>>%SERVER_ENV%
        )

        rem client env
        if /i "!KEY!"=="NEXT_PUBLIC_API_BASEPATH" (
            echo !KEY!=!VALUE!>>%CLIENT_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_PUBLIC_API_KEY" (
            echo !KEY!=!VALUE!>>%CLIENT_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_SITE_URL" (
            echo !KEY!=!VALUE!>>%CLIENT_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_GA_MEASUREMENT_ID" (
            echo !KEY!=!VALUE!>>%CLIENT_ENV%
        )

        rem client-admin env
        if /i "!KEY!"=="NEXT_PUBLIC_CLIENT_BASEPATH" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_API_BASEPATH" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_ADMIN_API_KEY" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        ) else if /i "!KEY!"=="BASIC_AUTH_USERNAME" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        ) else if /i "!KEY!"=="BASIC_AUTH_PASSWORD" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        ) else if /i "!KEY!"=="NEXT_PUBLIC_ADMIN_GA_MEASUREMENT_ID" (
            echo !KEY!=!VALUE!>>%ADMIN_ENV%
        )
    )
)

rem ----------- Launch all services ------------
cd server
call venv\Scripts\activate
set PYTHON_EXECUTABLE=%CD%\venv\Scripts\python.exe
start "server" cmd /k "call venv\Scripts\activate && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

cd client
start "client" cmd /k "npm run dev"
cd ..

cd client-admin
start "client-admin" cmd /k "npm run dev"
cd ..

echo === All services launched!
pause
