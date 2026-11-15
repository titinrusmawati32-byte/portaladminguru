@echo off
title Push Pembaruan SiGuru SD ke GitHub
echo ============================================================
echo   PROSES PUSH PERUBAHAN KE GITHUB (SiGuru SD Digital)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Memeriksa status file yang berubah:
git status
echo.

echo [2/4] Menambahkan semua perubahan (git add .)...
git add .
echo.

echo [3/4] Membuat commit perubahan...
set /p commit_msg="Masukkan pesan commit (tekan Enter untuk default): "
if "%commit_msg%"=="" set commit_msg=Update: Hero Widget Jam Tanggal Digital Glowing, Grafik Interaktif 7 Hari, dan Perbaikan Kontras Warna Mode Gelap Modal/Login

git commit -m "%commit_msg%"
echo.

echo [4/4] Mengirim perubahan ke GitHub (git push origin main)...
git push origin main

echo.
echo ============================================================
echo Selesai! Jika berhasil, perubahan sudah aktif di GitHub.
echo ============================================================
echo.
pause
