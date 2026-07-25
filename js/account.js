/* ===========================================================
   NovaShop — Konto-Modal (Anmelden / Registrieren / E-Mail-Bestätigung / Übersicht)
   Baut das Modal einmalig auf und verkabelt alle [data-account-trigger]-Buttons.
   =========================================================== */
(function () {
  "use strict";

  const MODAL_HTML = `
    <div class="modal glass-strong" role="dialog" aria-modal="true" aria-labelledby="auth-modal-heading">
      <button class="btn-icon modal__close" type="button" id="auth-modal-close" aria-label="Schließen">
        <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-close"></use></svg>
      </button>

      <div id="auth-view-guest">
        <div class="auth-modal__tabs" role="tablist">
          <button type="button" class="auth-tab is-active" role="tab" aria-selected="true" data-auth-tab="login">Anmelden</button>
          <button type="button" class="auth-tab" role="tab" aria-selected="false" data-auth-tab="register">Registrieren</button>
        </div>

        <form id="login-form" class="auth-form" novalidate>
          <h2 id="auth-modal-heading">Willkommen zurück</h2>
          <p class="auth-form__sub">Melde dich an, um deine Bestellungen zu sehen.</p>
          <label for="login-email">E-Mail-Adresse
            <input type="email" id="login-email" name="email" required autocomplete="email" placeholder="deine@email.de">
          </label>
          <label for="login-password">Passwort
            <span class="password-field">
              <input type="password" id="login-password" name="password" required autocomplete="current-password" minlength="6" placeholder="••••••••">
              <button type="button" class="password-toggle" aria-pressed="false" aria-label="Passwort anzeigen" data-password-toggle="login-password">
                <svg class="icon icon-sm icon-eye" aria-hidden="true"><use href="#icon-eye"></use></svg>
                <svg class="icon icon-sm icon-eye-off" aria-hidden="true"><use href="#icon-eye-off"></use></svg>
              </button>
            </span>
          </label>
          <button type="button" class="auth-modal__forgot" id="forgot-password-trigger">Passwort vergessen?</button>
          <p class="form-error" id="login-error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">Anmelden</button>
        </form>

        <form id="register-form" class="auth-form" novalidate hidden>
          <h2>Konto erstellen</h2>
          <p class="auth-form__sub">Kostenlos registrieren — dauert nur eine Minute.</p>
          <label for="register-name">Name
            <input type="text" id="register-name" name="name" required autocomplete="name" placeholder="Dein Name">
          </label>
          <label for="register-email">E-Mail-Adresse
            <input type="email" id="register-email" name="email" required autocomplete="email" placeholder="deine@email.de">
          </label>
          <label for="register-password">Passwort
            <span class="password-field">
              <input type="password" id="register-password" name="password" required autocomplete="new-password" minlength="6" placeholder="Mind. 6 Zeichen">
              <button type="button" class="password-toggle" aria-pressed="false" aria-label="Passwort anzeigen" data-password-toggle="register-password">
                <svg class="icon icon-sm icon-eye" aria-hidden="true"><use href="#icon-eye"></use></svg>
                <svg class="icon icon-sm icon-eye-off" aria-hidden="true"><use href="#icon-eye-off"></use></svg>
              </button>
            </span>
          </label>
          <label for="register-password-confirm">Passwort bestätigen
            <span class="password-field">
              <input type="password" id="register-password-confirm" name="passwordConfirm" required autocomplete="new-password" placeholder="Passwort wiederholen">
              <button type="button" class="password-toggle" aria-pressed="false" aria-label="Passwort anzeigen" data-password-toggle="register-password-confirm">
                <svg class="icon icon-sm icon-eye" aria-hidden="true"><use href="#icon-eye"></use></svg>
                <svg class="icon icon-sm icon-eye-off" aria-hidden="true"><use href="#icon-eye-off"></use></svg>
              </button>
            </span>
          </label>
          <p class="form-error" id="register-error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">Konto erstellen</button>
        </form>

        <p class="auth-modal__note">Deine Angaben werden verschlüsselt gespeichert und ausschließlich für dein NovaShop-Konto verwendet.</p>
      </div>

      <div id="auth-view-verify-pending" hidden>
        <div class="admin-login__icon" style="margin:0 0 var(--space-4);">
          <svg class="icon icon-lg" aria-hidden="true"><use href="#icon-mail"></use></svg>
        </div>
        <h2 id="verify-pending-heading">Fast geschafft!</h2>
        <p class="auth-form__sub" id="verify-pending-message">Wir haben eine Bestätigungsmail an <strong id="verify-pending-email"></strong> geschickt. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.</p>
        <p class="auth-modal__note">Keine E-Mail erhalten? Prüfe auch deinen Spam-Ordner. Ein neuer Bestätigungslink wird automatisch angefordert, sobald du dich erneut anzumelden versuchst.</p>
        <button class="btn btn-ghost btn-block" type="button" id="verify-pending-back">Zurück zur Anmeldung</button>
      </div>

      <div id="auth-view-forgot" hidden>
        <h2>Passwort vergessen?</h2>
        <p class="auth-form__sub">Gib deine E-Mail-Adresse ein — falls ein Konto existiert, senden wir dir einen Link zum Zurücksetzen.</p>
        <form id="forgot-password-form" class="auth-form" novalidate>
          <label for="forgot-password-email">E-Mail-Adresse
            <input type="email" id="forgot-password-email" name="email" required autocomplete="email" placeholder="deine@email.de">
          </label>
          <p class="form-error" id="forgot-password-error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">Link anfordern</button>
        </form>
        <p class="auth-form__sub" id="forgot-password-success" hidden>Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen des Passworts gesendet. Bitte prüfe auch deinen Spam-Ordner.</p>
        <button class="btn btn-ghost btn-block" type="button" id="forgot-password-back">Zurück zur Anmeldung</button>
      </div>

      <div id="auth-view-account" hidden>
        <div class="account-header">
          <div class="account-avatar" id="account-avatar" aria-hidden="true"></div>
          <div class="account-header__info">
            <strong id="account-name"></strong>
            <span id="account-email"></span>
          </div>
        </div>
        <div class="account-notifications">
          <h3>
            <svg class="icon" aria-hidden="true"><use href="#icon-bell"></use></svg>Benachrichtigungen
            <button type="button" class="notif-mark-all" id="notif-mark-all" hidden>Alle als gelesen markieren</button>
          </h3>
          <div id="account-notifications-list"></div>
        </div>

        <div class="account-orders">
          <h3><svg class="icon" aria-hidden="true"><use href="#icon-receipt"></use></svg>Meine Bestellungen</h3>
          <div id="account-orders-list"></div>
        </div>

        <div class="account-privacy">
          <h3><svg class="icon" aria-hidden="true"><use href="#icon-shield-check"></use></svg>Konto &amp; Datenschutz</h3>
          <div class="account-privacy__actions" id="account-privacy-actions">
            <button class="btn btn-ghost" type="button" id="export-data-btn">Meine Daten exportieren</button>
            <button class="btn btn-danger" type="button" id="delete-account-trigger">Konto löschen</button>
          </div>
          <form id="delete-account-form" class="auth-form" novalidate hidden>
            <p class="auth-form__sub">Dein Konto wird anonymisiert und du wirst abgemeldet. Bestellungen bleiben aus gesetzlichen Aufbewahrungspflichten ohne Personenbezug gespeichert. Bitte bestätige mit deinem Passwort.</p>
            <label for="delete-account-password">Passwort
              <input type="password" id="delete-account-password" required autocomplete="current-password" placeholder="••••••••">
            </label>
            <p class="form-error" id="delete-account-error" role="alert"></p>
            <div class="account-privacy__actions">
              <button class="btn btn-ghost" type="button" id="delete-account-cancel">Abbrechen</button>
              <button class="btn btn-danger" type="submit">Endgültig löschen</button>
            </div>
          </form>
        </div>

        <button class="btn btn-ghost btn-block" type="button" id="logout-btn">
          <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-logout"></use></svg>
          Abmelden
        </button>
      </div>
    </div>`;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "auth-backdrop";
  backdrop.innerHTML = MODAL_HTML;
  document.body.appendChild(backdrop);

  const modal = backdrop.querySelector(".modal");
  const closeBtn = document.getElementById("auth-modal-close");
  const guestView = document.getElementById("auth-view-guest");
  const verifyPendingView = document.getElementById("auth-view-verify-pending");
  const forgotView = document.getElementById("auth-view-forgot");
  const accountView = document.getElementById("auth-view-account");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  let lastFocusedEl = null;

  function openModal() {
    lastFocusedEl = document.activeElement;
    backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
    renderAuthState();
    const firstField = backdrop.querySelector(':not([hidden]) input, #logout-btn');
    setTimeout(() => firstField && firstField.focus(), 50);
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
    loginError.textContent = "";
    registerError.textContent = "";
    if (!verifyPendingView.hidden || !forgotView.hidden) resetToLoginTab();
    resetDeleteAccountForm();
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("is-open")) closeModal();
  });

  /* -------------------- Tabs -------------------- */
  backdrop.querySelectorAll("[data-auth-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const target = tabBtn.getAttribute("data-auth-tab");
      backdrop.querySelectorAll("[data-auth-tab]").forEach((b) => {
        const active = b === tabBtn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      loginForm.hidden = target !== "login";
      registerForm.hidden = target !== "register";
      loginError.textContent = "";
      registerError.textContent = "";
    });
  });

  /* -------------------- Passwort ein-/ausblenden -------------------- */
  backdrop.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.getAttribute("data-password-toggle"));
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(show));
      toggle.setAttribute("aria-label", show ? "Passwort verbergen" : "Passwort anzeigen");
    });
  });

  /* -------------------- Passwort vergessen -------------------- */
  const forgotForm = document.getElementById("forgot-password-form");
  const forgotError = document.getElementById("forgot-password-error");
  const forgotSuccess = document.getElementById("forgot-password-success");

  function showForgotView() {
    guestView.hidden = true;
    verifyPendingView.hidden = true;
    accountView.hidden = true;
    forgotView.hidden = false;
    forgotForm.hidden = false;
    forgotSuccess.hidden = true;
    forgotError.textContent = "";
    forgotForm.reset();
    setTimeout(() => document.getElementById("forgot-password-email").focus(), 50);
  }

  document.getElementById("forgot-password-trigger").addEventListener("click", showForgotView);
  document.getElementById("forgot-password-back").addEventListener("click", () => {
    resetToLoginTab();
    renderAuthState();
  });

  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotError.textContent = "";
    const email = document.getElementById("forgot-password-email").value.trim();
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Auth.forgotPassword(email);
      forgotForm.hidden = true;
      forgotSuccess.hidden = false;
    } catch (err) {
      forgotError.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* -------------------- "Bitte E-Mail bestätigen"-Hinweis -------------------- */
  function showVerifyPending({ email, emailFailed }) {
    guestView.hidden = true;
    verifyPendingView.hidden = false;
    accountView.hidden = true;
    document.getElementById("verify-pending-email").textContent = email;
    const heading = document.getElementById("verify-pending-heading");
    const message = document.getElementById("verify-pending-message");
    if (emailFailed) {
      heading.textContent = "Konto erstellt";
      message.textContent = "Dein Konto wurde angelegt, aber die Bestätigungsmail an " + email + " konnte gerade nicht versendet werden. Fordere über \"Zurück zur Anmeldung\" → Anmeldeversuch einen neuen Link an.";
    } else {
      heading.textContent = "Fast geschafft!";
      message.innerHTML = 'Wir haben eine Bestätigungsmail an <strong id="verify-pending-email">' + escapeHtml(email) + "</strong> geschickt. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.";
    }
  }

  document.getElementById("verify-pending-back").addEventListener("click", () => {
    resetToLoginTab();
    renderAuthState();
  });

  /* -------------------- Login -------------------- */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Auth.login({ email, password });
      loginForm.reset();
      renderAuthState();
      showToast("Willkommen zurück", Auth.getCurrentUser().name);
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        try {
          const resent = await Auth.resendVerification(email);
          showVerifyPending(resent);
        } catch (resendErr) {
          loginError.textContent = resendErr.message;
        }
      } else {
        loginError.textContent = err.message;
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* -------------------- Registrierung -------------------- */
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.textContent = "";
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const passwordConfirm = document.getElementById("register-password-confirm").value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (name.length < 2) {
      registerError.textContent = "Bitte gib deinen Namen ein.";
      return;
    }
    if (password.length < 6) {
      registerError.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
      return;
    }
    if (password !== passwordConfirm) {
      registerError.textContent = "Die Passwörter stimmen nicht überein.";
      return;
    }

    submitBtn.disabled = true;
    try {
      const result = await Auth.register({ name, email, password });
      registerForm.reset();
      showVerifyPending(result);
    } catch (err) {
      registerError.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* -------------------- Abmelden -------------------- */
  function resetToLoginTab() {
    backdrop.querySelectorAll("[data-auth-tab]").forEach((b) => {
      const active = b.getAttribute("data-auth-tab") === "login";
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
    loginForm.hidden = false;
    registerForm.hidden = true;
    verifyPendingView.hidden = true;
    forgotView.hidden = true;
  }

  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.logout();
    resetToLoginTab();
    renderAuthState();
    showToast("Abgemeldet", "Bis bald bei NovaShop!");
    closeModal();
  });

  /* -------------------- Daten exportieren -------------------- */
  document.getElementById("export-data-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const blob = await Auth.exportData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "novashop-daten.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Export fehlgeschlagen", err.message);
    } finally {
      btn.disabled = false;
    }
  });

  /* -------------------- Konto löschen -------------------- */
  const privacyActions = document.getElementById("account-privacy-actions");
  const deleteForm = document.getElementById("delete-account-form");
  const deleteError = document.getElementById("delete-account-error");

  function resetDeleteAccountForm() {
    deleteForm.hidden = true;
    deleteForm.reset();
    deleteError.textContent = "";
    privacyActions.hidden = false;
  }

  document.getElementById("delete-account-trigger").addEventListener("click", () => {
    privacyActions.hidden = true;
    deleteForm.hidden = false;
    document.getElementById("delete-account-password").focus();
  });

  document.getElementById("delete-account-cancel").addEventListener("click", resetDeleteAccountForm);

  deleteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    deleteError.textContent = "";
    const password = document.getElementById("delete-account-password").value;
    const submitBtn = deleteForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Auth.deleteAccount(password);
      deleteForm.reset();
      closeModal();
      showToast("Konto gelöscht", "Dein Konto wurde anonymisiert. Auf Wiedersehen!");
    } catch (err) {
      deleteError.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* -------------------- Ansicht rendern -------------------- */
  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function renderOrders(user) {
    const list = document.getElementById("account-orders-list");
    const orders = Auth.getOrders(user.email);
    if (orders.length === 0) {
      list.innerHTML = '<p class="account-orders-empty">Noch keine Bestellungen. Deine nächste Bestellung erscheint hier automatisch.</p>';
      return;
    }
    list.innerHTML = orders
      .map((order) => {
        const date = new Date(order.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
        const itemsSummary = order.items.map((it) => `${it.qty}× ${escapeHtml(it.name)}`).join(", ");
        return `
        <div class="order-card">
          <div class="order-card__top">
            <span class="order-card__id">${order.orderNumber}</span>
            <span class="order-card__date">${date}</span>
          </div>
          <p class="order-card__items">${itemsSummary}</p>
          <div class="order-card__bottom">
            <span class="order-card__total">${formatPrice(order.total)}</span>
            <span class="status-badge" data-status="${order.status || "In Bearbeitung"}">${order.status || "In Bearbeitung"}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "gerade eben";
    if (minutes < 60) return "vor " + minutes + " Min.";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return "vor " + hours + " Std.";
    const days = Math.round(hours / 24);
    if (days < 7) return "vor " + days + " Tag" + (days === 1 ? "" : "en");
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function renderNotifications(user) {
    const list = document.getElementById("account-notifications-list");
    const markAllBtn = document.getElementById("notif-mark-all");
    const notifications = Auth.getNotifications(user.email);
    markAllBtn.hidden = notifications.every((n) => n.read);
    if (notifications.length === 0) {
      list.innerHTML = '<p class="account-orders-empty">Noch keine Benachrichtigungen. Updates zu deinen Bestellungen erscheinen hier.</p>';
      return;
    }
    list.innerHTML = notifications
      .slice(0, 8)
      .map(
        (n) => `
      <button type="button" class="notif-item${n.read ? "" : " notif-item--unread"}" data-notif-id="${n.id}">
        <span class="notif-item__icon"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-receipt"></use></svg></span>
        <span class="notif-item__body">
          <span class="notif-item__title">${escapeHtml(n.title)}</span>
          <span class="notif-item__message">${escapeHtml(n.message)}</span>
          <span class="notif-item__time">${timeAgo(n.date)}</span>
        </span>
      </button>`
      )
      .join("");
  }

  document.getElementById("account-notifications-list").addEventListener("click", (e) => {
    const item = e.target.closest("[data-notif-id]");
    if (!item) return;
    const user = Auth.getCurrentUser();
    if (!user) return;
    Auth.markNotificationRead(user.email, item.getAttribute("data-notif-id"));
    renderNotifications(user);
    updateTriggerButtons(user);
  });

  document.getElementById("notif-mark-all").addEventListener("click", () => {
    const user = Auth.getCurrentUser();
    if (!user) return;
    Auth.markAllNotificationsRead(user.email);
    renderNotifications(user);
    updateTriggerButtons(user);
  });

  function renderAuthState() {
    const user = Auth.getCurrentUser();
    if (user) {
      guestView.hidden = true;
      verifyPendingView.hidden = true;
      accountView.hidden = false;
      document.getElementById("account-avatar").textContent = initials(user.name);
      document.getElementById("account-name").textContent = user.name;
      document.getElementById("account-email").textContent = user.email;
      renderNotifications(user);
      renderOrders(user);
    } else if (verifyPendingView.hidden && forgotView.hidden) {
      guestView.hidden = false;
      accountView.hidden = true;
    }
    updateTriggerButtons(user);
  }

  function updateTriggerButtons(user) {
    document.querySelectorAll("[data-account-trigger-label]").forEach((label) => {
      label.textContent = user ? user.name.split(" ")[0] : "Mein Konto";
    });
    document.querySelectorAll("[data-account-trigger]").forEach((btn) => {
      btn.setAttribute("aria-label", user ? "Konto von " + user.name + " öffnen" : "Mein Konto öffnen");
    });
    const unread = user ? Auth.getUnreadCount(user.email) : 0;
    document.querySelectorAll("[data-notif-badge]").forEach((badge) => {
      badge.hidden = unread === 0;
    });
  }

  document.querySelectorAll("[data-account-trigger]").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  window.addEventListener("novashop:auth-change", renderAuthState);
  window.addEventListener("novashop:notifications-change", () => {
    const user = Auth.getCurrentUser();
    if (!user) return;
    if (!accountView.hidden) renderNotifications(user);
    updateTriggerButtons(user);
  });
  document.addEventListener("DOMContentLoaded", renderAuthState);
  renderAuthState();
})();
