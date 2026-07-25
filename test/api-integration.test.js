const test = require("node:test");
const assert = require("node:assert/strict");
const { useIsolatedTestDb, cleanupTestDb } = require("./helpers/test-db");

const dbPath = useIsolatedTestDb();
const app = require("../server/index");

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  cleanupTestDb(dbPath);
  await new Promise((resolve) => server.close(resolve));
  /* better-sqlite3-session-store startet beim Erzeugen des SqliteStore einen setInterval zum
     Aufräumen abgelaufener Sessions, ohne Möglichkeit, ihn zu stoppen oder zu unref()en (siehe
     node_modules/better-sqlite3-session-store/src/index.js) — hält den Testprozess sonst ewig am
     Leben. In Produktion ist das erwünscht (Server soll laufen bleiben); hier erzwingen wir das
     Prozessende nach dem Aufräumen. */
  process.exit(0);
});

test("GET /api/products liefert das geseedete Sortiment", async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const products = await res.json();
  assert.ok(Array.isArray(products));
  assert.ok(products.length > 0);
});

test("GET /api/products/:id liefert 404 für unbekannte IDs statt zu crashen", async () => {
  const res = await fetch(`${baseUrl}/api/products/does-not-exist`);
  assert.equal(res.status, 404);
});

test("POST /api/checkout/create-session validiert Pflichtfelder vor jedem Stripe-Aufruf", async () => {
  const res = await fetch(`${baseUrl}/api/checkout/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /E-Mail/);
});

test("POST /api/checkout/create-session lehnt leeren Warenkorb ab, auch mit gültiger Adresse", async () => {
  const res = await fetch(`${baseUrl}/api/checkout/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kunde@example.com",
      address: { firstName: "A", lastName: "B", street: "Musterstr. 1", zip: "12345", city: "Musterstadt" },
      items: [],
    }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Warenkorb/);
});

test("POST /api/checkout/create-session lehnt unbekannte Produkt-IDs mit 409 ab, ohne eine Order anzulegen", async () => {
  const res = await fetch(`${baseUrl}/api/checkout/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kunde@example.com",
      address: { firstName: "A", lastName: "B", street: "Musterstr. 1", zip: "12345", city: "Musterstadt" },
      items: [{ id: "does-not-exist", qty: 1 }],
    }),
  });
  assert.equal(res.status, 409);
});

test("POST /api/auth/register + doppelte Registrierung wird mit 409 abgelehnt", async () => {
  const res1 = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "apitest@example.com", password: "testpass123" }),
  });
  assert.equal(res1.status, 201);

  const res2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "apitest@example.com", password: "testpass123" }),
  });
  assert.equal(res2.status, 409);
});

test("POST /api/auth/forgot-password antwortet identisch für existierende und unbekannte E-Mails (keine Enumeration)", async () => {
  const known = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "apitest@example.com" }),
  });
  const unknown = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "definitiv-nicht-registriert@example.com" }),
  });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(await known.json(), await unknown.json());
});

test("POST /api/auth/reset-password lehnt ungültige Tokens ab", async () => {
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "apitest@example.com", token: "wrong-token", password: "newpassword1" }),
  });
  assert.equal(res.status, 400);
});

test("Admin-Endpunkte verlangen eine Session", async () => {
  const res = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(res.status, 401);
});

test("GET /api/orders/guest ohne Angaben liefert 400, nicht 500", async () => {
  const res = await fetch(`${baseUrl}/api/orders/guest`);
  assert.equal(res.status, 400);
});

test("robots.txt und sitemap.xml werden ausgeliefert", async () => {
  const robots = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robots.status, 200);
  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
});
