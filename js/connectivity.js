/* ===========================================================
   NovaShop — Verbindungsstatus-Banner
   Läuft überall (Website UND App) — reine Web-Standard-APIs (navigator.onLine,
   online/offline-Events), kein Capacitor-Plugin nötig. In der App besonders wichtig: die Seite
   lädt komplett vom Server (siehe capacitor.config.json server.url), ohne Internet gibt es sonst
   keinerlei Rückmeldung, warum nichts reagiert.
   =========================================================== */
(function () {
  "use strict";

  function ensureBanner() {
    let banner = document.querySelector(".offline-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "offline-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.textContent = "Keine Internetverbindung — manche Funktionen sind eingeschränkt.";
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateState() {
    ensureBanner().classList.toggle("is-visible", !navigator.onLine);
  }

  window.addEventListener("online", updateState);
  window.addEventListener("offline", updateState);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateState);
  } else {
    updateState();
  }
})();
