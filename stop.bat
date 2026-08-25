@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   Stopping Enviro-Sat Services
echo ===================================================

echo [1/2] Stopping processes on port 8000 (Backend API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   Stopped PID %%a (Port 8000)
)

echo [2/2] Stopping processes on port 5173 (Frontend Dev Server)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   Stopped PID %%a (Port 5173)
)

:: Terminate named cmd window processes
taskkill /FI "WINDOWTITLE eq Enviro-Sat Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Enviro-Sat Frontend*" /T /F >nul 2>&1

echo.
echo ===================================================
echo   Enviro-Sat services stopped successfully.
echo ===================================================
timeout /t 2 >nul
