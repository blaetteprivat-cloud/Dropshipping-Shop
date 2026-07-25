require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const SqliteStoreFactory = require("better-sqlite3-session-store");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const { renderStaticPage } = require("./lib/render-static");
const { expireStaleOrders } = require("./lib/fulfill-order");

/* Laute Boot-Warnungen statt stiller Fallbacks — beide Fälle sind sonst erst bemerkbar,
   wenn schon Bestellungen oder Sessions betroffen sind. */
if (!process.env.SESSION_SECRET) {
  console.error("\n⚠️  WARNUNG: SESSION_SECRET fehlt in der .env — es wird ein unsicherer Default verwendet. Vor Produktivbetrieb unbedingt einen langen Zufallswert setzen (z. B. `openssl rand -hex 32`).\n");
}
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("\n⚠️  WARNUNG: STRIPE_SECRET_KEY ist gesetzt, aber STRIPE_WEBHOOK_SECRET fehlt — bezahlte Bestellungen werden nur noch über den Live-Abgleich beim Aufruf der Erfolgsseite erkannt, nicht mehr sofort per Webhook. Secret aus `stripe listen` bzw. dem Dashboard-Webhook-Endpoint ergänzen.\n");
}

const SqliteStore = SqliteStoreFactory(session);
const app = express();
const ROOT_DIR = path.join(__dirname, "..");

app.set("trust proxy", 1);

/* CSP bleibt aus: Die Seiten nutzen an vielen Stellen Inline-<script>/<style>-Blöcke
   (siehe z. B. bestellung.html, order-success.html), eine Standard-CSP würde diese ohne
   Nonce-Refactoring aller Seiten sofort blockieren. Die übrigen Helmet-Header (HSTS,
   X-Content-Type-Options, X-Frame-Options etc.) greifen trotzdem. */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* Stripe-Webhooks brauchen den rohen Request-Body für die Signaturprüfung —
   muss vor express.json() auf genau diesem Pfad registriert werden. */
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

app.use(express.json());

app.use(
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    name: "novashop_sid",
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/checkout", require("./routes/checkout"));
app.use("/api/webhooks/stripe", require("./routes/webhooks"));
app.use("/api/newsletter", rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), require("./routes/newsletter"));

app.use("/robots.txt", require("./routes/robots"));
app.use("/sitemap.xml", require("./routes/sitemap"));

app.get(["/product.html", "/produkt.html"], require("./routes/product-page"));

app.get(/^\/$|\.html$/, renderStaticPage(ROOT_DIR));

app.use(express.static(ROOT_DIR, { extensions: ["html"] }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.code === "STRIPE_NOT_CONFIGURED") return res.status(503).json({ error: err.publicMessage || err.message });
  if (err && err.code === "BREVO_NOT_CONFIGURED") return res.status(503).json({ error: err.publicMessage || err.message });
  res.status(500).json({ error: "Interner Serverfehler." });
});

/* Räumt "Zahlung ausstehend"-Bestellungen auf, deren Stripe-Checkout-Session (Ablaufzeit siehe
   SESSION_EXPIRY_MINUTES in routes/checkout.js) längst abgelaufen sein muss, aber nie ein
   "checkout.session.expired"-Webhook ankam — sonst bliebe der dafür reservierte Lagerbestand für
   immer blockiert. STALE_ORDER_MINUTES liegt bewusst über der Session-Ablaufzeit als Puffer. */
const STALE_ORDER_MINUTES = 55;
function runStaleOrderSweep() {
  try {
    const expired = expireStaleOrders(STALE_ORDER_MINUTES);
    if (expired > 0) console.log(`${expired} verwaiste "Zahlung ausstehend"-Bestellung(en) abgelaufen, Lagerbestand freigegeben.`);
  } catch (err) {
    console.error("Fehler beim Aufräumen verwaister Bestellungen:", err);
  }
}
setInterval(runStaleOrderSweep, 15 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NovaShop-Server läuft auf http://localhost:${PORT}`);
  runStaleOrderSweep();
});
