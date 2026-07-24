/* ===========================================================
   NovaShop — Konto-System (Auth, Session, Bestellhistorie, Benachrichtigungen)
   Rein clientseitig auf localStorage-Basis, da diese Seite ohne
   eigenes Backend läuft. Passwörter werden nie im Klartext
   gespeichert (SHA-256), es handelt sich aber NICHT um eine echte
   Server-Authentifizierung — für einen echten Shop braucht es ein
   Backend mit sicherer Auth und einem echten Mailserver für die
   E-Mail-Verifizierung (hier simuliert, siehe account.js/verify.html).
   =========================================================== */
(function (global) {
  "use strict";

  const USERS_KEY = "novashop_users_v1";
  const SESSION_KEY = "novashop_session_v1";
  const ORDERS_KEY = "novashop_orders_v1";
  const NOTIFICATIONS_KEY = "novashop_notifications_v1";

  function safeParse(json, fallback) {
    try {
      const val = JSON.parse(json);
      return val && typeof val === "object" ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function readUsers() {
    return safeParse(localStorage.getItem(USERS_KEY), {});
  }
  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function readOrders() {
    return safeParse(localStorage.getItem(ORDERS_KEY), {});
  }
  function writeOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }
  function readNotifications() {
    return safeParse(localStorage.getItem(NOTIFICATIONS_KEY), {});
  }
  function writeNotifications(notifications) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    global.dispatchEvent(new CustomEvent("novashop:notifications-change"));
  }

  function generateToken() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }

  async function hashPassword(password) {
    if (global.crypto && global.crypto.subtle) {
      const bytes = new TextEncoder().encode(password);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback für sehr alte Browser ohne SubtleCrypto (nur Demo-Zweck)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return "fallback_" + hash;
  }

  function notifyAuthChange() {
    global.dispatchEvent(new CustomEvent("novashop:auth-change", { detail: getCurrentUser() }));
  }

  function getCurrentUser() {
    const session = safeParse(localStorage.getItem(SESSION_KEY), null);
    if (!session || !session.email) return null;
    const users = readUsers();
    const user = users[session.email];
    if (!user) return null;
    return { name: user.name, email: user.email, createdAt: user.createdAt };
  }

  /* -------------------- Registrierung & E-Mail-Verifizierung -------------------- */
  async function register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsers();
    if (users[normalizedEmail]) {
      throw new Error("Für diese E-Mail-Adresse existiert bereits ein Konto.");
    }
    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();
    users[normalizedEmail] = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
      verified: false,
      verificationToken,
    };
    writeUsers(users);
    // Kein Login vor Verifizierung — Session wird erst nach Bestätigung der E-Mail gesetzt.
    return { email: normalizedEmail, name: name.trim(), verificationToken };
  }

  function resendVerification(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsers();
    const user = users[normalizedEmail];
    if (!user) throw new Error("Kein Konto mit dieser E-Mail-Adresse gefunden.");
    if (user.verified) throw new Error("Diese E-Mail-Adresse ist bereits bestätigt.");
    user.verificationToken = generateToken();
    writeUsers(users);
    return { email: normalizedEmail, name: user.name, verificationToken: user.verificationToken };
  }

  function verifyEmail(email, token) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const users = readUsers();
    const user = users[normalizedEmail];
    if (!user) throw new Error("Kein Konto mit dieser E-Mail-Adresse gefunden.");
    if (user.verified) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizedEmail }));
      notifyAuthChange();
      return { alreadyVerified: true, user: getCurrentUser() };
    }
    if (!token || token !== user.verificationToken) {
      throw new Error("Der Bestätigungslink ist ungültig oder abgelaufen.");
    }
    user.verified = true;
    delete user.verificationToken;
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizedEmail }));
    notifyAuthChange();
    return { alreadyVerified: false, user: getCurrentUser() };
  }

  async function login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsers();
    const user = users[normalizedEmail];
    if (!user) {
      throw new Error("Kein Konto mit dieser E-Mail-Adresse gefunden.");
    }
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Falsches Passwort. Bitte versuch es erneut.");
    }
    if (!user.verified) {
      const err = new Error("Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen Bestätigungslink geschickt.");
      err.code = "EMAIL_NOT_VERIFIED";
      throw err;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizedEmail }));
    notifyAuthChange();
    return getCurrentUser();
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChange();
  }

  function getOrders(email) {
    if (!email) return [];
    const orders = readOrders();
    return orders[email] || [];
  }

  /* -------------------- Gast-Bestellungen --------------------
     Ohne Konto gibt es keine E-Mail als Schlüssel — Bestellungen werden trotzdem nicht
     verworfen, sondern unter einer pro Browser stabilen Gast-ID abgelegt, damit ein Gast
     seine Bestellung nach dem Kauf über die Bestellnummer wiederfinden kann. */
  const GUEST_ID_KEY = "novashop_guest_id_v1";

  function getGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = "guest_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  }

  function addGuestOrder(guestContact, order) {
    const key = "guest:" + getGuestId();
    const record = addOrder(key, Object.assign({ guestContact }, order));
    return record;
  }

  function getGuestOrders() {
    return getOrders("guest:" + getGuestId());
  }

  function addOrder(email, order) {
    const orders = readOrders();
    const list = orders[email] || [];
    const record = Object.assign(
      {
        id: "NS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        date: new Date().toISOString(),
        status: "In Bearbeitung",
      },
      order
    );
    list.unshift(record);
    orders[email] = list;
    writeOrders(orders);
    return record;
  }

  const STATUS_MESSAGES = {
    "In Bearbeitung": "wird bearbeitet.",
    Versendet: "wurde versendet und ist unterwegs zu dir!",
    Abgeschlossen: "wurde erfolgreich abgeschlossen.",
    Storniert: "wurde storniert.",
  };

  function updateOrderStatus(email, orderId, status) {
    const orders = readOrders();
    const list = orders[email] || [];
    const order = list.find((o) => o.id === orderId);
    if (!order) return null;
    order.status = status;
    writeOrders(orders);
    addNotification(email, {
      type: "order-status",
      orderId,
      title: "Bestellung " + orderId,
      message: "Deine Bestellung " + orderId + " " + (STATUS_MESSAGES[status] || "wurde aktualisiert: " + status),
    });
    global.dispatchEvent(new CustomEvent("novashop:orders-change"));
    return order;
  }

  /* -------------------- Benachrichtigungen -------------------- */
  function getNotifications(email) {
    if (!email) return [];
    const all = readNotifications();
    return all[email] || [];
  }

  function getUnreadCount(email) {
    return getNotifications(email).filter((n) => !n.read).length;
  }

  function addNotification(email, notification) {
    const all = readNotifications();
    const list = all[email] || [];
    const record = Object.assign(
      {
        id: "note-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date().toISOString(),
        read: false,
      },
      notification
    );
    list.unshift(record);
    all[email] = list;
    writeNotifications(all);
    return record;
  }

  function markNotificationRead(email, notificationId) {
    const all = readNotifications();
    const list = all[email] || [];
    const note = list.find((n) => n.id === notificationId);
    if (note) note.read = true;
    writeNotifications(all);
  }

  function markAllNotificationsRead(email) {
    const all = readNotifications();
    const list = all[email] || [];
    list.forEach((n) => (n.read = true));
    writeNotifications(all);
  }

  /* -------------------- Admin-Zugriff (alle Kunden/Bestellungen) -------------------- */
  function getAllUsers() {
    const users = readUsers();
    return Object.values(users).map((u) => ({ name: u.name, email: u.email, createdAt: u.createdAt, verified: u.verified }));
  }

  function getAllOrders() {
    const orders = readOrders();
    const users = readUsers();
    const all = [];
    Object.keys(orders).forEach((key) => {
      orders[key].forEach((order) => {
        let customerName = users[key] ? users[key].name : key;
        let customerEmail = key;
        if (key.indexOf("guest:") === 0 && order.guestContact) {
          customerName = order.guestContact.name + " (Gast)";
          customerEmail = order.guestContact.email;
        }
        // orderKey ist der interne Speicherschlüssel (bei Gästen "guest:<id>", nicht die Kontakt-E-Mail)
        // und wird für updateOrderStatus() benötigt — customerEmail ist nur zur Anzeige gedacht.
        all.push(Object.assign({ customerEmail, customerName, orderKey: key }, order));
      });
    });
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    return all;
  }

  global.Auth = {
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    getCurrentUser,
    getOrders,
    addOrder,
    addGuestOrder,
    getGuestOrders,
    updateOrderStatus,
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    getAllUsers,
    getAllOrders,
    hashPassword,
  };
})(window);
