@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "APP_DIR=%ROOT%app"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_PORT=3001"
set "BACKEND_PORT=3000"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "NEXT_PUBLIC_API_URL=https://unglacially-unconsidered-loida.ngrok-free.dev"
set "SETUP_MARKER=%ROOT%.launcher-ready"
set "NGROK_INSTALL_ID=ngrok.ngrok"
set "NODE_INSTALL_ID=OpenJS.NodeJS"
set "NGROK_AUTHTOKEN=36LUCUDLVVqTQcAZAuk6kGpZqwZ_67tQ6gwsoj2WaRnEhc6e2"
set "NODE_EXE=node"
set "NPM_CMD=npm"
set "NGROK_EXE=ngrok"

pushd "%ROOT%" >nul

echo ==================================================
echo Billing local launcher
echo ==================================================
echo.

call :refresh_paths

if not exist "%SETUP_MARKER%" (
    call :bootstrap
    if errorlevel 1 goto failed
    > "%SETUP_MARKER%" echo ready
)

call :refresh_paths
call :resolve_commands
if errorlevel 1 goto failed

echo Starting backend on port %BACKEND_PORT%...
start "Billing Backend" /d "%BACKEND_DIR%" cmd /k "\"%NPM_CMD%\" start"

echo Starting ngrok tunnel for port %BACKEND_PORT%...
start "Ngrok" /d "%ROOT%" cmd /k "\"%NGROK_EXE%\" http %BACKEND_PORT%"

echo Starting frontend on port %FRONTEND_PORT%...
start "Billing Frontend" /d "%APP_DIR%" cmd /k "\"%NPM_CMD%\" run dev"

timeout /t 8 /nobreak >nul
start "" "%FRONTEND_URL%"

echo.
echo Started backend, frontend, and ngrok.
echo Frontend: %FRONTEND_URL%
echo Backend: http://localhost:%BACKEND_PORT%
echo.
popd >nul
exit /b 0

:bootstrap
call :ensure_node_installed
if errorlevel 1 exit /b 1

call :ensure_ngrok_installed
if errorlevel 1 exit /b 1

call :configure_ngrok_auth
if errorlevel 1 exit /b 1

call :install_dependencies
if errorlevel 1 exit /b 1

exit /b 0

:resolve_commands
set "NODE_EXE=node"
set "NPM_CMD=npm"
set "NGROK_EXE=ngrok"

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

if exist "%ProgramFiles%\ngrok\ngrok.exe" set "NGROK_EXE=%ProgramFiles%\ngrok\ngrok.exe"
if exist "%LocalAppData%\Programs\ngrok\ngrok.exe" set "NGROK_EXE=%LocalAppData%\Programs\ngrok\ngrok.exe"
if exist "%UserProfile%\AppData\Local\Programs\ngrok\ngrok.exe" set "NGROK_EXE=%UserProfile%\AppData\Local\Programs\ngrok\ngrok.exe"

where "%NODE_EXE%" >nul 2>&1
if errorlevel 1 (
    where node >nul 2>&1
    if errorlevel 1 (
        echo Node.js executable was not found.
        exit /b 1
    )
    set "NODE_EXE=node"
)

where "%NPM_CMD%" >nul 2>&1
if errorlevel 1 (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo npm was not found.
        exit /b 1
    )
    set "NPM_CMD=npm"
)

where "%NGROK_EXE%" >nul 2>&1
if errorlevel 1 (
    where ngrok >nul 2>&1
    if errorlevel 1 (
        echo ngrok executable was not found.
        exit /b 1
    )
    set "NGROK_EXE=ngrok"
)

exit /b 0

:ensure_node_installed
call :refresh_paths
where node >nul 2>&1
if not errorlevel 1 exit /b 0

where winget >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed, and winget was not found.
    echo Install Node.js manually, then run this BAT again.
    exit /b 1
)

echo Node.js not found. Installing the latest Node.js release...
winget install --id %NODE_INSTALL_ID% -e --source winget --accept-source-agreements --accept-package-agreements --silent
if errorlevel 1 (
    echo.
    echo Node.js installation failed.
    exit /b 1
)

call :refresh_paths
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo Node.js installation finished but executable was not detected.
    exit /b 1
)

exit /b 0

:ensure_ngrok_installed
call :refresh_paths
where ngrok >nul 2>&1
if not errorlevel 1 exit /b 0

where winget >nul 2>&1
if errorlevel 1 (
    echo ngrok is not installed, and winget was not found.
    echo Install ngrok manually, then run this BAT again.
    exit /b 1
)

echo ngrok not found. Installing ngrok...
winget install --id %NGROK_INSTALL_ID% -e --source winget --accept-source-agreements --accept-package-agreements --silent
if errorlevel 1 (
    echo.
    echo ngrok installation failed.
    exit /b 1
)

call :refresh_paths
where ngrok >nul 2>&1
if errorlevel 1 (
    echo.
    echo ngrok installation finished but executable was not detected.
    exit /b 1
)

exit /b 0

:configure_ngrok_auth
call :resolve_commands >nul 2>&1
if errorlevel 1 exit /b 1

echo Configuring ngrok auth token...
"%NGROK_EXE%" config add-authtoken %NGROK_AUTHTOKEN%
if errorlevel 1 (
    echo Failed to configure ngrok auth token.
    exit /b 1
)

exit /b 0

:refresh_paths
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\ngrok" set "PATH=%ProgramFiles%\ngrok;%PATH%"
if exist "%LocalAppData%\Programs\ngrok" set "PATH=%LocalAppData%\Programs\ngrok;%PATH%"
if exist "%UserProfile%\AppData\Local\Programs\ngrok" set "PATH=%UserProfile%\AppData\Local\Programs\ngrok;%PATH%"
exit /b 0

:install_dependencies
call :resolve_commands >nul 2>&1
if errorlevel 1 exit /b 1

if not exist "%BACKEND_DIR%\node_modules" (
    echo Installing backend dependencies...
    pushd "%BACKEND_DIR%" >nul
    call "%NPM_CMD%" install
    if errorlevel 1 goto deps_failed
    popd >nul
)

if not exist "%APP_DIR%\node_modules" (
    echo Installing frontend dependencies...
    pushd "%APP_DIR%" >nul
    call "%NPM_CMD%" install
    if errorlevel 1 goto deps_failed
    popd >nul
)

exit /b 0

:deps_failed
echo.
echo Dependency installation failed.
exit /b 1

:failed
popd >nul
exit /b 1
