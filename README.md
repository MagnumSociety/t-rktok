# Türktok

Türktok ist ein vertikaler Kurzvideo-Feed auf Basis der offiziellen YouTube Data API v3 und des eingebetteten YouTube-Players.

## Themen

- Erdogan Düzenlemeleri
- Atatürk düzenlemeleri
- Halay mix

Die App durchsucht YouTube für das gewählte Thema, lädt weitere Treffer beim Scrollen nach und filtert die endgültige Liste auf Videos mit maximal 180 Sekunden Länge. Das jeweils sichtbare Video wird über den offiziellen YouTube-Embed-Player wiedergegeben.

## YouTube API-Key

Für die Suchfunktion wird ein YouTube Data API v3 Key benötigt. Beim ersten Start fragt die App danach und speichert ihn lokal über Expo SecureStore. Alternativ kann beim Build `EXPO_PUBLIC_YOUTUBE_API_KEY` gesetzt werden.

## Android APK

Ein Push auf `main` startet GitHub Actions. Der Workflow:

1. rekonstruiert das App-Icon aus den versionierten Base64-Teilen,
2. installiert die Abhängigkeiten,
3. erzeugt das native Android-Projekt mit Expo Prebuild,
4. baut `app-debug.apk`,
5. stellt das APK als GitHub-Actions-Artefakt `Turktok-debug-apk` bereit.

Das Debug-APK ist für direkte Tests/Sideloading gedacht. Für eine Veröffentlichung im Play Store sollte später ein signierter Release-Build bzw. ein Android App Bundle erstellt werden.

## Lokal

```bash
npm install
npx expo start
```

Android-Debug-APK lokal:

```bash
npm run build:apk:local
```
