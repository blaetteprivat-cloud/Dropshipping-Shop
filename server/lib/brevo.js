const BREVO_API_BASE = "https://api.brevo.com/v3";

function requireApiKey() {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    const err = new Error("BREVO_API_KEY fehlt in der .env — E-Mail-/Newsletter-Versand ist nicht konfiguriert.");
    err.code = "BREVO_NOT_CONFIGURED";
    err.publicMessage = "Diese Funktion ist momentan nicht verfügbar. Bitte versuch es später erneut.";
    throw err;
  }
  return key;
}

async function sendTransactionalEmail({ to, toName, subject, html }) {
  const apiKey = requireApiKey();
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "NovaShop";
  if (!senderEmail) {
    const err = new Error("BREVO_SENDER_EMAIL fehlt in der .env — E-Mail-Versand ist nicht konfiguriert.");
    err.code = "BREVO_NOT_CONFIGURED";
    err.publicMessage = "Diese Funktion ist momentan nicht verfügbar. Bitte versuch es später erneut.";
    throw err;
  }
  const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, name: toName || undefined }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo E-Mail-Versand fehlgeschlagen (${res.status}): ${text}`);
  }
  return res.json();
}

async function subscribeToNewsletter(email) {
  const apiKey = requireApiKey();
  const listId = process.env.BREVO_NEWSLETTER_LIST_ID;
  if (!listId) {
    const err = new Error("BREVO_NEWSLETTER_LIST_ID fehlt in der .env — Newsletter-Anmeldung ist nicht konfiguriert.");
    err.code = "BREVO_NOT_CONFIGURED";
    err.publicMessage = "Die Newsletter-Anmeldung ist momentan nicht verfügbar. Bitte versuch es später erneut.";
    throw err;
  }
  const res = await fetch(`${BREVO_API_BASE}/contacts`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, listIds: [Number(listId)], updateEnabled: true }),
  });
  if (res.ok) return { subscribed: true };
  const body = await res.json().catch(() => ({}));
  if (res.status === 400 && body.code === "duplicate_parameter") {
    return { subscribed: true, alreadySubscribed: true };
  }
  throw new Error(`Brevo Newsletter-Anmeldung fehlgeschlagen (${res.status}): ${body.message || "unbekannter Fehler"}`);
}

module.exports = { sendTransactionalEmail, subscribeToNewsletter };
