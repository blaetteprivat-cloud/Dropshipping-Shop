require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../server/db");
const { Users } = require("../server/lib/store");

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.error("ADMIN_EMAIL und ADMIN_PASSWORD müssen in der .env gesetzt sein.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD sollte mindestens 8 Zeichen lang sein.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = Users.findByEmail(email);

  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin', verified = 1 WHERE id = ?").run(passwordHash, existing.id);
    console.log(`Admin-Account aktualisiert: ${email}`);
  } else {
    Users.create({ name: "Admin", email, passwordHash, role: "admin", verified: true });
    console.log(`Admin-Account angelegt: ${email}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
