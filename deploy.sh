#!/bin/bash

# 🚀 Automatisches Deploy-Script für carli-check

echo "🚀 carli-check Auto-Deploy"
echo "=========================="
echo ""

# Prüfe ob Git initialisiert ist
if [ ! -d ".git" ]; then
    echo "❌ Git nicht initialisiert!"
    echo "Führe zuerst aus:"
    echo "  git init"
    echo "  git remote add origin https://github.com/[dein-username]/carli-check.git"
    exit 1
fi

# Status zeigen
echo "📋 Aktueller Git Status:"
git status
echo ""

# Alle Dateien hinzufügen
echo "➕ Füge alle Dateien hinzu..."
git add .
echo ""

# Zeige was geändert wurde
echo "📝 Diese Dateien werden committed:"
git status --short
echo ""

# Prüfe ob CHANGELOG.md dabei ist
if git status --short | grep -q "CHANGELOG.md"; then
    echo "✅ CHANGELOG.md gefunden! (Neue Dateien sind dabei)"
else
    echo "⚠️  WARNUNG: CHANGELOG.md nicht gefunden!"
    echo "Möglicherweise sind die Änderungen nicht vollständig."
    echo ""
fi

# Bestätigung
read -p "Möchtest du diese Änderungen committen und pushen? (j/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[JjYy]$ ]]; then
    # Commit
    echo "💾 Committe Änderungen..."
    git commit -m "Feature: Admin counts + timestamps + all fixes"
    
    # Push
    echo "🚀 Pushe zu GitHub..."
    git push origin main || git push origin master
    
    echo ""
    echo "✅ FERTIG!"
    echo "Warte 2-3 Minuten, dann sollte Vercel deployed haben."
    echo "Teste dann auf: https://carli-check.vercel.app"
else
    echo "❌ Abgebrochen."
fi
