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

## Was in diesem Repo schon fertig vorbereitet ist

Das Xcode- und Android-Studio-Projekt sind **schon erzeugt und eingecheckt** — das Scaffolding
selbst (`npx cap add ios`/`android`) braucht zwar normalerweise Xcode bzw. Android Studio, aber
nur zum *Bauen*, nicht zum reinen Anlegen der Projektdateien. Das lief bereits einmal komplett
durch (auch die Icon-/Splash-Generierung), Ergebnis liegt fertig im Repo:

- `capacitor.config.json` — App-ID (`de.novashop.app`, **vor dem ersten Upload unbedingt auf
  etwas ändern, das dir gehört**, siehe unten), App-Name, `server.url`-Platzhalter,
  `cleartext: false` (HTTPS-Pflicht).
- `ios/App/App.xcodeproj` — fertiges Xcode-Projekt, direkt mit `npx cap open ios` (oder manuell
  in Xcode) zu öffnen. App-Icon + Splash-Screen sind bereits im Asset-Katalog
  (`Assets.xcassets/AppIcon.appiconset`, `.../Splash.imageset`) eingetragen.
- `android/` — fertiges Android-Studio-/Gradle-Projekt (`npx cap open android`), Adaptive Icons +
  Splash-Screens (hell/dunkel, alle Dichten) liegen schon in `android/app/src/main/res/`.
- `resources/icon.svg` + `icon.png`, `resources/splash.svg` + `splash.png` — die Vektor-/Raster-
  Master (1024×1024 bzw. 2732×2732), exakt die bestehende Bronze-Verlauf-„N"-Marke aus dem
  Favicon, ohne abgerundete Ecken/Transparenz (die legt Apple/Google-Tooling selbst pro Plattform
  an). Falls du das Icon später änderst: `npm run cap:assets` regeneriert daraus alle
  Plattform-Größen neu.
- `manifest.json` + `img/icon-192.png`, `img/icon-512.png`, `img/apple-touch-icon.png`, verlinkt
  in `index.html`/`shop.html`/`product.html`/`bestellung.html` — macht den Shop nebenbei auch als
  installierbare PWA nutzbar (Android „Zum Startbildschirm hinzufügen" funktioniert damit schon
  jetzt, unabhängig vom Capacitor-Weg).
- `package.json` → `devDependencies`: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`,
  `@capacitor/android`, `@capacitor/assets`. Scripts `npm run cap:sync` und `npm run cap:assets`.
- `.gitignore`/`.dockerignore` ergänzt: lokale Xcode-/Gradle-Build-Artefakte (`xcuserdata`,
  `local.properties`, `build/`-Ordner) werden nicht mitversioniert, `www/`, `resources/`, `ios/`,
  `android/` wandern nicht ins Server-Docker-Image.

**Damit fehlt dir auf dem Mac nur noch:**

```bash
# 1. Ins Projekt wechseln, Abhängigkeiten installieren
cd /pfad/zu/Dropshipping-Shop
npm install

# 2. capacitor.config.json öffnen und server.url auf deine echte Domain setzen,
#    z. B. "https://shop.deine-domain.de", dann:
npx cap sync

# 3. Bundle-ID final festlegen (siehe Abschnitt unten) BEVOR du zum ersten Mal hochlädst,
#    dann in capacitor.config.json unter "appId" eintragen, danach wieder npx cap sync

# 4. In Xcode öffnen
npx cap open ios
```

`npx cap add ios`/`android` musst du nur erneut ausführen, falls du die `ios/`- oder
`android/`-Ordner mal komplett löschst/neu aufsetzen willst — im Normalfall reicht `cap sync`.

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

## Store-Texte (Entwurf, direkt einsetzbar)

Basiert 1:1 auf den bestehenden Texten aus `index.html`/`shop.html` (keine neuen, unbelegten
Werbeaussagen). Zeichenlängen unten sind bereits gegen die aktuellen Limits geprüft
(Untertitel 24/30, Kurzbeschreibung 79/80, Werbetext 142/170, Keywords 82/100) — Apple/Google
ändern diese Grenzen gelegentlich, im Zweifel im jeweiligen Eingabefeld selbst nachsehen.

**App-Name** (beide Stores, ≤30 Zeichen): `NovaShop`

**Untertitel** (App Store, ≤30 Zeichen): `Tech, Gaming & Lifestyle`

**Kurzbeschreibung** (Google Play, ≤80 Zeichen):
`Elektronik, Gaming & Lifestyle — kostenloser Versand ab 49 €, 30 Tage Rückgabe.`

**Werbetext** (App Store „Promotional Text", ≤170 Zeichen, jederzeit ohne neuen Review änderbar):
`Kuratierte Elektronik-, Gaming- und Lifestyle-Produkte zu fairen Preisen. Kostenloser Versand ab 49 €, sichere Zahlung, 30 Tage Rückgaberecht.`

**Beschreibung** (beide Stores):
```
NovaShop — kuratierte Elektronik, Gaming- und Lifestyle-Produkte zu fairen Preisen.

Entdecke unser Sortiment: Elektronik, Gaming, Zubehör, Kleidung, Home & Living, Beauty,
Sport, Spielzeug sowie Büro & Schule.

• Kostenloser Versand ab 49 € Bestellwert
• Sichere Zahlung über Stripe
• 30 Tage Rückgaberecht
• Bestellungen jederzeit im eigenen Konto einsehbar
• Bestellstatus auch ohne Konto per Bestellnummer + E-Mail abrufbar

Konto erstellen, stöbern, bestellen — direkt aus der App.
```

**Schlüsselwörter** (App Store „Keywords"-Feld, ≤100 Zeichen, kommagetrennt ohne Leerzeichen,
Wörter aus Name/Untertitel nicht wiederholen — die zählen dort schon automatisch mit):
`gadgets,gaming,zubehoer,technik,lifestyle,deals,bestellen,onlineshop,shopping,tech`

**Kategorie**: App Store „Shopping" (primär), optional „Lifestyle" (sekundär). Google Play
„Shopping".

## Danach: laufende Aktualisierungen

Solange sich nur `index.html`/`shop.html`/`js/*.js`/`css/*.css` etc. auf dem Server ändern,
sehen App-Nutzer das automatisch beim nächsten Öffnen — kein neuer Build nötig. Ein neuer
App-Store-Build ist nur nötig bei: geänderter `capacitor.config.json`, neuen nativen Plugins,
Icon-/Splash-Änderungen, oder Xcode-/Android-Studio-Projektänderungen.
