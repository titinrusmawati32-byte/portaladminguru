@echo off
title Push Pembaruan SiGuru SD ke GitHub
echo ============================================================
echo   PROSES PUSH PERUBAHAN KE GITHUB (SiGuru SD Digital)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/5] Memeriksa status file yang berubah:
git status
echo.

echo [2/5] Menambahkan semua perubahan (git add .)...
git add .
echo.

echo [3/5] Membuat commit perubahan...
set /p commit_msg="Masukkan pesan commit (tekan Enter untuk default): "
if "%commit_msg%"=="" set commit_msg=Fix: Anti-Bentrok Popup Firebase dan Auto-Redirect Fallback Login Google Admin

git commit -m "%commit_msg%"
echo.

echo [4/5] Menyelaraskan dengan repository GitHub (git pull)...
git pull origin main --no-rebase --no-edit
echo.

echo [5/5] Mengirim perubahan ke GitHub (git push origin main)...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Info] Mencoba sinkronisasi penyesuaian branch...
    git push origin main --force
)

echo.
echo ============================================================
echo Selesai! Perubahan sudah berhasil dikirim ke GitHub.
echo Vercel akan otomatis men-deploy dalam 1-2 menit.
echo ============================================================
echo.
pause