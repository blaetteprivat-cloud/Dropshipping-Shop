const test = require("node:test");
const assert = require("node:assert/strict");
const { useIsolatedTestDb, cleanupTestDb } = require("./helpers/test-db");

const dbPath = useIsolatedTestDb();
const db = require("../server/db");
const { Products, Orders } = require("../server/lib/store");
const { ORDER_STATUS } = require("../server/lib/order-status");

test.after(() => cleanupTestDb(dbPath));

function makeOrder(overrides = {}) {
  const product = Products.create({ name: "Order-Test-Produkt", subtitle: "x", price: 20, categories: ["beliebt"], stock: 10 });
  return Orders.create(
    Object.assign(
      {
        userId: null,
        guestName: "Gast",
        guestEmail: "gast@example.com",
        subtotal: 20,
        shippingCost: 4.99,
        total: 24.99,
        address: { firstName: "A", lastName: "B", street: "S 1", zip: "12345", city: "C", country: "DE" },
        items: [{ id: product.id, name: product.name, qty: 1, price: 20 }],
      },
      overrides
    )
  );
}

test("Orders.create startet mit PENDING und einer eindeutigen Bestellnummer", () => {
  const order = makeOrder();
  assert.equal(order.status, ORDER_STATUS.PENDING);
  assert.match(order.orderNumber, /^NS-[A-F0-9]{6}$/);
});

test("markPaid wechselt nur von PENDING, ist danach ein No-Op (Webhook-Idempotenz)", () => {
  const order = makeOrder();
  Orders.markPaid(order.id, { paymentIntentId: "pi_1", paymentMethod: "card" });
  const paid = Orders.findById(order.id);
  assert.equal(paid.status, ORDER_STATUS.PROCESSING);
  assert.equal(paid.stripePaymentIntentId, "pi_1");

  // Zweiter Aufruf (z.B. doppelt zugestelltes Stripe-Webhook-Event) darf nichts mehr ändern.
  Orders.markPaid(order.id, { paymentIntentId: "pi_2", paymentMethod: "card" });
  const stillPaid = Orders.findById(order.id);
  assert.equal(stillPaid.stripePaymentIntentId, "pi_1");
});

test("markFailed gibt true genau einmal zurück (atomarer PENDING->FAILED-Übergang)", () => {
  const order = makeOrder();
  assert.equal(Orders.markFailed(order.id), true);
  assert.equal(Orders.findById(order.id).status, ORDER_STATUS.FAILED);
  assert.equal(Orders.markFailed(order.id), false, "zweiter Aufruf auf bereits fehlgeschlagener Order darf nicht wieder true melden");
});

test("markFailed auf einer bereits bezahlten Order setzt sie nicht zurück", () => {
  const order = makeOrder();
  Orders.markPaid(order.id, { paymentIntentId: "pi_1", paymentMethod: "card" });
  assert.equal(Orders.markFailed(order.id), false);
  assert.equal(Orders.findById(order.id).status, ORDER_STATUS.PROCESSING);
});

test("listStalePending liefert nur PENDING-Orders älter als der Schwellwert", () => {
  const fresh = makeOrder();
  const stale = makeOrder();
  db.prepare("UPDATE orders SET created_at = datetime('now', '-60 minutes') WHERE id = ?").run(stale.id);

  const staleIds = Orders.listStalePending(55).map((o) => o.id);
  assert.ok(staleIds.includes(stale.id));
  assert.ok(!staleIds.includes(fresh.id));
});

test("listForGuestEmail ist beim Abfragen case-insensitiv und nur für Gastbestellungen", () => {
  // guestEmail kommt hier schon kleingeschrieben an, genau wie es server/routes/checkout.js vor
  // dem Aufruf von Orders.create() bereits normalisiert (Orders.create selbst normalisiert nicht).
  makeOrder({ guestEmail: "case@example.com" });
  const found = Orders.listForGuestEmail("Case@Example.com");
  assert.equal(found.length, 1);
});
