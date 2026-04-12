@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "APP_DIR=%ROOT%app"
set "BACKEND_DIR=%ROOT%backend"
set "SETUP_MARKER=%ROOT%.launcher-ready"
set "NODE_INSTALL_ID=OpenJS.NodeJS"
set "NGROK_INSTALL_ID=ngrok.ngrok"

echo ==================================================
echo Reset Billing Test Environment
echo ==================================================
echo.

call :kill_processes
call :remove_project_artifacts
call :uninstall_tools
call :refresh_paths

echo.
echo Reset complete.
echo You can now run start-local-ngrok.bat again to simulate a fresh setup.
echo.
exit /b 0

:kill_processes
echo Stopping local Node and ngrok processes if they are running...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
exit /b 0

:remove_project_artifacts
echo Removing project install artifacts...
if exist "%APP_DIR%\node_modules" rmdir /s /q "%APP_DIR%\node_modules"
if exist "%BACKEND_DIR%\node_modules" rmdir /s /q "%BACKEND_DIR%\node_modules"
if exist "%APP_DIR%\.next" rmdir /s /q "%APP_DIR%\.next"
if exist "%SETUP_MARKER%" del /f /q "%SETUP_MARKER%"
if exist "%UserProfile%\.ngrok2\ngrok.yml" del /f /q "%UserProfile%\.ngrok2\ngrok.yml"
if exist "%UserProfile%\.ngrok2" rmdir /s /q "%UserProfile%\.ngrok2"
if exist "%UserProfile%\.config\ngrok\ngrok.yml" del /f /q "%UserProfile%\.config\ngrok\ngrok.yml"
if exist "%UserProfile%\.config\ngrok" rmdir /s /q "%UserProfile%\.config\ngrok"
exit /b 0

:uninstall_tools
echo Attempting to uninstall Node.js and ngrok via winget...
where winget >nul 2>&1
if errorlevel 1 (
    echo winget was not found. Skipping package uninstall.
    exit /b 0
)

winget uninstall --id %NGROK_INSTALL_ID% -e --silent --accept-source-agreements
winget uninstall --id %NODE_INSTALL_ID% -e --silent --accept-source-agreements
exit /b 0

:refresh_paths
set "PATH=%ProgramFiles%\nodejs;%PATH%"
set "PATH=%LocalAppData%\Programs\ngrok;%PATH%"
set "PATH=%UserProfile%\AppData\Local\Programs\ngrok;%PATH%"
exit /b 0
