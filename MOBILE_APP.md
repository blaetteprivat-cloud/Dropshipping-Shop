# NovaShop als iOS-/Android-App

Dieses Repo ist jetzt so vorbereitet, dass daraus mit [Capacitor](https://capacitorjs.com)
eine echte iOS- und Android-App gebaut werden kann, die im App Store bzw. bei Google Play
eingereicht werden darf — ohne das Frontend neu zu schreiben.

## Wie das funktioniert (kurz)

Capacitor packt eine native App-Hülle (echtes Xcode-/Android-Studio-Projekt) um eine WebView,
die **direkt deine live erreichbare Website lädt** (`server.url` in `capacitor.config.json`),
statt eine lokale Kopie der Dateien mitzuliefern. Das hat zwei große Vorteile gegenüber der
Alternative ("Dateien lokal bündeln"):

- **Login/Sessions funktionieren ohne Änderungen.** Die WebView zeigt deine echte Domain an —
  aus Sicht des Browsers ist das exakt dieselbe Origin wie beim normalen Website-Besuch. Die
  bestehenden Session-Cookies (`sameSite: "lax"`) funktionieren dadurch unverändert, es sind
  **keine CORS-Änderungen am Server nötig**.
- **Updates ohne neuen App-Store-Review.** Änderst du z. B. `shop.html` oder `js/shop.js` auf dem
  Server, sehen App-Nutzer die Änderung beim nächsten App-Start sofort — ohne dass du eine neue
  Version einreichen musst. Nur Änderungen an `capacitor.config.json` selbst, an nativem Code
  oder an App-Icons brauchen einen neuen Build + Review.

Der Preis: die App braucht (wie der Shop sowieso) durchgehend Internet — für einen Checkout-Flow
ohnehin unvermeidbar, das ist kein echter Nachteil hier.

## Voraussetzung: echtes Deployment mit eigener Domain

**Das ist der wichtigste offene Punkt, bevor überhaupt ein App-Build sinnvoll ist.** Aktuell
läuft der Server nur unter `localhost` — ein iPhone/Android-Gerät kann darauf nicht zugreifen.
Du brauchst:

1. Ein Hosting-Ziel für den Docker-Container (siehe `README.md` → Abschnitt "Deployment
   (Docker)") — z. B. ein VPS, Fly.io, Render, Railway o. ä.
2. Eine echte Domain, auf den Server verweisend
3. Ein gültiges TLS-Zertifikat (HTTPS) — **zwingend**, Apple erlaubt in Produktion keine
   Klartext-HTTP-Verbindungen (App Transport Security). `capacitor.config.json` ist bereits mit
   `"cleartext": false` entsprechend vorkonfiguriert.
4. `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` und `BREVO_API_KEY`/... mit echten (Live- oder
   zumindest Test-)Werten in der Server-`.env`, sonst funktioniert Checkout/Mailversand in der
   App genauso wenig wie aktuell im Browser.

Sobald das steht: trag die echte URL in `capacitor.config.json` unter `server.url` ein (ersetzt
den Platzhalter `https://REPLACE-WITH-DEINER-ECHTEN-DOMAIN.example`).

## Was in diesem Repo schon vorbereitet ist

- `capacitor.config.json` — App-ID (`de.novashop.app`, **vor dem ersten Upload unbedingt auf
  etwas ändern, das dir gehört**, siehe unten), App-Name, `server.url`-Platzhalter,
  `cleartext: false` (HTTPS-Pflicht).
- `www/index.html` — minimaler Platzhalter, den Capacitor als Ordner braucht (wird durch den
  `server.url`-Modus praktisch nicht angezeigt, nur eine technische Voraussetzung des Tools).
- `resources/icon.svg` — App-Icon als Vektor-Master (1024×1024, exakt die bestehende
  Bronze-Verlauf-„N"-Marke aus dem Favicon, ohne abgerundete Ecken/Transparenz — die legt
  Apple/Google-Tooling selbst pro Plattform an).
- `resources/splash.svg` — Splash-Screen-Master (2732×2732), dunkler Hintergrund passend zu
  `--color-bg` aus `css/style.css`.
- `package.json` → `devDependencies`: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`,
  `@capacitor/android`, `@capacitor/assets` (Icon-/Splash-Generator).
- `.dockerignore` ergänzt, damit `www/`, `resources/`, `ios/`, `android/` nicht ins Server-Docker-
  Image wandern (die sind nur für den App-Build relevant).

Absichtlich **nicht** enthalten: die eigentlichen `ios/`- und `android/`-Ordner. Die erzeugt
`npx cap add ios` bzw. `npx cap add android` — das braucht installiertes Xcode
(nur macOS) bzw. Android Studio, deshalb kann ich das von hier aus nicht für dich ausführen.

## Schritt für Schritt auf deinem Mac

```bash
# 1. Ins Projekt wechseln, Abhängigkeiten installieren
cd /pfad/zu/Dropshipping-Shop
npm install

# 2. capacitor.config.json öffnen und server.url auf deine echte Domain setzen,
#    z. B. "https://shop.deine-domain.de"

# 3. Bundle-ID final festlegen (siehe Abschnitt unten), dann in capacitor.config.json
#    unter "appId" eintragen — DANACH NICHT MEHR ÄNDERN (siehe Warnung unten)

# 4. Icons/Splash aus den SVG-Quellen erzeugen
#    (ImageMagick oder ein Online-Konverter reicht, um icon.svg -> icon.png @1024x1024
#    und splash.svg -> splash.png @2732x2732 zu exportieren; z.B.:)
brew install imagemagick   # falls noch nicht vorhanden
magick resources/icon.svg -resize 1024x1024 resources/icon.png
magick resources/splash.svg -resize 2732x2732 resources/splash.png

npx @capacitor/assets generate --iconBackgroundColor '#9c7a52' --splashBackgroundColor '#0a0908'

# 5. Native Projekte erzeugen
npx cap init   # falls noch nicht automatisch aus capacitor.config.json übernommen
npx cap add ios
npx cap add android
npx cap sync

# 6. In Xcode öffnen
npx cap open ios
```

## Bundle-ID / App-ID wählen

`de.novashop.app` ist nur ein Platzhalter. Die App-ID muss **weltweit eindeutig** sein (reverse-
DNS-Schema, meist aus deiner eigenen Domain abgeleitet, z. B. `de.deine-domain.shop`) und lässt
sich **nach dem ersten Upload in App Store Connect nicht mehr ändern** — leg sie also bewusst
fest, bevor du zum ersten Mal hochlädst. Passe sie in `capacitor.config.json` (`appId`) an, dann
`npx cap sync`.

## iOS: Von Xcode bis in den App Store

1. **Apple Developer Program** — du hast noch keinen Account: Anmeldung unter
   [developer.apple.com/programs](https://developer.apple.com/programs/enroll/), **99 $/Jahr**,
   Freigabe kann (v. a. bei Erstanmeldung als Einzelperson) 1–2 Tage dauern. Ohne aktive
   Mitgliedschaft lässt sich weder auf ein echtes Gerät deployen noch etwas hochladen.
2. In Xcode: Projekt auswählen → Reiter **Signing & Capabilities** → dein Team (Apple-ID mit
   aktivem Developer-Account) auswählen → „Automatically manage signing" aktivieren lassen.
3. **App Store Connect** ([appstoreconnect.apple.com](https://appstoreconnect.apple.com)) → neue
   App anlegen: Bundle-ID (dieselbe wie oben), App-Name „NovaShop" (oder final gewählter Name,
   muss im Store eindeutig sein), Primärsprache Deutsch.
4. Pflichtangaben in App Store Connect ausfüllen, bevor Einreichung möglich ist:
   - **Datenschutzerklärung-URL** — muss auf eine echte, erreichbare Seite zeigen. `datenschutz.html`
     im Repo hat aktuell noch Platzhalter (`legal-todo`-Markierungen) für Firmendaten — **die
     müssen vor der Einreichung mit echten Angaben gefüllt und rechtlich geprüft sein**, Apple-
     Reviewer öffnen diesen Link aktiv.
   - **App Privacy ("Datenschutz-Angaben")** — Fragebogen, welche Daten die App erhebt. Für
     NovaShop ehrlich angeben: Name, E-Mail, Adresse (Bestellungen), ggf. Zahlungsinfos (laufen
     aber über Stripe, nicht durch die App selbst gespeichert) — grob orientieren an dem, was
     `server/routes/auth.js`/`checkout.js` tatsächlich speichern.
   - **Screenshots** — mindestens für ein 6,7"-Gerät (z. B. iPhone 15 Pro Max) Pflicht, weitere
     Größen optional aber empfohlen. Am einfachsten per Xcode-Simulator erzeugen.
   - **Altersfreigabe-Fragebogen**, **Export-Compliance** (reine HTTPS-Nutzung ohne eigene
     Verschlüsselung qualifiziert i. d. R. für die Standard-Ausnahme — im Fragebogen entsprechend
     angeben).
5. **Build hochladen**: Xcode → Product → Archive → „Distribute App" → App Store Connect.
6. **TestFlight** (empfohlen vor dem echten Review): Build erscheint nach Verarbeitung in
   TestFlight, kann dort erst selbst getestet werden, bevor du „Für Review einreichen" klickst.
7. **Einreichen zur Prüfung** in App Store Connect, sobald alle Pflichtfelder + der Build stehen.

### Für diese App relevante App-Review-Punkte (Apple Guidelines)

- **Kein In-App-Purchase nötig.** NovaShop verkauft physische Produkte (Dropshipping) —
  Guideline 3.1.3 erlaubt dafür ausdrücklich externe Zahlungsanbieter wie Stripe, IAP ist nur für
  digitale Inhalte/Dienste innerhalb der App Pflicht. Der bestehende Stripe-Checkout-Flow ist
  also unproblematisch.
- **Kontolöschung ist Pflicht (Guideline 5.1.1(v)) — bereits erfüllt.** `server/routes/auth.js`
  (`POST /api/auth/delete-account`) + die entsprechende UI in `js/account.js` sind schon da.
- **„Sign in with Apple" ist nicht nötig**, solange die App ausschließlich E-Mail/Passwort als
  Login anbietet (Guideline 4.8 greift nur, wenn *zusätzlich* ein Drittanbieter-/Social-Login wie
  Google/Facebook angeboten wird — das ist hier nicht der Fall).
- **Guideline 4.2 „Minimum Functionality"** ist das größte Rejection-Risiko bei WebView-Apps
  ("nur eine Website im Wrapper"). Reduziert das Risiko:
  - Eigenes App-Icon/Splash-Screen statt Browser-Chrome (schon vorbereitet, s. o.)
  - Kein sichtbarer Browser-UI-Rahmen (URL-Leiste etc.) — bei Capacitor standardmäßig so
  - Optional, aber empfehlenswert vor der Einreichung: mindestens eine native Funktion ergänzen,
    z. B. Push-Benachrichtigungen für Bestellstatus-Updates (`@capacitor/push-notifications`) oder
    Face-ID/Touch-ID-Login (`@capacitor/biometric`) — beides baut auf der bestehenden
    Notifications-/Auth-Logik im Backend auf und ist eine spätere, klar abgegrenzte Erweiterung.
- **Rechtstexte vollständig** (`impressum.html`, `datenschutz.html`, `agb.html`, `widerruf.html`)
  — Apple-Reviewer prüfen diese aktiv bei einem Shop mit Nutzerkonten/Zahlungen.

## Android: Von Android Studio bis Google Play

Deutlich schneller und günstiger als iOS, gleicher Codepfad:

1. **Google Play Console Account** — einmalig **25 $**, keine Jahresgebühr, Freischaltung meist
   binnen Stunden (statt Tage bei Apple).
2. `npx cap open android` → Android Studio → **Build → Generate Signed Bundle/APK** → neuen
   Signing-Key erzeugen und **sicher aufbewahren** (Verlust = du kannst die App nie wieder
   updaten, ohne eine neue App-ID anzulegen).
3. In der Play Console: neue App anlegen, Store-Eintrag (Screenshots, Beschreibung,
   Datenschutzerklärung-URL — dieselbe Anforderung wie bei Apple), Datenschutz-Fragebogen
   ausfüllen, `.aab`-Datei hochladen.
4. Review bei Google ist in der Regel deutlich schneller und weniger streng als bei Apple.

## Danach: laufende Aktualisierungen

Solange sich nur `index.html`/`shop.html`/`js/*.js`/`css/*.css` etc. auf dem Server ändern,
sehen App-Nutzer das automatisch beim nächsten Öffnen — kein neuer Build nötig. Ein neuer
App-Store-Build ist nur nötig bei: geänderter `capacitor.config.json`, neuen nativen Plugins,
Icon-/Splash-Änderungen, oder Xcode-/Android-Studio-Projektänderungen.
