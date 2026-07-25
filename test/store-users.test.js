const test = require("node:test");
const assert = require("node:assert/strict");
const { useIsolatedTestDb, cleanupTestDb } = require("./helpers/test-db");

const dbPath = useIsolatedTestDb();
const { Users } = require("../server/lib/store");

test.after(() => cleanupTestDb(dbPath));

test("findByEmail ist case-insensitiv und trimmt Leerraum", () => {
  Users.create({ name: "Anna", email: "anna@example.com", passwordHash: "hash" });
  const found = Users.findByEmail("  Anna@Example.com  ");
  assert.ok(found);
  assert.equal(found.email, "anna@example.com");
});

test("setResetToken + setPassword: Token ist nach Passwort-Reset gelöscht (Einmal-Nutzung)", () => {
  const user = Users.create({ name: "Bob", email: "bob@example.com", passwordHash: "old-hash" });
  Users.setResetToken(user.id, "abc123", new Date(Date.now() + 3600_000).toISOString());
  const withToken = Users.findById(user.id);
  assert.equal(withToken.reset_token, "abc123");

  Users.setPassword(user.id, "new-hash");
  const afterReset = Users.findById(user.id);
  assert.equal(afterReset.password_hash, "new-hash");
  assert.equal(afterReset.reset_token, null);
  assert.equal(afterReset.reset_token_expires, null);
});

test("anonymize entfernt den Personenbezug, ohne den Datensatz zu löschen (DSGVO Art. 17)", () => {
  const user = Users.create({ name: "Carla", email: "carla@example.com", passwordHash: "hash" });
  const originalHash = user.password_hash;
  Users.anonymize(user.id);
  const anonymized = Users.findById(user.id);
  assert.equal(anonymized.name, "Gelöschter Nutzer");
  assert.notEqual(anonymized.email, "carla@example.com");
  assert.match(anonymized.email, /@geloescht\.invalid$/);
  assert.notEqual(anonymized.password_hash, originalHash);
  assert.equal(Users.findByEmail("carla@example.com"), null);
});
