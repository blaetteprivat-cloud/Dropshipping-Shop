/* Wählt success_url/cancel_url für eine Stripe-Checkout-Session. Als eigene, reine Funktion
   ausgelagert (statt inline in server/routes/checkout.js), damit sie ohne Stripe-Mock direkt
   getestet werden kann — siehe test/checkout-redirect.test.js. */

/* Custom-URL-Scheme der iOS-/Android-App (siehe ios/App/App/Info.plist,
   android/app/src/main/AndroidManifest.xml, js/capacitor-bridge.js). Stripe leitet nach der
   Zahlung dorthin weiter statt auf eine https-URL, wenn die Anfrage aus der App kam — die
   eingebettete WebView der App selbst zur Zahlungsseite zu navigieren, lehnt Apple im Review ab
   (siehe MOBILE_APP.md). */
const CAPACITOR_RETURN_URL = "novashop://checkout-return";

function buildRedirectUrls(baseUrl, isCapacitorApp) {
  if (isCapacitorApp) {
    return {
      successUrl: `${CAPACITOR_RETURN_URL}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${CAPACITOR_RETURN_URL}?status=cancel`,
    };
  }
  return {
    successUrl: `${baseUrl}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/shop.html`,
  };
}

module.exports = { buildRedirectUrls, CAPACITOR_RETURN_URL };
