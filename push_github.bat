@echo off
chcp 65001 >nul
cd /d "%~dp0"
C:\Users\phanq\AppData\Local\Python\pythoncore-3.14-64\python.exe scripts\github_device_push.py
pause
