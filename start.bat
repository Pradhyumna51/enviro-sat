@echo off
setlocal
echo ===================================================
echo   Starting Enviro-Sat System
echo ===================================================

cd /d "%~dp0"

echo [1/2] Launching Backend API (FastAPI + Uvicorn) on port 8000...
start "Enviro-Sat Backend" cmd /k "title Enviro-Sat Backend && .venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000"

echo [2/2] Launching Frontend Dev Server (Vite + React) on port 5173...
start "Enviro-Sat Frontend" cmd /k "title Enviro-Sat Frontend && cd frontend && npm run dev"

echo.
echo ===================================================
echo   Services launched!
echo   - Backend API: http://localhost:8000/docs
echo   - Frontend UI: http://localhost:5173
echo   Run stop.bat to terminate both services.
echo ===================================================
timeout /t 3 >nul
start http://localhost:5173
