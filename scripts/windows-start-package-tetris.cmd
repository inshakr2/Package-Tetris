@echo off
setlocal

cd /d "%~dp0\.."

echo Package Tetris Windows launcher
echo.

if not exist package.json (
  echo package.json was not found.
  echo Run this file from the Package Tetris scripts folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is not installed.
  echo Install Node.js LTS first, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found.
  echo Reinstall Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing Package Tetris dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Running Package Tetris field audit...
call npm.cmd run field:audit
if errorlevel 1 (
  echo Field audit failed.
  pause
  exit /b 1
)

echo Starting Package Tetris...
echo Keep this window open while using the app.
call npm.cmd run dev

pause
