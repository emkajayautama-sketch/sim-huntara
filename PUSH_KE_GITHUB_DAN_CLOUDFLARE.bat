@echo off
title Push Update SIM-HUNTARA ke Cloudflare & GitHub
cd /d "%~dp0"
echo ======================================================================
echo   MENGIRIM UPDATE TERBARU SIM-HUNTARA KE GITHUB & CLOUDFLARE
echo ======================================================================
echo.
git push origin main
echo.
echo ======================================================================
echo Update selesai dikirim! Cloudflare akan otomatis mengupdate link online.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
