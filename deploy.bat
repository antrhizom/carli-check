@echo off
REM 🚀 Automatisches Deploy-Script für carli-check (Windows)

echo 🚀 carli-check Auto-Deploy
echo ==========================
echo.

REM Prüfe ob Git initialisiert ist
if not exist ".git" (
    echo ❌ Git nicht initialisiert!
    echo Führe zuerst aus:
    echo   git init
    echo   git remote add origin https://github.com/[dein-username]/carli-check.git
    pause
    exit /b 1
)

REM Status zeigen
echo 📋 Aktueller Git Status:
git status
echo.

REM Alle Dateien hinzufügen
echo ➕ Füge alle Dateien hinzu...
git add .
echo.

REM Zeige was geändert wurde
echo 📝 Diese Dateien werden committed:
git status --short
echo.

REM Prüfe ob CHANGELOG.md dabei ist
git status --short | findstr "CHANGELOG.md" >nul
if %errorlevel%==0 (
    echo ✅ CHANGELOG.md gefunden! (Neue Dateien sind dabei^)
) else (
    echo ⚠️  WARNUNG: CHANGELOG.md nicht gefunden!
    echo Möglicherweise sind die Änderungen nicht vollständig.
    echo.
)

REM Bestätigung
set /p confirm="Möchtest du diese Änderungen committen und pushen? (j/n) "
if /i "%confirm%"=="j" goto :deploy
if /i "%confirm%"=="y" goto :deploy
echo ❌ Abgebrochen.
pause
exit /b 0

:deploy
REM Commit
echo 💾 Committe Änderungen...
git commit -m "Feature: Admin counts + timestamps + all fixes"

REM Push
echo 🚀 Pushe zu GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo Versuche master branch...
    git push origin master
)

echo.
echo ✅ FERTIG!
echo Warte 2-3 Minuten, dann sollte Vercel deployed haben.
echo Teste dann auf: https://carli-check.vercel.app
pause
