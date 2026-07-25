const { sendTransactionalEmail } = require("./brevo");

function baseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatEuro(value) {
  return Number(value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function wrapEmail(title, bodyHtml) {
  return `<!doctype html><html lang="de"><body style="margin:0;padding:32px 16px;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1c1a17;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="font-size:20px;font-weight:700;margin:0 0 24px;">NovaShop</p>
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#8a8378;">NovaShop &middot; Diese E-Mail wurde automatisch generiert.</p>
    </div>
  </body></html>`;
}

async function sendVerificationEmail(user, token) {
  const link = `${baseUrl()}/verify.html?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
  const html = wrapEmail("Bitte bestätige deine E-Mail-Adresse", `
    <p>Hallo ${escapeHtml(user.name)},</p>
    <p>schön, dass du bei NovaShop dabei bist! Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
    <p><a href="${link}" style="display:inline-block;background:#9c7a52;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">E-Mail-Adresse bestätigen</a></p>
    <p style="font-size:13px;color:#5c574d;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
    <p style="font-size:13px;color:#5c574d;">Falls du dich nicht registriert hast, kannst du diese Nachricht ignorieren.</p>
  `);
  return sendTransactionalEmail({ to: user.email, toName: user.name, subject: "Bitte bestätige deine E-Mail-Adresse", html });
}

async function sendPasswordResetEmail(user, token) {
  const link = `${baseUrl()}/reset-password.html?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
  const html = wrapEmail("Passwort zurücksetzen", `
    <p>Hallo ${escapeHtml(user.name)},</p>
    <p>du hast angefragt, dein NovaShop-Passwort zurückzusetzen. Klicke auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
    <p><a href="${link}" style="display:inline-block;background:#9c7a52;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Neues Passwort vergeben</a></p>
    <p style="font-size:13px;color:#5c574d;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
    <p style="font-size:13px;color:#5c574d;">Der Link ist eine Stunde gültig. Falls du das nicht warst, kannst du diese Nachricht ignorieren — dein Passwort bleibt unverändert.</p>
  `);
  return sendTransactionalEmail({ to: user.email, toName: user.name, subject: "Passwort zurücksetzen", html });
}

async function sendOrderConfirmationEmail(order, toEmail, toName) {
  const itemsHtml = order.items
    .map((it) => `<tr><td style="padding:4px 0;">${it.qty}× ${escapeHtml(it.name)}</td><td style="padding:4px 0;text-align:right;">${formatEuro(it.price * it.qty)}</td></tr>`)
    .join("");
  const html = wrapEmail("Danke für deine Bestellung!", `
    <p>Hallo ${escapeHtml(toName || "")},</p>
    <p>wir haben deine Bestellung <strong>${order.orderNumber}</strong> erhalten und bearbeiten sie jetzt.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${itemsHtml}
      <tr><td style="padding-top:12px;font-weight:700;">Gesamt</td><td style="padding-top:12px;text-align:right;font-weight:700;">${formatEuro(order.total)}</td></tr>
    </table>
    <p style="font-size:13px;color:#5c574d;">Du kannst den Status deiner Bestellung jederzeit unter „Mein Konto“ einsehen${toName ? "" : " (Bestellnummer + diese E-Mail-Adresse genügen auch ohne Konto)"}.</p>
  `);
  return sendTransactionalEmail({ to: toEmail, toName, subject: `Bestellbestätigung ${order.orderNumber}`, html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmationEmail };
