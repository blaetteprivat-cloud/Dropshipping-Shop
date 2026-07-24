/* ===========================================================
   NovaShop — Cookie-/Speicher-Hinweis
   NovaShop nutzt aktuell ausschließlich technisch notwendige Speicherung:
   ein httpOnly-Session-Cookie (Login/Admin-Session) sowie localStorage für
   Warenkorb/Favoriten und diese Banner-Bestätigung — kein Tracking, keine
   Analyse- oder Marketing-Skripte. Dafür ist nach Art. 6 Abs. 1 lit. f DSGVO /
   §25 Abs. 2 Nr. 2 TTDSG keine Einwilligung nötig, ein Hinweis-Banner
   sorgt trotzdem für Transparenz. Kommen später Analyse-/Marketing-Skripte
   dazu, muss dieser Hinweis um echte Opt-in-Regler erweitert werden, bevor
   solche Skripte geladen werden dürfen.
   =========================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "novashop_cookie_notice_v1";

  if (localStorage.getItem(STORAGE_KEY) === "seen") return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner glass-strong";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Hinweis zur Datenspeicherung");
  banner.innerHTML = `
    <p>
      <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-shield-check"></use></svg>
      Wir speichern nur technisch Notwendiges (Warenkorb, Anmeldestatus) —
      keine Tracking- oder Marketing-Cookies. Details in unserer
      <a href="datenschutz.html">Datenschutzerklärung</a>.
    </p>
    <button type="button" class="btn btn-primary btn-sm" id="cookie-banner-accept">Verstanden</button>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add("is-visible"));

  document.getElementById("cookie-banner-accept").addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, "seen");
    banner.classList.remove("is-visible");
    setTimeout(() => banner.remove(), 250);
  });
})();
