@echo off
title SIM-HUNTARA BNPB - Aplikasi Pemantauan Progres & Pencairan Multi-Vendor
cd /d "%~dp0"
echo ======================================================================
echo   MEMULAI APLIKASI SIM-HUNTARA BNPB (MULTI-VENDOR ^& PROGRES DESA)
echo ======================================================================
echo.
echo Membuka browser otomatis ke http://localhost:4500 ...
start "" http://localhost:4500
node server.js
pause

