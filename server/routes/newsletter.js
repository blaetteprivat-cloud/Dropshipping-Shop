const express = require("express");
const { subscribeToNewsletter } = require("../lib/brevo");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/subscribe", async (req, res, next) => {
  try {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    // Honeypot: unsichtbares Feld im Formular, das nur Bots ausfüllen.
    const honeypot = String((req.body || {}).website || "").trim();
    if (honeypot) return res.json({ ok: true });

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });

    await subscribeToNewsletter(email);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "BREVO_NOT_CONFIGURED") {
      console.error(err.message);
      return res.status(503).json({ error: err.publicMessage || err.message });
    }
    next(err);
  }
});

module.exports = router;
