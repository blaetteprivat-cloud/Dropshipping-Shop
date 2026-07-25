/* ===========================================================
   NovaShop — Capacitor-Brücke (nur aktiv innerhalb der iOS-/Android-App)
   Auf der normalen Website ist window.Capacitor nicht vorhanden — dieses
   Skript wird dann komplett zum No-Op und ändert nichts am Browser-Verhalten.

   Verantwortlich für:
   - Stripe-Checkout NICHT in der eingebetteten WebView öffnen, sondern in
     einem echten In-App-Browser-Tab (SFSafariViewController/Custom Tabs).
     Apple lehnt Zahlungs-Flows innerhalb einer eingebetteten WebView im
     Review ab; Stripe empfiehlt denselben Weg (siehe MOBILE_APP.md).
   - Nach Zahlungsabschluss über ein Custom-URL-Scheme (novashop://) zurück
     in die App und zur echten Erfolgsseite navigieren, statt dass der
     Nutzer im Browser-Tab hängen bleibt oder der App-Warenkorb (localStorage
     der Haupt-WebView, getrennt vom Browser-Tab) nicht geleert wird.
   - Externe Links (target="_blank", z. B. Widerrufsbedingungen) ebenfalls
     im In-App-Browser statt in einer zweiten WebView öffnen.
   - Android-Zurück-Taste: Seitenverlauf zurück statt die App sofort zu
     schließen.
   - Statusleiste an das dunkle Farbschema der Seite anpassen.
   =========================================================== */
(function (global) {
  "use strict";

  const Capacitor = global.Capacitor;
  const isNative = !!(Capacitor && typeof Capacitor.isNativePlatform === "function" && Capacitor.isNativePlatform());

  global.NovaCapacitor = { isNative, openCheckout };

  if (!isNative) return;

  const Plugins = Capacitor.Plugins || {};
  const { App, Browser, StatusBar } = Plugins;

  /* -------------------- Statusleiste an dunkles Theme anpassen -------------------- */
  if (StatusBar) {
    StatusBar.setStyle({ style: "DARK" }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#0a0908" }).catch(() => {});
  }

  /* -------------------- Android-Zurück-Taste -------------------- */
  if (App) {
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) global.history.back();
      else App.exitApp();
    });
  }

  /* -------------------- Externe Links im In-App-Browser statt in der WebView -------------------- */
  if (Browser) {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[target="_blank"]');
      if (!link || !link.href) return;
      e.preventDefault();
      Browser.open({ url: link.href });
    });
  }

  /* -------------------- Stripe-Checkout im In-App-Browser + Rücksprung --------------------
     Custom-URL-Scheme "novashop://checkout-return", server/routes/checkout.js setzt es als
     success_url/cancel_url, wenn die Anfrage mit platform:"capacitor" kam (siehe checkout.js).
     Bei Abbruch (status=cancel) reicht es, den Browser-Tab zu schließen — die App zeigt darunter
     ja schon wieder die Shop-/Produktseite, keine Navigation nötig. Bei Erfolg zur echten
     Erfolgsseite navigieren, damit Cart.clear() in der Haupt-WebView (nicht im separaten
     Browser-Tab-Kontext) läuft. */
  const CHECKOUT_SCHEME = "novashop:";
  const CHECKOUT_HOST = "checkout-return";

  function openCheckout(url) {
    if (!Browser) {
      global.location.href = url; // Fallback, falls das Plugin ausnahmsweise fehlt
      return;
    }
    Browser.open({ url });
  }

  if (App) {
    App.addListener("appUrlOpen", ({ url }) => {
      let parsed;
      try {
        parsed = new URL(url);
      } catch (e) {
        return;
      }
      if (parsed.protocol !== CHECKOUT_SCHEME || parsed.hostname !== CHECKOUT_HOST) return;
      if (Browser) Browser.close().catch(() => {});
      if (parsed.searchParams.get("status") === "success") {
        const sessionId = parsed.searchParams.get("session_id") || "";
        global.location.href = "/order-success.html?session_id=" + encodeURIComponent(sessionId);
      }
    });
  }
})(window);
