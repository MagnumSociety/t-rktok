# Türktok

Türktok ist jetzt eine **native Android-App ohne React Native/Metro und ohne API-Token**.

## Was geändert wurde

Die vorherige Debug-APK brauchte den Metro-Entwicklungsserver und konnte deshalb auf einem normalen Smartphone das JavaScript-Bundle nicht laden. Die neue Version ist eine kleine native Android-App mit eingebauter Web-Oberfläche. Es gibt keinen Metro-Server und keinen YouTube-API-Key.

## Wiedergabe

Die App hat drei lokale Listen:

- Erdoğan Düzenlemeleri
- Atatürk düzenlemeleri
- Halay mix

Über **+ Link** können pro Thema YouTube-Links, YouTube-Shorts-Links oder direkte MP4/WebM-Links eingefügt werden. Mehrere Links können zeilenweise eingefügt werden. Die Listen werden lokal auf dem Gerät gespeichert.

YouTube-Videos werden über den offiziellen eingebetteten Player abgespielt. Dadurch ist **kein API-Token** nötig. Die App benötigt natürlich weiterhin Internetzugang zum Streamen der Online-Videos.

## Android-Build

Der Standalone-Build liegt unter `android-native/`. GitHub Actions baut auf jedem Push nach `main` eine signierte Release-APK (mit Debug-Schlüssel für einfache Direktinstallation) und stellt sie als `Tuerktok-standalone-apk` bereit.
