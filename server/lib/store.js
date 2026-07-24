const crypto = require("crypto");
const db = require("../db");

/* ------------------------------- Users ------------------------------- */

const Users = {
  create({ name, email, passwordHash, role = "customer", verified = false, verificationToken = null, verificationTokenExpires = null }) {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, verified, verification_token, verification_token_expires)
      VALUES (@name, @email, @passwordHash, @role, @verified, @verificationToken, @verificationTokenExpires)
    `);
    const info = stmt.run({ name, email, passwordHash, role, verified: verified ? 1 : 0, verificationToken, verificationTokenExpires });
    return Users.findById(info.lastInsertRowid);
  },
  findById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
  },
  findByEmail(email) {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase()) || null;
  },
  setVerificationToken(id, token, expiresAt) {
    db.prepare("UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?").run(token, expiresAt, id);
  },
  markVerified(id) {
    db.prepare("UPDATE users SET verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?").run(id);
  },
  listAll() {
    return db.prepare("SELECT id, name, email, role, verified, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC").all();
  },
  generateToken() {
    return crypto.randomBytes(24).toString("hex");
  },
  /* Löscht das Konto DSGVO-konform durch Anonymisierung statt Hard-Delete: Bestellungen bleiben
     wegen gesetzlicher Aufbewahrungspflichten (§ 147 AO, § 257 HGB, 6–10 Jahre) erhalten, verlieren
     aber über das anonymisierte Konto jeden Personenbezug. Das Passwort wird durch einen zufälligen,
     nie ausgebbaren Hash ersetzt, damit ein Login mit dem alten Passwort danach unmöglich ist. */
  anonymize(id) {
    const anonEmail = `geloescht-${id}-${crypto.randomBytes(4).toString("hex")}@geloescht.invalid`;
    db.prepare(`
      UPDATE users SET name = 'Gelöschter Nutzer', email = ?, password_hash = ?,
        verification_token = NULL, verification_token_expires = NULL
      WHERE id = ?
    `).run(anonEmail, crypto.randomBytes(32).toString("hex"), id);
  },
};

/* ------------------------------ Products ------------------------------ */

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    categories: JSON.parse(row.categories || "[]"),
    icon: row.icon,
    tint: row.tint,
    badge: row.badge,
    rating: row.rating,
    reviews: row.reviews,
    stock: row.stock,
    active: !!row.active,
  };
}

const Products = {
  listActive() {
    return db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY rowid ASC").all().map(rowToProduct);
  },
  listAllForAdmin() {
    return db.prepare("SELECT * FROM products ORDER BY rowid ASC").all().map(rowToProduct);
  },
  findById(id) {
    return rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id));
  },
  create(product) {
    const id = "p-" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
    db.prepare(`
      INSERT INTO products (id, name, subtitle, description, price, old_price, categories, icon, tint, badge, rating, reviews, stock, active)
      VALUES (@id, @name, @subtitle, @description, @price, @oldPrice, @categories, @icon, @tint, @badge, @rating, @reviews, @stock, 1)
    `).run({
      id,
      name: product.name,
      subtitle: product.subtitle || null,
      description: product.description || null,
      price: product.price,
      oldPrice: product.oldPrice || null,
      categories: JSON.stringify(product.categories || []),
      icon: product.icon || null,
      tint: product.tint || null,
      badge: product.badge || null,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      stock: product.stock || 0,
    });
    return Products.findById(id);
  },
  update(id, patch) {
    const current = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!current) return null;
    const next = {
      name: patch.name !== undefined ? patch.name : current.name,
      subtitle: patch.subtitle !== undefined ? patch.subtitle : current.subtitle,
      description: patch.description !== undefined ? patch.description : current.description,
      price: patch.price !== undefined ? patch.price : current.price,
      oldPrice: patch.oldPrice !== undefined ? patch.oldPrice : current.old_price,
      categories: patch.categories !== undefined ? JSON.stringify(patch.categories) : current.categories,
      icon: patch.icon !== undefined ? patch.icon : current.icon,
      tint: patch.tint !== undefined ? patch.tint : current.tint,
      badge: patch.badge !== undefined ? patch.badge : current.badge,
      rating: patch.rating !== undefined ? patch.rating : current.rating,
      reviews: patch.reviews !== undefined ? patch.reviews : current.reviews,
      stock: patch.stock !== undefined ? patch.stock : current.stock,
      active: patch.active !== undefined ? (patch.active ? 1 : 0) : current.active,
    };
    db.prepare(`
      UPDATE products SET name=@name, subtitle=@subtitle, description=@description, price=@price, old_price=@oldPrice,
        categories=@categories, icon=@icon, tint=@tint, badge=@badge, rating=@rating, reviews=@reviews, stock=@stock,
        active=@active, updated_at=datetime('now')
      WHERE id=@id
    `).run({ ...next, id });
    return Products.findById(id);
  },
  delete(id) {
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
  },
  decrementStock(id, qty) {
    db.prepare("UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime('now') WHERE id = ?").run(qty, id);
  },
};

/* ------------------------------- Orders ------------------------------- */

function generateOrderNumber() {
  return "NS-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function rowToOrder(row, items) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    status: row.status,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    total: row.total,
    payment: row.payment_method,
    address: JSON.parse(row.address_json || "{}"),
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    date: row.created_at,
    items: items || [],
  };
}

const Orders = {
  create({ userId, guestName, guestEmail, subtotal, shippingCost, total, address, items }) {
    let orderNumber = generateOrderNumber();
    for (let i = 0; i < 5; i++) {
      const clash = db.prepare("SELECT 1 FROM orders WHERE order_number = ?").get(orderNumber);
      if (!clash) break;
      orderNumber = generateOrderNumber();
    }
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, user_id, guest_name, guest_email, status, subtotal, shipping_cost, total, address_json)
      VALUES (@orderNumber, @userId, @guestName, @guestEmail, 'Zahlung ausstehend', @subtotal, @shippingCost, @total, @addressJson)
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name_snapshot, qty, price_snapshot)
      VALUES (@orderId, @productId, @name, @qty, @price)
    `);
    const run = db.transaction(() => {
      const info = insertOrder.run({
        orderNumber,
        userId: userId || null,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
        subtotal,
        shippingCost,
        total,
        addressJson: JSON.stringify(address || {}),
      });
      for (const item of items) {
        insertItem.run({ orderId: info.lastInsertRowid, productId: item.id, name: item.name, qty: item.qty, price: item.price });
      }
      return info.lastInsertRowid;
    });
    const id = run();
    return Orders.findById(id);
  },
  findById(id) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    if (!row) return null;
    const items = db.prepare("SELECT product_id AS id, name_snapshot AS name, qty, price_snapshot AS price FROM order_items WHERE order_id = ?").all(id);
    return rowToOrder(row, items);
  },
  findByOrderNumber(orderNumber) {
    const row = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
    if (!row) return null;
    return Orders.findById(row.id);
  },
  findByStripeSessionId(sessionId) {
    const row = db.prepare("SELECT * FROM orders WHERE stripe_checkout_session_id = ?").get(sessionId);
    if (!row) return null;
    return Orders.findById(row.id);
  },
  attachStripeSession(orderId, sessionId) {
    db.prepare("UPDATE orders SET stripe_checkout_session_id = ?, updated_at = datetime('now') WHERE id = ?").run(sessionId, orderId);
  },
  markPaid(orderId, { paymentIntentId, paymentMethod }) {
    db.prepare(`
      UPDATE orders SET status = 'In Bearbeitung', stripe_payment_intent_id = ?, payment_method = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'Zahlung ausstehend'
    `).run(paymentIntentId || null, paymentMethod || null, orderId);
  },
  delete(orderId) {
    db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
  },
  markFailed(orderId) {
    db.prepare(`
      UPDATE orders SET status = 'Zahlung fehlgeschlagen', updated_at = datetime('now')
      WHERE id = ? AND status = 'Zahlung ausstehend'
    `).run(orderId);
  },
  updateStatus(orderId, status) {
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, orderId);
    return Orders.findById(orderId);
  },
  listForUser(userId) {
    const rows = db.prepare("SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    return rows.map((r) => Orders.findById(r.id));
  },
  listForGuestEmail(email) {
    const rows = db.prepare("SELECT id FROM orders WHERE guest_email = ? AND user_id IS NULL ORDER BY created_at DESC").all(String(email).trim().toLowerCase());
    return rows.map((r) => Orders.findById(r.id));
  },
  listAll() {
    const rows = db.prepare("SELECT id FROM orders ORDER BY created_at DESC").all();
    return rows.map((r) => Orders.findById(r.id));
  },
};

/* ---------------------------- Notifications ---------------------------- */

const Notifications = {
  create(userId, { type, orderId, title, message }) {
    db.prepare(`
      INSERT INTO notifications (user_id, type, order_id, title, message) VALUES (?, ?, ?, ?, ?)
    `).run(userId, type || null, orderId || null, title || null, message || null);
  },
  listForUser(userId) {
    return db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(userId).map((r) => ({
      id: r.id, type: r.type, orderId: r.order_id, title: r.title, message: r.message, read: !!r.read, date: r.created_at,
    }));
  },
  unreadCount(userId) {
    return db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0").get(userId).c;
  },
  markRead(userId, id) {
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(id, userId);
  },
  markAllRead(userId) {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
  },
};

module.exports = { Users, Products, Orders, Notifications };
