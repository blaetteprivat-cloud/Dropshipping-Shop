const express = require("express");
const bcrypt = require("bcryptjs");
const { Users, Orders, Notifications } = require("../lib/store");
const { currentUser, requireCustomer, publicUser } = require("../middleware/auth");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../lib/mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function logDevVerifyLink(email, token, err) {
  if (err && err.code === "BREVO_NOT_CONFIGURED") {
    const link = `${(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/verify.html?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    console.warn(`[Brevo nicht konfiguriert] Verifizierungslink für ${email}:\n  ${link}`);
    return true;
  }
  console.error("Verifizierungsmail konnte nicht gesendet werden:", err);
  return false;
}

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2) return res.status(400).json({ error: "Bitte gib deinen Namen ein." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });
  if (password.length < 6) return res.status(400).json({ error: "Das Passwort muss mindestens 6 Zeichen lang sein." });
  if (Users.findByEmail(email)) return res.status(409).json({ error: "Für diese E-Mail-Adresse existiert bereits ein Konto." });

  const passwordHash = await bcrypt.hash(password, 12);
  const token = Users.generateToken();
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const user = Users.create({ name, email, passwordHash, verified: false, verificationToken: token, verificationTokenExpires: expires });

  let emailFailed = false;
  try {
    await sendVerificationEmail(user, token);
  } catch (err) {
    const wasDevFallback = logDevVerifyLink(email, token, err);
    emailFailed = !wasDevFallback;
  }

  res.status(201).json({ email, name, emailFailed });
});

router.post("/resend-verification", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = Users.findByEmail(email);
  if (!user) return res.status(404).json({ error: "Kein Konto mit dieser E-Mail-Adresse gefunden." });
  if (user.verified) return res.status(400).json({ error: "Diese E-Mail-Adresse ist bereits bestätigt." });

  const token = Users.generateToken();
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  Users.setVerificationToken(user.id, token, expires);

  try {
    await sendVerificationEmail(user, token);
  } catch (err) {
    const wasDevFallback = logDevVerifyLink(email, token, err);
    if (!wasDevFallback) return res.status(502).json({ error: "E-Mail konnte nicht gesendet werden. Bitte versuch es später erneut." });
  }

  res.json({ email, name: user.name });
});

router.post("/verify", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const token = String(req.body.token || "");
  const user = Users.findByEmail(email);
  if (!user) return res.status(404).json({ error: "Kein Konto mit dieser E-Mail-Adresse gefunden." });

  if (user.verified) {
    req.session.userId = user.id;
    return res.json({ alreadyVerified: true, user: publicUser(user) });
  }
  if (!token || token !== user.verification_token) {
    return res.status(400).json({ error: "Der Bestätigungslink ist ungültig oder abgelaufen." });
  }
  if (user.verification_token_expires && new Date(user.verification_token_expires).getTime() < Date.now()) {
    return res.status(400).json({ error: "Der Bestätigungslink ist abgelaufen. Bitte fordere über die Anmeldung einen neuen an." });
  }
  Users.markVerified(user.id);
  req.session.userId = user.id;
  res.json({ alreadyVerified: false, user: publicUser(user) });
});

function logDevResetLink(email, token, err) {
  if (err && err.code === "BREVO_NOT_CONFIGURED") {
    const link = `${(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/reset-password.html?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    console.warn(`[Brevo nicht konfiguriert] Passwort-Reset-Link für ${email}:\n  ${link}`);
    return true;
  }
  console.error("Passwort-Reset-Mail konnte nicht gesendet werden:", err);
  return false;
}

/* Antwortet immer mit derselben generischen Nachricht, egal ob ein Konto mit dieser E-Mail
   existiert — sonst ließe sich über den Response-Unterschied durchprobieren, welche
   E-Mail-Adressen registriert sind (User-Enumeration). */
router.post("/forgot-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const genericResponse = { ok: true, message: "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen des Passworts gesendet." };
  if (!EMAIL_RE.test(email)) return res.json(genericResponse);

  const user = Users.findByEmail(email);
  if (!user || user.role !== "customer") return res.json(genericResponse);

  const token = Users.generateToken();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  Users.setResetToken(user.id, token, expires);

  try {
    await sendPasswordResetEmail(user, token);
  } catch (err) {
    logDevResetLink(email, token, err);
  }

  res.json(genericResponse);
});

router.post("/reset-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");

  if (password.length < 6) return res.status(400).json({ error: "Das Passwort muss mindestens 6 Zeichen lang sein." });

  const user = Users.findByEmail(email);
  if (!user || user.role !== "customer" || !token || token !== user.reset_token) {
    return res.status(400).json({ error: "Der Link zum Zurücksetzen ist ungültig oder abgelaufen." });
  }
  if (user.reset_token_expires && new Date(user.reset_token_expires).getTime() < Date.now()) {
    return res.status(400).json({ error: "Der Link zum Zurücksetzen ist abgelaufen. Bitte fordere einen neuen an." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  Users.setPassword(user.id, passwordHash);
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = Users.findByEmail(email);
  if (!user || user.role !== "customer") return res.status(401).json({ error: "Kein Konto mit dieser E-Mail-Adresse gefunden." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Falsches Passwort. Bitte versuch es erneut." });
  if (!user.verified) {
    return res.status(403).json({ error: "Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen Bestätigungslink geschickt.", code: "EMAIL_NOT_VERIFIED" });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  const user = currentUser(req);
  if (!user || user.role !== "customer") return res.status(401).json({ user: null });
  res.json({ user: publicUser(user) });
});

/* -------------------- Benachrichtigungen -------------------- */
router.get("/notifications", requireCustomer, (req, res) => {
  res.json({ notifications: Notifications.listForUser(req.user.id) });
});
router.post("/notifications/:id/read", requireCustomer, (req, res) => {
  Notifications.markRead(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});
router.post("/notifications/read-all", requireCustomer, (req, res) => {
  Notifications.markAllRead(req.user.id);
  res.json({ ok: true });
});

/* -------------------- Konto löschen & Datenexport (DSGVO Art. 17/20) -------------------- */
router.post("/delete-account", requireCustomer, async (req, res) => {
  const password = String(req.body.password || "");
  const ok = await bcrypt.compare(password, req.user.password_hash);
  if (!ok) return res.status(401).json({ error: "Falsches Passwort." });
  Users.anonymize(req.user.id);
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/export", requireCustomer, (req, res) => {
  const orders = Orders.listForUser(req.user.id);
  const notifications = Notifications.listForUser(req.user.id);
  res.setHeader("Content-Disposition", 'attachment; filename="novashop-daten.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    account: publicUser(req.user),
    orders,
    notifications,
  });
});

module.exports = router;
