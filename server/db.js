const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { ORDER_STATUS } = require("./lib/order-status");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "novashop.sqlite");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    verification_token_expires TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    price REAL NOT NULL,
    old_price REAL,
    categories TEXT NOT NULL DEFAULT '[]',
    icon TEXT,
    tint TEXT,
    badge TEXT,
    rating REAL NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id),
    guest_name TEXT,
    guest_email TEXT,
    status TEXT NOT NULL DEFAULT '${ORDER_STATUS.PENDING}',
    subtotal REAL NOT NULL,
    shipping_cost REAL NOT NULL,
    total REAL NOT NULL,
    payment_method TEXT,
    address_json TEXT NOT NULL,
    stripe_checkout_session_id TEXT,
    stripe_payment_intent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name_snapshot TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price_snapshot REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT,
    order_id INTEGER,
    title TEXT,
    message TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);

/* Migration für bestehende DBs: CREATE TABLE IF NOT EXISTS legt neue Spalten nicht in
   bereits existierenden Tabellen an. Tabellen-/Spaltennamen sind feste Konstanten hier
   im Code, nie Nutzereingaben — String-Interpolation in die DDL ist daher unbedenklich. */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("users", "reset_token", "TEXT");
ensureColumn("users", "reset_token_expires", "TEXT");

function seedProductsIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM products").get();
  if (count > 0) return;
  const { SEED_PRODUCTS } = require("./seed-data");
  const insert = db.prepare(`
    INSERT INTO products (id, name, subtitle, description, price, old_price, categories, icon, tint, badge, rating, reviews, stock, active)
    VALUES (@id, @name, @subtitle, @description, @price, @oldPrice, @categories, @icon, @tint, @badge, @rating, @reviews, @stock, 1)
  `);
  const insertAll = db.transaction((products) => {
    for (const p of products) {
      insert.run({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle || null,
        description: p.description || null,
        price: p.price,
        oldPrice: p.oldPrice || null,
        categories: JSON.stringify(p.categories || []),
        icon: p.icon || null,
        tint: p.tint || null,
        badge: p.badge || null,
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        stock: p.stock || 0,
      });
    }
  });
  insertAll(SEED_PRODUCTS);
  console.log(`Seeded ${SEED_PRODUCTS.length} products.`);
}

seedProductsIfEmpty();

module.exports = db;
