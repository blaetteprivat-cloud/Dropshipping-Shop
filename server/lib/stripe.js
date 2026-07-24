let stripeClient = null;

/* Wirft einen sprechenden Fehler statt eines Absturzes, solange kein echter
   Stripe-Key eingetragen ist — der Rest des Shops soll trotzdem lauffähig bleiben. */
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error("STRIPE_SECRET_KEY fehlt in der .env — Zahlungsabwicklung ist nicht konfiguriert.");
    err.code = "STRIPE_NOT_CONFIGURED";
    err.publicMessage = "Die Zahlungsabwicklung ist momentan nicht verfügbar. Bitte versuch es später erneut.";
    throw err;
  }
  if (!stripeClient) {
    const Stripe = require("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

module.exports = { getStripe };
