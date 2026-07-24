/* ===========================================================
   NovaShop — Checkout-Modal
   Ersetzt den früheren Ein-Klick-"Kauf" durch einen echten Bestellablauf:
   Adresse, Zahlartauswahl (Demo), Bestellübersicht, Widerrufs-Checkbox,
   Bestellbestätigung mit Bestellnummer. Gast-Bestellungen werden nicht
   mehr stillschweigend verworfen, sondern unter einer Gast-ID gespeichert
   (siehe Auth.addGuestOrder in auth.js). Weiterhin rein clientseitig ohne
   echte Zahlungsabwicklung — siehe Hinweistext im Formular.
   =========================================================== */
(function () {
  "use strict";

  const PAYMENT_METHODS = [
    { id: "karte", label: "Kreditkarte" },
    { id: "paypal", label: "PayPal" },
    { id: "klarna", label: "Klarna" },
    { id: "rechnung", label: "Rechnung" },
  ];

  const MODAL_HTML = `
    <div class="modal modal--wide glass-strong checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-heading">
      <button class="btn-icon modal__close" type="button" id="checkout-modal-close" aria-label="Schließen">
        <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-close"></use></svg>
      </button>

      <div id="checkout-view-form">
        <h2 id="checkout-heading">Bestellung abschließen</h2>
        <p class="auth-form__sub">Demo-Checkout — es erfolgt keine echte Zahlungsabwicklung, deine Angaben bleiben nur lokal in diesem Browser gespeichert.</p>

        <form id="checkout-form" class="auth-form checkout-form" novalidate>
          <h3 class="checkout-form__heading">Kontakt</h3>
          <label for="checkout-email">E-Mail-Adresse
            <input type="email" id="checkout-email" name="email" required autocomplete="email" placeholder="deine@email.de">
          </label>

          <h3 class="checkout-form__heading">Lieferadresse</h3>
          <div class="checkout-form__row">
            <label for="checkout-first-name">Vorname
              <input type="text" id="checkout-first-name" name="firstName" required autocomplete="given-name" placeholder="Vorname">
            </label>
            <label for="checkout-last-name">Nachname
              <input type="text" id="checkout-last-name" name="lastName" required autocomplete="family-name" placeholder="Nachname">
            </label>
          </div>
          <label for="checkout-street">Straße und Hausnummer
            <input type="text" id="checkout-street" name="street" required autocomplete="street-address" placeholder="Musterstraße 12">
          </label>
          <div class="checkout-form__row checkout-form__row--3">
            <label for="checkout-zip">PLZ
              <input type="text" id="checkout-zip" name="zip" required autocomplete="postal-code" inputmode="numeric" placeholder="12345">
            </label>
            <label for="checkout-city">Ort
              <input type="text" id="checkout-city" name="city" required autocomplete="address-level2" placeholder="Musterstadt">
            </label>
            <label for="checkout-country">Land
              <select id="checkout-country" name="country" autocomplete="country">
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
              </select>
            </label>
          </div>

          <h3 class="checkout-form__heading">Zahlungsart <span class="checkout-form__hint">(Demo-Auswahl)</span></h3>
          <div class="checkout-payment" role="radiogroup" aria-label="Zahlungsart">
            ${PAYMENT_METHODS.map(
              (m, i) => `
              <label class="checkout-payment__option">
                <input type="radio" name="payment" value="${m.id}" ${i === 0 ? "checked" : ""}>
                ${m.label}
              </label>`
            ).join("")}
          </div>

          <h3 class="checkout-form__heading">Bestellübersicht</h3>
          <div class="checkout-summary" id="checkout-summary-items"></div>
          <div class="checkout-summary__totals" id="checkout-summary-totals"></div>

          <label class="checkout-consent">
            <input type="checkbox" id="checkout-consent" required>
            <span>Ich habe die <a href="#" target="_blank" rel="noopener">Widerrufsbedingungen</a> gelesen und akzeptiere sie.</span>
          </label>

          <p class="form-error" id="checkout-error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit" id="checkout-submit">
            <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-lock"></use></svg>
            <span id="checkout-submit-label">Zahlungspflichtig bestellen</span>
          </button>
        </form>
      </div>

      <div id="checkout-view-success" hidden>
        <div class="admin-login__icon" style="margin:0 0 var(--space-4);">
          <svg class="icon icon-lg" aria-hidden="true"><use href="#icon-check"></use></svg>
        </div>
        <h2>Danke für deine Bestellung!</h2>
        <p class="auth-form__sub">Deine Bestellung <strong id="checkout-success-id"></strong> wurde aufgenommen und wird jetzt bearbeitet.</p>
        <p id="checkout-success-note" class="auth-modal__note"></p>
        <button class="btn btn-primary btn-block" type="button" id="checkout-success-close">Weiter einkaufen</button>
      </div>
    </div>`;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "checkout-backdrop";
  backdrop.innerHTML = MODAL_HTML;
  document.body.appendChild(backdrop);

  const formView = document.getElementById("checkout-view-form");
  const successView = document.getElementById("checkout-view-success");
  const form = document.getElementById("checkout-form");
  const errorEl = document.getElementById("checkout-error");
  const summaryItemsEl = document.getElementById("checkout-summary-items");
  const summaryTotalsEl = document.getElementById("checkout-summary-totals");
  const submitLabel = document.getElementById("checkout-submit-label");
  let lastFocusedEl = null;

  function renderSummary() {
    const summary = Cart.getSummary();
    summaryItemsEl.innerHTML = summary.items
      .map(
        (item) => `
      <div class="checkout-summary__row">
        <span>${item.qty}× ${escapeHtml(item.name)}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>`
      )
      .join("");
    summaryTotalsEl.innerHTML = `
      <div class="checkout-summary__row"><span>Zwischensumme</span><span>${formatPrice(summary.subtotal)}</span></div>
      <div class="checkout-summary__row"><span>Versand</span><span>${summary.shippingFree ? "Kostenlos" : formatPrice(summary.shippingCost)}</span></div>
      <div class="checkout-summary__row checkout-summary__row--total"><span>Gesamt</span><strong>${formatPrice(summary.total)}</strong></div>`;
    submitLabel.textContent = "Zahlungspflichtig bestellen — " + formatPrice(summary.total);
    return summary;
  }

  function openModal() {
    if (Cart.getSummary().items.length === 0) return;
    lastFocusedEl = document.activeElement;
    formView.hidden = false;
    successView.hidden = true;
    errorEl.textContent = "";
    renderSummary();
    const user = Auth.getCurrentUser();
    const emailField = document.getElementById("checkout-email");
    if (user) {
      emailField.value = user.email;
      emailField.readOnly = true;
      const [first, ...rest] = user.name.split(" ");
      document.getElementById("checkout-first-name").value = first || "";
      document.getElementById("checkout-last-name").value = rest.join(" ");
    } else {
      emailField.readOnly = false;
    }
    backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => (user ? document.getElementById("checkout-street") : emailField).focus(), 50);
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  document.getElementById("checkout-modal-close").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("is-open")) closeModal();
  });

  window.addEventListener("novashop:cart-change", () => {
    if (backdrop.classList.contains("is-open") && !formView.hidden) {
      if (Cart.getSummary().items.length === 0) {
        closeModal();
      } else {
        renderSummary();
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const summary = Cart.getSummary();
    if (summary.items.length === 0) return;

    const email = document.getElementById("checkout-email").value.trim();
    const firstName = document.getElementById("checkout-first-name").value.trim();
    const lastName = document.getElementById("checkout-last-name").value.trim();
    const street = document.getElementById("checkout-street").value.trim();
    const zip = document.getElementById("checkout-zip").value.trim();
    const city = document.getElementById("checkout-city").value.trim();
    const country = document.getElementById("checkout-country").value;
    const payment = form.querySelector('input[name="payment"]:checked').value;
    const consent = document.getElementById("checkout-consent").checked;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) { errorEl.textContent = "Bitte gib eine gültige E-Mail-Adresse ein."; document.getElementById("checkout-email").focus(); return; }
    if (!firstName || !lastName) { errorEl.textContent = "Bitte gib Vor- und Nachnamen ein."; return; }
    if (!street) { errorEl.textContent = "Bitte gib deine Straße und Hausnummer ein."; return; }
    if (!/^\d{4,5}$/.test(zip)) { errorEl.textContent = "Bitte gib eine gültige Postleitzahl ein."; document.getElementById("checkout-zip").focus(); return; }
    if (!city) { errorEl.textContent = "Bitte gib deinen Ort ein."; return; }
    if (!consent) { errorEl.textContent = "Bitte akzeptiere die Widerrufsbedingungen, um fortzufahren."; document.getElementById("checkout-consent").focus(); return; }

    const submitBtn = document.getElementById("checkout-submit");
    submitBtn.disabled = true;
    try {
      const orderPayload = {
        items: summary.items.map((it) => ({ id: it.id, name: it.name, qty: it.qty, price: it.price })),
        subtotal: summary.subtotal,
        shippingCost: summary.shippingCost,
        total: summary.total,
        payment: PAYMENT_METHODS.find((m) => m.id === payment).label + " (Demo)",
        address: { firstName, lastName, street, zip, city, country },
      };

      const user = Auth.getCurrentUser();
      let order;
      if (user) {
        order = Auth.addOrder(user.email, orderPayload);
      } else {
        order = Auth.addGuestOrder({ name: firstName + " " + lastName, email }, orderPayload);
      }

      document.getElementById("checkout-success-id").textContent = order.id;
      document.getElementById("checkout-success-note").textContent = user
        ? "Du findest sie jederzeit unter „Mein Konto“ → Meine Bestellungen."
        : "Da du nicht angemeldet warst, melde dich mit " + email + " an, um deine Bestellungen und den Status jederzeit einzusehen.";
      // Reihenfolge wichtig: Erst die Erfolgsansicht zeigen, dann erst den Warenkorb leeren —
      // sonst schließt der cart-change-Listener oben (leerer Warenkorb schließt das Formular)
      // das Modal, bevor die Bestätigung überhaupt sichtbar wird.
      form.reset();
      formView.hidden = true;
      successView.hidden = false;
      Cart.clear();
      setTimeout(() => document.getElementById("checkout-success-close").focus(), 50);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById("checkout-success-close").addEventListener("click", closeModal);

  window.Checkout = { open: openModal };
})();
