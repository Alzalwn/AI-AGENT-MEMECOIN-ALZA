@echo off
title AI AGENT MEMECOIN - Launcher
echo ============================================================
echo   Menjalankan AI Agent Memecoin Alza Dashboard ^& Daemon...
echo ============================================================
echo.

cd /d "c:\OBU 18 BRAVO\AI\AI-AGENT-MEMECOIN-ALZA"

echo [1/3] Menjalankan Next.js Web Dashboard...
start "AI Agent - Web Dashboard" cmd /k "npm run dev"

echo [2/3] Menjalankan Autonomous Signal Daemon Bot...
start "AI Agent - Signal Daemon" cmd /k "npm run daemon"

echo [3/3] Menunggu 3 detik lalu membuka browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ============================================================
echo   Semua layanan berhasil dijalankan!
echo   Buka browser di http://localhost:3000
echo ============================================================
timeout /t 3 >nul
exit
