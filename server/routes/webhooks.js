const express = require("express");
const { Orders, Products } = require("../lib/store");
const { getStripe } = require("../lib/stripe");
const { fulfillPaidOrder } = require("../lib/fulfill-order");

const router = express.Router();

router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET fehlt in der .env — Webhook kann nicht verifiziert werden.");
    return res.status(503).send("Webhook nicht konfiguriert.");
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe-Webhook-Signatur ungültig:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const order = Orders.findByStripeSessionId(session.id);
      await fulfillPaidOrder(order, session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const order = Orders.findByStripeSessionId(session.id);
      if (order && Orders.markFailed(order.id)) {
        for (const item of order.items) Products.restoreStock(item.id, item.qty);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Fehler bei der Webhook-Verarbeitung:", err);
    res.status(500).json({ error: "Webhook-Verarbeitung fehlgeschlagen." });
  }
});

module.exports = router;
