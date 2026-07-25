const test = require("node:test");
const assert = require("node:assert/strict");
const { useIsolatedTestDb, cleanupTestDb } = require("./helpers/test-db");

const dbPath = useIsolatedTestDb();
const db = require("../server/db");
const { Products, Orders } = require("../server/lib/store");
const { expireStaleOrders } = require("../server/lib/fulfill-order");
const { ORDER_STATUS } = require("../server/lib/order-status");

test.after(() => cleanupTestDb(dbPath));

test("expireStaleOrders gibt reservierten Lagerbestand für abgebrochene Checkouts genau einmal frei", () => {
  const product = Products.create({ name: "Sweep-Produkt", subtitle: "x", price: 15, categories: ["beliebt"], stock: 10 });

  // Simuliert eine Checkout-Reservierung (server/routes/checkout.js): Bestand wird beim
  // Order-Anlegen sofort abgezogen, nicht erst bei Zahlungseingang.
  Products.decrementStock(product.id, 4);
  assert.equal(Products.findById(product.id).stock, 6);

  const order = Orders.create({
    userId: null,
    guestName: "Sweep",
    guestEmail: "sweep@example.com",
    subtotal: 60,
    shippingCost: 0,
    total: 60,
    address: { firstName: "A", lastName: "B", street: "S 1", zip: "12345", city: "C", country: "DE" },
    items: [{ id: product.id, name: product.name, qty: 4, price: 15 }],
  });
  db.prepare("UPDATE orders SET created_at = datetime('now', '-60 minutes') WHERE id = ?").run(order.id);

  const expiredCount = expireStaleOrders(55);
  assert.equal(expiredCount, 1);
  assert.equal(Orders.findById(order.id).status, ORDER_STATUS.FAILED);
  assert.equal(Products.findById(product.id).stock, 10, "Lagerbestand muss vollständig wiederhergestellt sein");

  // Erneuter Sweep-Lauf darf den bereits abgelaufenen Bestand nicht nochmal freigeben.
  const secondRun = expireStaleOrders(55);
  assert.equal(secondRun, 0);
  assert.equal(Products.findById(product.id).stock, 10, "darf Lagerbestand nicht doppelt freigeben");
});

test("expireStaleOrders lässt frische PENDING-Orders (und ihre Reservierung) unangetastet", () => {
  const product = Products.create({ name: "Frisch", subtitle: "x", price: 15, categories: ["beliebt"], stock: 10 });
  Products.decrementStock(product.id, 2);

  Orders.create({
    userId: null,
    guestName: "Frisch",
    guestEmail: "frisch@example.com",
    subtotal: 30,
    shippingCost: 0,
    total: 30,
    address: { firstName: "A", lastName: "B", street: "S 1", zip: "12345", city: "C", country: "DE" },
    items: [{ id: product.id, name: product.name, qty: 2, price: 15 }],
  });

  const expiredCount = expireStaleOrders(55);
  assert.equal(expiredCount, 0);
  assert.equal(Products.findById(product.id).stock, 8, "Reservierung einer frischen Order muss bestehen bleiben");
});
