const { Orders, Products, Notifications, Users } = require("./store");
const { sendOrderConfirmationEmail } = require("./mailer");
const { ORDER_STATUS } = require("./order-status");

/* Markiert eine Stripe-Checkout-Session als bezahlt (Bestätigungsmail, Benachrichtigung).
   Idempotent und aus zwei Quellen aufrufbar: dem Stripe-Webhook (Normalfall) und einer Live-Nachfrage
   bei Stripe von der Erfolgsseite aus (Fallback, falls der Webhook z. B. wegen falschem/fehlendem
   STRIPE_WEBHOOK_SECRET nie ankommt — sonst bliebe eine bezahlte Bestellung für immer "ausstehend").
   Lagerbestand wird NICHT hier abgezogen — das passiert schon als Reservierung beim Checkout-Start
   (siehe server/routes/checkout.js), damit zwei gleichzeitige Käufer nicht beide das letzte Stück
   bezahlen können. */
async function fulfillPaidOrder(order, session) {
  if (!order || order.status !== ORDER_STATUS.PENDING) return order;

  Orders.markPaid(order.id, {
    paymentIntentId: session.payment_intent,
    paymentMethod: session.payment_method_types ? session.payment_method_types.join(", ") : "Stripe",
  });

  const fresh = Orders.findById(order.id);
  const user = fresh.userId ? Users.findById(fresh.userId) : null;
  const toEmail = fresh.guestEmail || (user && user.email);
  const toName = fresh.guestName || (user && user.name);
  if (toEmail) {
    try {
      await sendOrderConfirmationEmail(fresh, toEmail, toName);
    } catch (err) {
      console.error("Bestellbestätigung konnte nicht gesendet werden:", err);
    }
  }
  if (fresh.userId) {
    Notifications.create(fresh.userId, {
      type: "order-status",
      orderId: fresh.id,
      title: "Bestellung " + fresh.orderNumber,
      message: "Deine Bestellung " + fresh.orderNumber + " wurde bezahlt und wird bearbeitet.",
    });
  }
  return fresh;
}

/* Räumt Bestellungen auf, die seit `minutesOld` Minuten auf "Zahlung ausstehend" hängen — die
   zugehörige Stripe-Checkout-Session muss zu diesem Zeitpunkt längst abgelaufen sein (siehe
   SESSION_EXPIRY_MINUTES in checkout.js). Fallback für den Fall, dass nie ein
   "checkout.session.expired"-Webhook ankam (z. B. weil STRIPE_WEBHOOK_SECRET fehlt) und die
   Erfolgsseite auch nie aufgerufen wurde — sonst bliebe reservierter Lagerbestand für immer
   blockiert. Wird periodisch aus server/index.js aufgerufen. */
function expireStaleOrders(minutesOld) {
  const stale = Orders.listStalePending(minutesOld);
  let expired = 0;
  for (const order of stale) {
    if (Orders.markFailed(order.id)) {
      for (const item of order.items) Products.restoreStock(item.id, item.qty);
      expired++;
    }
  }
  return expired;
}

module.exports = { fulfillPaidOrder, expireStaleOrders };
