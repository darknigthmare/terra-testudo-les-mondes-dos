@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est requis. Installez Node.js puis relancez ce fichier.
  pause
  exit /b 1
)
start "" http://localhost:4173
node server.mjs
pause
