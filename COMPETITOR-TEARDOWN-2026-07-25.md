# NovaShop vs. Temu / SHEIN / AliExpress / Amazon — UX-Teardown (2026-07-25)

Auftrag war: andere Shopping-Apps "auseinandernehmen" und alles Sinnvolle für NovaShop
übernehmen. Vier parallele Recherche-Agents haben Temu, SHEIN, AliExpress und die Amazon
Shopping App auf Conversion-/Vertrauens-Patterns untersucht (Quellen jeweils unten). Die
Ergebnisse waren über alle vier Apps hinweg auffällig konsistent — sowohl bei dem, was
funktioniert, als auch bei dem, was rechtlich riskant ist.

## Kernbefund: zwei sehr unterschiedliche Werkzeugkästen

Alle vier Apps nutzen eine Mischung aus **echten, legitimen Conversion-Boostern** und
**Dark Patterns, die in der EU/DE aktuell aktiv verfolgt werden**:

- Temu wurde vom vzbv wegen manipulativer Rabatt-Anzeigen abgemahnt und musste nachbessern;
  außerdem eine EU-Geldstrafe von 200 Mio. € (DSA).
- SHEIN wurde im Juni 2025 von BEUC (inkl. vzbv) formell wegen Dark Patterns
  ("Overconsumption by design") bei der EU-Kommission angezeigt.
- Fake-Countdown-Timer, erfundene "nur noch 3 Stück"-Warnungen, vorausgewählte
  Zusatz-Checkboxen und erschwerte Kündigungen sind in Deutschland konkret rechtswidrig
  (UWG §5/§7, Art. 246a EGBGB, "Button-Lösung" §312j BGB, Kündigungsbutton-Gesetz).

NovaShops bestehender Code zeigt bereits ein bewusstes Bekenntnis dagegen (siehe Kommentar
in `index.html`: "Bewusst nur Zahlen, die wir auch belegen können"). Alle Empfehlungen unten
respektieren das — nichts Erfundenes, keine simulierte Dringlichkeit.

## Was übernommen wurde (in diesem PR umgesetzt)

Alle fünf Punkte wurden bei allen vier Apps unabhängig voneinander als Top-Empfehlung
genannt — und alle sind mit echten, vorhandenen Daten umsetzbar (keine Fake-Zahlen):

1. **Konkretes Lieferdatum statt "1–3 Werktage".** Amazons Recherche-Agent nennt das als
   höchsten Hebel ("Delivery Day Prediction" hebt Conversion messbar, senkt Abbruch spürbar).
   Jetzt auf Produktseite + Warenkorb: echtes, aus dem aktuellen Datum berechnetes
   Lieferfenster in Werktagen (Sa/So übersprungen), z. B. "Lieferung: Mo., 27. Juli – Mi., 29. Juli".
   → `js/cart.js` (`deliveryEstimateText`), genutzt in `js/product-page.js`, `js/shop.js`.

2. **Kostenloser-Versand-Fortschrittsbalken im Warenkorb.** Bei Temu, SHEIN und AliExpress
   übereinstimmend als bewährter, unmanipulativer Conversion-Booster genannt — mit der
   expliziten Warnung, den Warenkorb dabei NIE automatisch zu verändern (bekannter
   Temu-Kritikpunkt). Zeigt jetzt ehrlich den Fortschritt zur bestehenden 49€-Schwelle und
   eine klare "freigeschaltet"-Bestätigung, sobald erreicht — reine Anzeige, keine
   Warenkorb-Manipulation. → `css/shop.css`, `js/shop.js`, `js/product-page.js`.

3. **"Häufig zusammen gekauft"-Bundle auf der Produktseite.** Legitimes Cross-Selling
   (SHEIN, AliExpress), nutzt die bereits vorhandene "Ähnliche Produkte"-Logik — kein
   künstlicher Rabatt, nur eine bequeme Ein-Klick-Ergänzung mit echtem Summenpreis.
   → `js/product-page.js`, `css/product.css`.

4. **"Kürzlich angesehen".** Amazon-Standard, rein clientseitig über localStorage — zeigt
   nur tatsächlich selbst besuchte Produkte, keine simulierten/fremden Ansichten.
   → `js/cart.js` (`RecentlyViewed`), `js/product-page.js`, `product.html`.

5. **Widerrufsrecht sichtbar auf der Produktseite, nicht nur im Footer.** Alle vier Agents
   (unabhängig voneinander) heben hervor, dass sichtbare Rückgabe-/Käuferschutz-Infos vor
   dem Kauf – nicht erst im Kleingedruckten – Vertrauen bei einem noch unbekannten Shop
   aufbauen, und dass das in DE ohnehin gesetzlich vorgeschrieben ist (Art. 246a EGBGB).
   Trust-Row auf der Produktseite verlinkt jetzt direkt zu `widerruf.html`.
   → `js/product-page.js`.

**Guest-Checkout & Autofill** wurden ebenfalls von allen Agents als kritisch genannt
(Baymard: 18% Kaufabbruch wegen Zwangs-Registrierung) — beim Code-Review von
`js/checkout.js` zeigte sich, dass NovaShop das bereits vollständig richtig macht
(alle Formularfelder mit korrektem `autocomplete`, kein Registrierungszwang). Kein
Handlungsbedarf.

Alle Änderungen wurden lokal im Browser getestet (Desktop + Mobile-Viewport 414px),
`npm test` läuft weiterhin grün (30/30), keine Konsolen-Fehler.

## Bewusst NICHT übernommen (Backlog, nicht in diesem PR)

- **Echte Kundenrezensionen mit Fotos/"Verifizierter Kauf"-Badge auf der Produktseite** —
  von allen vier Agents als eine der wirkungsvollsten Maßnahmen genannt. Nicht umgesetzt,
  weil dafür echte Kundenbewertungen nötig sind — erfundene Rezensionstexte mit Namen wären
  Fake-Reviews und in DE seit dem UWG-Omnibus-Update (Anlage 1 Nr. 23b) explizit verboten.
  Die drei Testimonials auf der Startseite sind bereits als Demo-Platzhalter zu behandeln.
  Sobald erste echte Bestellungen/Bewertungen vorliegen, sollte hierfür eine echte
  Rezensions-Funktion (Sterne-Verteilung, Foto-Upload, "verifizierter Kauf") gebaut werden.
- **Trust-Siegel Dritter (z. B. Trusted Shops)** — von Amazon- und AliExpress-Agent als
  glaubwürdiger als selbst gestaltete Badges genannt. Erfordert eine echte Zertifizierung
  (Kosten, Antragsprozess) — keine Code-Änderung, sondern eine Geschäftsentscheidung.
- **Sticky "In den Warenkorb"-Leiste auf Mobile beim Scrollen** — kleinere UX-Politur,
  zurückgestellt zugunsten der fünf Punkte oben mit größerem, durch alle vier Reports
  bestätigtem Effekt.
- **Preis-Historie / "Niedrigster Preis der letzten 30 Tage"** — inzwischen EU-weit übliche
  Praxis (Omnibus-Richtlinie verlangt das sogar bei echten Rabatten), aber NovaShops
  `oldPrice`-Feld enthält aktuell keinen echten Preisverlauf, nur einen einzelnen
  Vergleichspreis. Müsste zuerst eine echte Preishistorie im Backend/Adminbereich bekommen,
  bevor eine ehrliche Anzeige möglich ist.

## Explizit vermiedene Dark Patterns (zur Erinnerung für zukünftige Änderungen)

Aus allen vier Reports konsistent als rechtlich riskant unter deutschem/EU-Recht geflaggt —
sollten in NovaShop nie eingebaut werden:

- Countdown-Timer, die zurückgesetzt werden oder an keine echte Deadline gebunden sind
- Erfundene/zufällige "Nur noch X auf Lager"- oder "X Personen sehen sich das gerade an"-Anzeigen
- Streichpreise, die nie real verlangt wurden
- Vorausgewählte Zusatz-/Newsletter-Checkboxen beim Checkout
- Erschwerte Kündigung/Abbestellung (Kündigungsbutton-Gesetz)
- Exit-Intent-"Du verlierst deinen Rabatt!"-Popups
- Gamification mit Glücksspiel-Charakter (Glücksrad mit manipulierten Gewinnchancen)
- Fingierte oder gekaufte Bewertungen

## Quellen (von den vier Recherche-Agents zusammengetragen)

Temu: vzbv.de, techpolicy.press (EU-200-Mio-€-Bußgeld), ecommercegermany.com, mimikama.org,
euronews.com, factually.co
SHEIN: beuc.eu, thefashionlaw.com, fashionnetwork.com, bnnbloomberg.ca, shein.com
(Review-Guidance)
AliExpress: aliexpress.com (Choice-Badge/Seller-Rating/Buyer-Protection-Wikis), dsers.com,
deceptive.design, infocons.org
Amazon: ecwid.com, veeqo.com, baymard.com, aboutamazon.com, trustedshops.de, pdir.de,
arxiv.org (Dark-Patterns-at-Scale-Studie)
