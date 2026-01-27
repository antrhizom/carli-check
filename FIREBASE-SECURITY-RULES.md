# Firebase Security Rules Deployment

## Wichtig: Die neuen Sicherheitsregeln müssen deployed werden!

Die Datei `firestore.rules` enthält jetzt sichere Regeln, die:
- Lernende nur eigene Daten sehen/bearbeiten lassen
- Trainer nur Daten ihrer Lernenden sehen lassen
- Trainer nur Notizen hinzufügen können (keine Einträge ändern)
- Admin vollen Zugriff hat

## Deployment-Schritte

### Option 1: Firebase CLI

```bash
# Im Projektordner:
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console (manuell)

1. Gehe zu https://console.firebase.google.com
2. Wähle dein Projekt
3. Linkes Menü: "Firestore Database"
4. Tab "Regeln" anklicken
5. Inhalt von `firestore.rules` kopieren und einfügen
6. "Veröffentlichen" klicken

## Regelübersicht

### Users Collection
- Benutzer kann eigene Daten lesen/schreiben
- Trainer kann seine Lernenden lesen/aktualisieren
- Admin kann alles

### Entries Collection  
- Lernender kann eigene Einträge erstellen/lesen/löschen
- Lernender kann NICHT trainerNote ändern
- Trainer kann NUR trainerNote bei seinen Lernenden ändern
- Admin kann alles

### Registration Codes
- Öffentlich lesbar (für Login-Validierung)
- Trainer kann eigene Codes erstellen/verwalten
- Admin kann alles

## Testen

Nach dem Deployment:
1. Als Lernender einloggen → nur eigene Einträge sichtbar
2. Als Trainer einloggen → nur Lernende des Trainers sichtbar
3. Versuchen fremde Daten zu lesen → sollte fehlschlagen

## Hinweis

Die alten Regeln (`allow read, write: if true`) waren UNSICHER!
Jeder konnte alle Daten lesen und ändern.
Die neuen Regeln schützen die Daten korrekt.
