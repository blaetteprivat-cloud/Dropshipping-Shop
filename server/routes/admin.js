const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { Users, Products, Orders, Notifications } = require("../lib/store");
const { currentUser, requireAdmin, publicUser } = require("../middleware/auth");
const { ORDER_STATUS } = require("../lib/order-status");

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post("/login", loginLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = Users.findByEmail(email);
  if (!user || user.role !== "admin") return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  const user = currentUser(req);
  if (!user || user.role !== "admin") return res.status(401).json({ user: null });
  res.json({ user: publicUser(user) });
});

router.use(requireAdmin);

/* -------------------- Produkte -------------------- */
router.get("/products", (req, res) => {
  res.json({ products: Products.listAllForAdmin() });
});

router.post("/products", (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const subtitle = String(b.subtitle || "").trim();
  const price = Number(b.price);
  const oldPrice = b.oldPrice !== undefined && b.oldPrice !== null && b.oldPrice !== "" ? Number(b.oldPrice) : null;
  const stock = Number(b.stock);
  const categories = Array.isArray(b.categories) ? b.categories : [];
  const badge = b.badge ? String(b.badge).trim() : null;

  if (!name || !subtitle) return res.status(400).json({ error: "Bitte Name und Kurzbeschreibung ausfüllen." });
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Bitte einen gültigen Preis angeben." });
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: "Bitte einen gültigen Lagerbestand angeben." });
  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
    return res.status(400).json({ error: "Der alte Preis muss höher als der neue Preis sein, sonst lässt sich kein Rabatt berechnen." });
  }
  if (categories.length === 0) return res.status(400).json({ error: "Bitte mindestens eine Kategorie auswählen." });

  const product = Products.create({
    name, subtitle, price, oldPrice, categories,
    icon: b.icon || "icon-package",
    tint: b.tint || "blue",
    badge,
    rating: 5,
    reviews: 0,
    stock,
  });
  res.status(201).json({ product });
});

router.put("/products/:id", (req, res) => {
  const existing = Products.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Produkt nicht gefunden." });
  const patch = {};
  const b = req.body || {};
  if (b.price !== undefined) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Bitte einen gültigen Preis angeben." });
    patch.price = price;
  }
  if (b.stock !== undefined) {
    const stock = Number(b.stock);
    if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: "Bitte einen gültigen Lagerbestand angeben." });
    patch.stock = stock;
  }
  if (b.active !== undefined) patch.active = !!b.active;
  if (b.name !== undefined) patch.name = String(b.name).trim();
  if (b.subtitle !== undefined) patch.subtitle = String(b.subtitle).trim();
  if (b.categories !== undefined) patch.categories = Array.isArray(b.categories) ? b.categories : [];

  const product = Products.update(req.params.id, patch);
  res.json({ product });
});

router.delete("/products/:id", (req, res) => {
  Products.delete(req.params.id);
  res.json({ ok: true });
});

/* -------------------- Bestellungen -------------------- */
const ORDER_STATUSES = [ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED];

router.get("/orders", (req, res) => {
  const orders = Orders.listAll().map((o) => {
    let customerName = o.guestName ? o.guestName + " (Gast)" : null;
    let customerEmail = o.guestEmail;
    if (o.userId) {
      const u = Users.findById(o.userId);
      if (u) { customerName = u.name; customerEmail = u.email; }
    }
    return Object.assign({}, o, { customerName: customerName || customerEmail || "—", customerEmail });
  });
  res.json({ orders });
});

router.patch("/orders/:id/status", (req, res) => {
  const status = String(req.body.status || "");
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Ungültiger Status." });
  const order = Orders.findById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });
  const updated = Orders.updateStatus(order.id, status);

  if (order.userId) {
    const STATUS_MESSAGES = {
      "In Bearbeitung": "wird bearbeitet.",
      Versendet: "wurde versendet und ist unterwegs zu dir!",
      Abgeschlossen: "wurde erfolgreich abgeschlossen.",
      Storniert: "wurde storniert.",
    };
    Notifications.create(order.userId, {
      type: "order-status",
      orderId: order.id,
      title: "Bestellung " + order.orderNumber,
      message: "Deine Bestellung " + order.orderNumber + " " + (STATUS_MESSAGES[status] || "wurde aktualisiert: " + status),
    });
  }
  res.json({ order: updated });
});

/* -------------------- Kunden -------------------- */
router.get("/customers", (req, res) => {
  const users = Users.listAll().map((u) => {
    const orders = Orders.listForUser(u.id);
    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    return Object.assign({}, u, { orderCount: orders.length, totalSpent: spent });
  });
  res.json({ customers: users });
});

module.exports = router;
