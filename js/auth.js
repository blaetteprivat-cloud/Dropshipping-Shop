/* ===========================================================
   NovaShop — Konto-System (Auth, Session, Bestellhistorie, Benachrichtigungen)
   Dünner Client über die Server-API (server/routes/auth.js) — die eigentliche
   Session lebt in einem httpOnly-Cookie, hier wird nur ein Cache für
   synchrones Rendering gehalten (siehe Auth.ready).
   =========================================================== */
(function (global) {
  "use strict";

  const cache = { user: null, orders: [], notifications: [] };

  async function api(path, options) {
    const res = await fetch(path, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options));
    let data = {};
    try { data = await res.json(); } catch (e) { /* z. B. leere Antwort */ }
    if (!res.ok) {
      const err = new Error(data.error || "Ein Fehler ist aufgetreten.");
      if (data.code) err.code = data.code;
      throw err;
    }
    return data;
  }

  function notifyAuthChange() {
    global.dispatchEvent(new CustomEvent("novashop:auth-change", { detail: cache.user }));
  }
  function notifyNotificationsChange() {
    global.dispatchEvent(new CustomEvent("novashop:notifications-change"));
  }

  async function refreshOrders() {
    if (!cache.user) { cache.orders = []; return; }
    try {
      const data = await api("/api/orders");
      cache.orders = data.orders || [];
    } catch (e) {
      cache.orders = [];
    }
  }

  async function refreshNotifications() {
    if (!cache.user) { cache.notifications = []; return; }
    try {
      const data = await api("/api/auth/notifications");
      cache.notifications = data.notifications || [];
    } catch (e) {
      cache.notifications = [];
    }
  }

  async function bootstrap() {
    try {
      const data = await api("/api/auth/me");
      cache.user = data.user;
    } catch (e) {
      cache.user = null;
    }
    await Promise.all([refreshOrders(), refreshNotifications()]);
    notifyAuthChange();
  }

  const ready = bootstrap();

  function getCurrentUser() {
    return cache.user;
  }

  /* -------------------- Registrierung & E-Mail-Verifizierung -------------------- */
  async function register({ name, email, password }) {
    return api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  }

  async function resendVerification(email) {
    return api("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
  }

  async function verifyEmail(email, token) {
    const result = await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ email, token }) });
    cache.user = result.user;
    await Promise.all([refreshOrders(), refreshNotifications()]);
    notifyAuthChange();
    return result;
  }

  async function login({ email, password }) {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    cache.user = result.user;
    await Promise.all([refreshOrders(), refreshNotifications()]);
    notifyAuthChange();
    return cache.user;
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    cache.user = null;
    cache.orders = [];
    cache.notifications = [];
    notifyAuthChange();
  }

  function getOrders() {
    return cache.orders;
  }

  /* -------------------- Benachrichtigungen -------------------- */
  function getNotifications() {
    return cache.notifications;
  }

  function getUnreadCount() {
    return cache.notifications.filter((n) => !n.read).length;
  }

  async function markNotificationRead(email, notificationId) {
    await api(`/api/auth/notifications/${notificationId}/read`, { method: "POST" });
    const note = cache.notifications.find((n) => String(n.id) === String(notificationId));
    if (note) note.read = true;
    notifyNotificationsChange();
  }

  async function markAllNotificationsRead() {
    await api("/api/auth/notifications/read-all", { method: "POST" });
    cache.notifications.forEach((n) => (n.read = true));
    notifyNotificationsChange();
  }

  /* -------------------- Konto löschen & Datenexport (DSGVO) -------------------- */
  async function deleteAccount(password) {
    await api("/api/auth/delete-account", { method: "POST", body: JSON.stringify({ password }) });
    cache.user = null;
    cache.orders = [];
    cache.notifications = [];
    notifyAuthChange();
  }

  async function exportData() {
    const res = await fetch("/api/auth/export", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Export fehlgeschlagen. Bitte versuch es erneut.");
    return res.blob();
  }

  global.Auth = {
    ready,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    getCurrentUser,
    getOrders,
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteAccount,
    exportData,
  };
})(window);
