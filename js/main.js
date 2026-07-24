/* ===========================================================
   NovaShop — Landing Page Interaktionen
   =========================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------- Mobiles Menü -------------------- */
  const navToggle = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.querySelector("use").setAttribute("href", "#icon-menu");
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.querySelector("use").setAttribute("href", isOpen ? "#icon-close" : "#icon-menu");
    });
    mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileMenu();
    });
  }

  /* -------------------- Scroll-Reveal -------------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* -------------------- Stat-Zähler -------------------- */
  /* Produktzahl kommt live aus dem Katalog statt als fixer Wert im Markup, damit sie nie von der
     Realität abweicht (z.B. wenn im Admin-Bereich Produkte hinzugefügt/entfernt werden). */
  const productCountEl = document.getElementById("stat-product-count");
  if (productCountEl && typeof ProductOverrides !== "undefined") {
    productCountEl.setAttribute("data-count", String(ProductOverrides.getEffectiveProducts().filter((p) => p.active).length));
  }

  const statEls = document.querySelectorAll(".stats__num");
  function animateCount(el) {
    const target = parseFloat(el.getAttribute("data-count"));
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
    if (prefersReducedMotion) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    const statIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    statEls.forEach((el) => statIo.observe(el));
  } else {
    statEls.forEach(animateCount);
  }

  /* -------------------- Kategorien-Vorschau -------------------- */
  const categoryPreviewEl = document.getElementById("category-preview");
  if (categoryPreviewEl && typeof CATEGORIES !== "undefined") {
    categoryPreviewEl.innerHTML = CATEGORIES.slice(0, 10)
      .map(
        (cat) => `
      <a class="category-tile glass reveal" href="shop.html?cat=${encodeURIComponent(cat.id)}">
        <span class="category-tile__icon"><svg class="icon" aria-hidden="true"><use href="#${cat.icon}"></use></svg></span>
        <span>${cat.label}</span>
      </a>`
      )
      .join("");
    categoryPreviewEl.querySelectorAll(".reveal").forEach((el) => {
      if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        el.classList.add("is-visible");
      } else {
        const io2 = new IntersectionObserver(
          (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-visible"), io2.unobserve(e.target))),
          { threshold: 0.15 }
        );
        io2.observe(el);
      }
    });
  }

  /* -------------------- Produkt-Vorschau -------------------- */
  const productPreviewEl = document.getElementById("product-preview");
  function renderFeaturedProducts() {
    if (!productPreviewEl || typeof ProductOverrides === "undefined") return;
    const featured = ProductOverrides.getEffectiveProducts()
      .filter((p) => p.active && p.categories.includes("beliebt"))
      .slice(0, 8);
    productPreviewEl.innerHTML = featured.map(renderProductCard).join("");
  }
  renderFeaturedProducts();
  window.addEventListener("novashop:products-change", renderFeaturedProducts);

  /* -------------------- Newsletter-Formular -------------------- */
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("newsletter-email");
      const status = document.getElementById("newsletter-status");
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input.value.trim())) {
        status.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
        status.setAttribute("data-state", "error");
        input.focus();
        return;
      }
      status.textContent = "Danke! Bitte bestätige deine Anmeldung über den Link in deiner Mailbox.";
      status.setAttribute("data-state", "success");
      newsletterForm.reset();
    });
  }
})();
