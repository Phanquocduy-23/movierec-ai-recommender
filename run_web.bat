@echo off
chcp 65001 >nul
echo ============================================================
echo   Khoi dong MovieRec (Backend FastAPI + Frontend ReactJS)
echo ============================================================

set ROOT=%~dp0
set PY="C:\Users\phanq\AppData\Local\Python\pythoncore-3.14-64\python.exe"
if not exist %PY% set PY=python

echo [1/2] Dang bat Backend FastAPI tai http://127.0.0.1:8000 ...
start "MovieRec Backend (8000)" cmd /k "cd /d "%ROOT%backend" && %PY% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Dang bat Frontend ReactJS tai http://127.0.0.1:5173 ...
start "MovieRec Frontend (5173)" cmd /k "cd /d "%ROOT%frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 >nul
start http://127.0.0.1:5173
echo Da mo trinh duyet tai http://127.0.0.1:5173 !
