/* ===========================================================
   NovaShop — Scroll-Navigations-Button
   Runder Button am rechten Rand (nahe der Scrollbar), erscheint sobald
   gescrollt wurde. Springt zyklisch zwischen drei festen Haltepunkten:
   Seitenanfang → Seitenmitte → Seitenende → wieder Seitenanfang.
   Der Pfeil zeigt dabei immer in Richtung des nächsten Ziels.
   =========================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-icon scroll-nav-btn";
  btn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-chevron-up"></use></svg>';
  document.body.appendChild(btn);

  const LABELS = ["Zum Seitenanfang scrollen", "Zur Seitenmitte scrollen", "Zum Seitenende scrollen"];

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function stops() {
    const max = maxScroll();
    return [0, max / 2, max];
  }

  function nearestStopIndex(y, stopsArr) {
    let best = 0;
    let bestDist = Infinity;
    stopsArr.forEach((s, i) => {
      const dist = Math.abs(s - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  /* Ziel wird bei jedem Aufruf frisch aus der aktuellen Scroll-Position berechnet (nicht
     zwischengespeichert) — bleibt so auch korrekt, wenn sich die Seitenhöhe zwischendurch
     ändert (z.B. Tab-Wechsel im Admin-Bereich), ohne dass zuvor ein Scroll-Event feuerte. */
  function nextStop() {
    const y = window.scrollY;
    const stopsArr = stops();
    const nearest = nearestStopIndex(y, stopsArr);
    const index = nearest === 2 ? 0 : nearest + 1; // Zyklus: oben(0) -> Mitte(1) -> unten(2) -> oben(0)
    return { index, target: stopsArr[index], y };
  }

  function update() {
    const max = maxScroll();
    const shortPage = max < window.innerHeight * 0.6;
    if (window.scrollY < 80 || shortPage) {
      btn.classList.remove("is-visible");
      return;
    }
    btn.classList.add("is-visible");
    const { index, target, y } = nextStop();
    btn.classList.toggle("is-down", target > y);
    btn.setAttribute("aria-label", LABELS[index]);
  }

  btn.addEventListener("click", () => {
    window.scrollTo({ top: nextStop().target, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
})();
