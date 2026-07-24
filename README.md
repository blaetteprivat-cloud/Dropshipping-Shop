# NovaShop

Node/Express-Backend + statisches Frontend für einen Shop: Produkte, Nutzerkonten mit
E-Mail-Verifizierung, Bestellungen, Stripe-Checkout, Brevo-Transaktionsmails/Newsletter,
Admin-Bereich. Daten liegen in SQLite (`better-sqlite3`), Sessions in derselben DB.

## Voraussetzungen

- Node.js 18+ (getestet mit Node 24)
- Ein [Stripe](https://dashboard.stripe.com)-Account (Test-Keys reichen für die Entwicklung)
- Ein [Brevo](https://app.brevo.com)-Account für Transaktionsmails/Newsletter (optional lokal —
  ohne Konfiguration werden Verifizierungslinks stattdessen in die Server-Konsole geloggt)

## Setup

```bash
npm install
cp .env.example .env
```

`.env` mit echten Werten befüllen (siehe Kommentare in `.env.example`). Mindestens
`SESSION_SECRET` sollte lokal schon ein zufälliger Wert sein (`openssl rand -hex 32`).

Admin-Account anlegen (liest `ADMIN_EMAIL`/`ADMIN_PASSWORD` aus `.env`, einmalig nötig):

```bash
npm run seed-admin
```

Server starten:

```bash
npm run dev     # mit --watch, für lokale Entwicklung
npm start        # ohne --watch, für Produktion
```

Standardmäßig läuft der Server auf `http://localhost:3000` (`PORT` in `.env` änderbar) und
seedet beim ersten Start automatisch 22 Demo-Produkte in die (sonst leere) SQLite-Datenbank
unter `./data/novashop.sqlite`.

## Umgebungsvariablen

Vollständige Liste mit Erklärung in [`.env.example`](.env.example). Kurzfassung, was ohne
den jeweiligen Wert passiert:

| Variable | Ohne Wert |
|---|---|
| `SESSION_SECRET` | Server startet mit unsicherem Default-Secret (nur für lokale Entwicklung ok) + lauter Boot-Warnung |
| `STRIPE_SECRET_KEY` | Checkout-Endpunkt antwortet mit HTTP 503 |
| `STRIPE_WEBHOOK_SECRET` | Webhook antwortet mit 503; bezahlte Bestellungen werden nur noch über einen Live-Abgleich beim Aufruf der Erfolgsseite erkannt (Fallback), nicht mehr sofort per Webhook — plus laute Boot-Warnung, falls `STRIPE_SECRET_KEY` gesetzt ist |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` | Mail-/Newsletter-Endpunkte antworten mit HTTP 503; Verifizierungslinks werden stattdessen in die Konsole geloggt |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | nur für `npm run seed-admin` nötig |

## Bekannte Lücken vor einem echten Live-Gang

Dieses Repo ist technisch lauffähig, aber inhaltlich noch nicht produktionsreif:

- **Rechtstexte** (`impressum.html`, `datenschutz.html`, `agb.html`, `widerruf.html`) enthalten
  reine Platzhalter (grau hinterlegt) für Firmendaten — vor Veröffentlichung ausfüllen und
  juristisch prüfen lassen.
- **Produktdaten** (`server/seed-data.js`) sind Demo-Daten ohne echte Lieferanten-Anbindung —
  es gibt aktuell keine automatisierte Bestellweiterleitung an einen Dropshipping-Lieferanten.
- **Kein Deployment-Ziel festgelegt** — Dockerfile liegt bei, aber Hosting/Domain/TLS sind
  Betreiber-Entscheidungen.
- Weitere Details siehe Projekt-Historie/Audit.

## Deployment (Docker)

```bash
docker build -t novashop .
docker run -p 3000:3000 --env-file .env -v novashop-data:/app/data novashop
```

Das Volume für `/app/data` ist nötig, damit die SQLite-Datenbank Container-Neustarts übersteht.
