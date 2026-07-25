const test = require("node:test");
const assert = require("node:assert/strict");
const { useIsolatedTestDb, cleanupTestDb } = require("./helpers/test-db");

const dbPath = useIsolatedTestDb();
const { Products } = require("../server/lib/store");

test.after(() => cleanupTestDb(dbPath));

test("Products.create + findById round-trips fields", () => {
  const product = Products.create({
    name: "Test-Produkt",
    subtitle: "Kurzbeschreibung",
    price: 19.99,
    oldPrice: 24.99,
    categories: ["beliebt", "elektronik"],
    icon: "icon-package",
    tint: "blue",
    badge: "Neu",
    rating: 4.5,
    reviews: 3,
    stock: 10,
  });
  assert.ok(product.id.startsWith("p-"));
  const found = Products.findById(product.id);
  assert.equal(found.name, "Test-Produkt");
  assert.deepEqual(found.categories, ["beliebt", "elektronik"]);
  assert.equal(found.stock, 10);
  assert.equal(found.active, true);
});

test("decrementStock never goes below zero", () => {
  const product = Products.create({ name: "Knapp", subtitle: "x", price: 1, categories: ["beliebt"], stock: 3 });
  Products.decrementStock(product.id, 2);
  assert.equal(Products.findById(product.id).stock, 1);
  Products.decrementStock(product.id, 5); // mehr als vorhanden
  assert.equal(Products.findById(product.id).stock, 0);
});

test("restoreStock is the inverse of decrementStock (Reservierungs-Rollback)", () => {
  const product = Products.create({ name: "Reserviert", subtitle: "x", price: 1, categories: ["beliebt"], stock: 5 });
  Products.decrementStock(product.id, 3);
  assert.equal(Products.findById(product.id).stock, 2);
  Products.restoreStock(product.id, 3);
  assert.equal(Products.findById(product.id).stock, 5);
});

test("update() only changes provided fields, lässt den Rest unangetastet", () => {
  const product = Products.create({ name: "Original", subtitle: "Sub", price: 10, categories: ["beliebt"], stock: 5 });
  const updated = Products.update(product.id, { price: 12.5 });
  assert.equal(updated.price, 12.5);
  assert.equal(updated.name, "Original");
  assert.equal(updated.stock, 5);
});

test("delete() entfernt das Produkt", () => {
  const product = Products.create({ name: "Weg", subtitle: "x", price: 1, categories: ["beliebt"], stock: 1 });
  Products.delete(product.id);
  assert.equal(Products.findById(product.id), null);
});

test("listActive() liefert nur aktive Produkte", () => {
  const active = Products.create({ name: "Sichtbar", subtitle: "x", price: 1, categories: ["beliebt"], stock: 1 });
  const inactive = Products.create({ name: "Versteckt", subtitle: "x", price: 1, categories: ["beliebt"], stock: 1 });
  Products.update(inactive.id, { active: false });
  const ids = Products.listActive().map((p) => p.id);
  assert.ok(ids.includes(active.id));
  assert.ok(!ids.includes(inactive.id));
});
