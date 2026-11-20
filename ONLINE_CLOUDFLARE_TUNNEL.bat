@echo off
title Onlinekan Aplikasi Huntara ke Cloudflare
cd /d "%~dp0"
echo ======================================================================
echo   ONLINEKAN SIM-HUNTARA BNPB KE CLOUDFLARE (GRATIS & RESMI)
echo ======================================================================
echo.
echo Pastikan server lokal sudah berjalan di port 4500.
echo Menghubungkan http://localhost:4500 ke Cloudflare Quick Tunnel...
echo.
echo Tunggu beberapa detik sampai muncul link HTTPS di bawah ini:
echo Contoh: https://random-name.trycloudflare.com
echo.
echo Link tersebut bisa langsung dibagikan ke HP / Tim Lapangan / PPK BNPB!
echo ======================================================================
echo.
npx -y cloudflared tunnel --url http://localhost:4500
pause
