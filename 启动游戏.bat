@echo off
chcp 65001 >nul
cd /d %~dp0
echo ============================================
echo   Steel and Magic v0.6
echo   Server starting in background window...
echo   Close that window to stop the game.
echo ============================================
start "S-M Server" /min cmd /c "npx vite --port 5173 --strictPort"
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
echo Browser should open automatically. If not, visit: http://localhost:5173
pause
