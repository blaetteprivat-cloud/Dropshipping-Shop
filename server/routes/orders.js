const express = require("express");
const rateLimit = require("express-rate-limit");
const { Orders } = require("../lib/store");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

/* Ohne Login abrufbar (Bestellnummer + E-Mail) — begrenzt Brute-Force-/Enumerationsversuche,
   analog zu den Limits auf /api/auth und /api/newsletter. */
const guestLookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.get("/", requireCustomer, (req, res) => {
  res.json({ orders: Orders.listForUser(req.user.id) });
});

router.get("/guest", guestLookupLimiter, (req, res) => {
  const orderNumber = String(req.query.orderNumber || "").trim().toUpperCase();
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!orderNumber || !email) return res.status(400).json({ error: "Bitte Bestellnummer und E-Mail-Adresse angeben." });

  const order = Orders.findByOrderNumber(orderNumber);
  if (!order || order.userId || (order.guestEmail || "").toLowerCase() !== email) {
    return res.status(404).json({ error: "Keine Bestellung mit diesen Angaben gefunden." });
  }
  res.json({ order });
});

module.exports = router;
