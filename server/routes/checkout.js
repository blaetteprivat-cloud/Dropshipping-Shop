const express = require("express");
const { Products, Orders } = require("../lib/store");
const { currentUser } = require("../middleware/auth");
const { getStripe } = require("../lib/stripe");
const { fulfillPaidOrder } = require("../lib/fulfill-order");
const { ORDER_STATUS } = require("../lib/order-status");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{4,5}$/;
const COUNTRIES = ["DE", "AT", "CH"];
const FREE_SHIPPING_THRESHOLD = 49;
const SHIPPING_COST = 4.99;
/* Wie lange eine Stripe-Checkout-Session (und die dafür reservierte Lagerbestand-Menge, siehe
   unten) maximal offen bleibt, bevor Stripe sie selbst als abgelaufen markiert. Muss zwischen 30
   und 1440 Minuten liegen (Stripe-Vorgabe). Der Aufräum-Sweep in server/index.js verwendet einen
   Puffer oberhalb dieses Werts, falls der "checkout.session.expired"-Webhook nie ankommt. */
const SESSION_EXPIRY_MINUTES = 40;

router.post("/create-session", async (req, res, next) => {
  try {
    const body = req.body || {};
    const user = currentUser(req);
    const email = user ? user.email : String(body.email || "").trim().toLowerCase();
    const address = body.address || {};
    const firstName = String(address.firstName || "").trim();
    const lastName = String(address.lastName || "").trim();
    const street = String(address.street || "").trim();
    const zip = String(address.zip || "").trim();
    const city = String(address.city || "").trim();
    const country = COUNTRIES.includes(address.country) ? address.country : "DE";

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });
    if (!firstName || !lastName) return res.status(400).json({ error: "Bitte gib Vor- und Nachnamen ein." });
    if (!street) return res.status(400).json({ error: "Bitte gib deine Straße und Hausnummer ein." });
    if (!ZIP_RE.test(zip)) return res.status(400).json({ error: "Bitte gib eine gültige Postleitzahl ein." });
    if (!city) return res.status(400).json({ error: "Bitte gib deinen Ort ein." });

    const requestedItems = Array.isArray(body.items) ? body.items : [];
    if (requestedItems.length === 0) return res.status(400).json({ error: "Dein Warenkorb ist leer." });

    const items = [];
    for (const reqItem of requestedItems) {
      const qty = Math.floor(Number(reqItem.qty));
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const product = Products.findById(String(reqItem.id));
      if (!product || !product.active) {
        return res.status(409).json({ error: `Ein Artikel in deinem Warenkorb ist nicht mehr verfügbar.` });
      }
      if (product.stock < qty) {
        return res.status(409).json({ error: `${product.name} ist nur noch ${product.stock}× auf Lager.` });
      }
      items.push({ id: product.id, name: product.name, qty, price: product.price });
    }
    if (items.length === 0) return res.status(400).json({ error: "Dein Warenkorb ist leer." });

    const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shippingCost;

    /* getStripe() zuerst aufrufen (vor jeder Lagerbestand-Reservierung/Orders.create()): wenn
       Stripe nicht konfiguriert ist, soll erst gar keine Bestellung angelegt und kein Lagerbestand
       reserviert werden — sonst bleibt bei jedem Checkout-Versuch ohne Stripe-Key eine für immer
       "Zahlung ausstehend"-Karteileiche in der DB zurück. */
    const stripe = getStripe();
    const lineItems = items.map((it) => ({
      price_data: { currency: "eur", product_data: { name: it.name }, unit_amount: Math.round(it.price * 100) },
      quantity: it.qty,
    }));
    if (shippingCost > 0) {
      lineItems.push({
        price_data: { currency: "eur", product_data: { name: "Versand" }, unit_amount: Math.round(shippingCost * 100) },
        quantity: 1,
      });
    }

    /* Lagerbestand ab hier reservieren (statt erst bei Zahlungseingang, siehe fulfill-order.js) —
       sonst könnten zwei Kunden gleichzeitig das letzte Stück kaufen und einer bezahlt für nicht
       vorhandene Ware. Zwischen der Bestandsprüfung oben und hier liegt kein `await`, better-
       sqlite3 ist synchron und Node einfädig: kein anderer Request kann dazwischen denselben
       Bestand reservieren. Reservierungen ohne Zahlung werden über die Stripe-Session-Ablaufzeit
       unten (SESSION_EXPIRY_MINUTES) plus den Aufräum-Sweep in server/index.js wieder freigegeben. */
    for (const it of items) Products.decrementStock(it.id, it.qty);

    const order = Orders.create({
      userId: user ? user.id : null,
      guestName: user ? null : firstName + " " + lastName,
      guestEmail: user ? null : email,
      subtotal,
      shippingCost,
      total,
      address: { firstName, lastName, street, zip, city, country },
      items,
    });

    const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: email,
        success_url: `${baseUrl}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/shop.html`,
        metadata: { orderId: String(order.id), orderNumber: order.orderNumber },
        expires_at: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_MINUTES * 60,
      });
    } catch (stripeErr) {
      /* Stripe hat die Session-Erstellung abgelehnt (z.B. ungültiger Key, Netzwerkfehler) —
         die gerade angelegte Order und die eben reservierte Menge wieder freigeben, statt sie
         als Datenmüll bzw. blockierten Lagerbestand liegen zu lassen. */
      for (const it of items) Products.restoreStock(it.id, it.qty);
      Orders.delete(order.id);
      throw stripeErr;
    }

    Orders.attachStripeSession(order.id, session.id);
    res.json({ url: session.url, orderNumber: order.orderNumber });
  } catch (err) {
    if (err.code === "STRIPE_NOT_CONFIGURED") {
      console.error(err.message);
      return res.status(503).json({ error: err.publicMessage || err.message });
    }
    next(err);
  }
});

/* Öffentlich, aber nur mit der langen, zufälligen Stripe-Session-ID abrufbar — genau das
   Vertrauensmodell, das Stripes eigene success_url-Weiterleitung ohnehin verwendet.
   Fragt bei noch "ausstehender" Bestellung live bei Stripe nach: Fallback, falls der Webhook
   (z. B. wegen falschem/fehlendem STRIPE_WEBHOOK_SECRET) nie ankam. */
router.get("/session/:sessionId", async (req, res) => {
  let order = Orders.findByStripeSessionId(req.params.sessionId);
  if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });

  if (order.status === ORDER_STATUS.PENDING) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      if (session.payment_status === "paid") {
        order = await fulfillPaidOrder(order, session);
      } else if (session.status === "expired" && Orders.markFailed(order.id)) {
        for (const item of order.items) Products.restoreStock(item.id, item.qty);
        order = Orders.findById(order.id);
      }
    } catch (err) {
      console.error("Live-Abgleich mit Stripe fehlgeschlagen:", err);
    }
  }

  res.json({
    orderNumber: order.orderNumber,
    status: order.status,
    statusCode: order.statusCode,
    total: order.total,
    items: order.items,
    email: order.guestEmail,
  });
});

module.exports = router;
