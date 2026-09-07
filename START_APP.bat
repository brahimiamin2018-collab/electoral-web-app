@echo off
chcp 65001 > nul
title Application Web de Gestion Électorale
echo ====================================================
echo   LANCEMENT DE L'APPLICATION WEB ÉLECTORALE
echo ====================================================
echo.
echo [1/2] Démarrage du serveur web et de la base de données...
cd /d "%~dp0"

start "" http://localhost:5000

node server.js

pause
