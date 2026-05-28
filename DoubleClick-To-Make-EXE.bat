@echo off
title Teacher Widget Dashboard Builder
color 0B
echo ==========================================================
echo   Teacher Widget Dashboard - Windows EXE Builder
echo ==========================================================
echo.
echo [1/4] Checking system environment...
echo.

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed on this PC!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [2/4] Installing required packages...
echo (This may take a few minutes depending on your connection.)
echo.
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [ERROR] Package installation failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Building web application resources...
echo.
call npm run build
if errorlevel 1 (
    echo [ERROR] Web app compilation failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Building desktop standalone app (.exe)...
echo (First build will download Windows Electron binaries.)
echo.
call npm run electron:build
if errorlevel 1 (
    echo [ERROR] Portable installer packaging failed.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo BUILD COMPLETED SUCCESSFULLY!
echo Installer created inside 'dist-electron' folder.
echo (File: "PC Local Teacher Widget Dashboard Setup 0.0.0.exe")
echo ==========================================================
echo.
explorer dist-electron
pause
exit /b 0
