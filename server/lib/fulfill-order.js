const { Orders, Products, Notifications, Users } = require("./store");
const { sendOrderConfirmationEmail } = require("./mailer");

/* Markiert eine Stripe-Checkout-Session als bezahlt (Lagerbestand, Bestätigungsmail, Benachrichtigung).
   Idempotent und aus zwei Quellen aufrufbar: dem Stripe-Webhook (Normalfall) und einer Live-Nachfrage
   bei Stripe von der Erfolgsseite aus (Fallback, falls der Webhook z. B. wegen falschem/fehlendem
   STRIPE_WEBHOOK_SECRET nie ankommt — sonst bliebe eine bezahlte Bestellung für immer "ausstehend"). */
async function fulfillPaidOrder(order, session) {
  if (!order || order.status !== "Zahlung ausstehend") return order;

  Orders.markPaid(order.id, {
    paymentIntentId: session.payment_intent,
    paymentMethod: session.payment_method_types ? session.payment_method_types.join(", ") : "Stripe",
  });
  for (const item of order.items) {
    Products.decrementStock(item.id, item.qty);
  }

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

module.exports = { fulfillPaidOrder };
