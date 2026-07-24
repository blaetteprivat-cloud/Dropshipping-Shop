/* ===========================================================
   NovaShop — Shop-Seite Interaktionen
   Kategorie-Filter, Suche, Karussell, Warenkorb-Panel, mobile Drawer
   =========================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeCategory = "beliebt";
  let searchTerm = "";
  let subnavFilter = "all";

  /* -------------------- Initial-Kategorie aus URL (?cat=) -------------------- */
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get("cat");
  if (catParam && CATEGORIES.some((c) => c.id === catParam)) {
    activeCategory = catParam;
  }
  const qParam = params.get("q");
  if (qParam) searchTerm = qParam.toLowerCase();

  /* -------------------- Mobiles Hauptmenü -------------------- */
  const navToggle = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.querySelector("use").setAttribute("href", isOpen ? "#icon-close" : "#icon-menu");
    });
  }

  /* -------------------- Kategorien-Sidebar rendern -------------------- */
  const categoryListEl = document.getElementById("category-list");

  function countForCategory(catId) {
    return ProductOverrides.getEffectiveProducts().filter((p) => p.active && p.categories.includes(catId)).length;
  }

  function renderCategoryList() {
    categoryListEl.innerHTML = CATEGORIES.map(
      (cat) => `
      <button type="button" role="option" aria-selected="${cat.id === activeCategory}" class="${cat.id === activeCategory ? "is-active" : ""}" data-category="${cat.id}">
        <svg class="icon icon-sm" aria-hidden="true"><use href="#${cat.icon}"></use></svg>
        ${cat.label}
        <span class="count">${countForCategory(cat.id)}</span>
      </button>`
    ).join("");
  }
  renderCategoryList();

  categoryListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    activeCategory = btn.getAttribute("data-category");
    renderCategoryList();
    renderProducts();
    closeCategoryPanel();
    document.getElementById("products-heading").innerHTML =
      '<svg class="icon icon-sm" aria-hidden="true"><use href="#' +
      (CATEGORIES.find((c) => c.id === activeCategory) || {}).icon +
      '"></use></svg>' +
      (CATEGORIES.find((c) => c.id === activeCategory) || {}).label;
  });

  /* -------------------- Suche -------------------- */
  const searchInput = document.getElementById("product-search");
  if (qParam) searchInput.value = qParam;
  let searchDebounce = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      renderProducts();
    }, 180);
  });

  /* -------------------- Produktgrid -------------------- */
  const productsGrid = document.getElementById("products-grid");
  const productsCount = document.getElementById("products-count");

  function renderProducts() {
    let list = ProductOverrides.getEffectiveProducts().filter((p) => p.active && p.categories.includes(activeCategory));
    if (searchTerm) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(searchTerm) || p.subtitle.toLowerCase().includes(searchTerm)
      );
    }
    if (subnavFilter === "new") list = list.filter((p) => p.badge === "Neu");
    else if (subnavFilter === "bestseller") list = list.filter((p) => p.badge === "Bestseller");
    else if (subnavFilter === "sale") list = list.filter((p) => p.oldPrice && p.oldPrice > p.price);
    productsCount.textContent = list.length + (list.length === 1 ? " Produkt" : " Produkte");
    if (list.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-state">
          <svg class="icon" aria-hidden="true"><use href="#icon-search"></use></svg>
          <p>Keine Produkte gefunden. Versuch es mit einem anderen Suchbegriff oder einer anderen Kategorie.</p>
        </div>`;
      return;
    }
    productsGrid.innerHTML = list.map(renderProductCard).join("");
  }
  renderProducts();

  /* Reagiert live auf Änderungen aus dem Admin-Bereich (Preis/Lagerbestand/Aktiv-Status) */
  window.addEventListener("novashop:products-change", () => {
    renderCategoryList();
    renderProducts();
  });

  /* -------------------- Schnellfilter (Neuheiten/Bestseller/Sale) -------------------- */
  const subnavEl = document.getElementById("shop-subnav");
  if (subnavEl) {
    subnavEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-subnav]");
      if (!btn) return;
      subnavFilter = btn.getAttribute("data-subnav");
      subnavEl.querySelectorAll("[data-subnav]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        if (active) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
      renderProducts();
    });
  }

  /* -------------------- Hero-Karussell -------------------- */
  const heroTrack = document.getElementById("hero-track");
  const heroSlides = heroTrack.children;
  const heroDots = document.getElementById("hero-dots");
  const heroPrev = document.getElementById("hero-prev");
  const heroNext = document.getElementById("hero-next");
  const heroPause = document.getElementById("hero-pause");
  let heroIndex = 0;
  let heroTimer = null;
  let heroPausedByUser = prefersReducedMotion;

  heroDots.innerHTML = Array.from(heroSlides)
    .map((_, i) => `<button type="button" aria-label="Angebot ${i + 1} anzeigen" class="${i === 0 ? "is-active" : ""}"></button>`)
    .join("");

  function goToSlide(index) {
    heroIndex = (index + heroSlides.length) % heroSlides.length;
    heroTrack.style.transform = `translateX(-${heroIndex * 100}%)`;
    Array.from(heroDots.children).forEach((dot, i) => dot.classList.toggle("is-active", i === heroIndex));
    // Inaktive Slides für Screenreader ausblenden, statt alle drei gleichzeitig vorzulesen.
    Array.from(heroSlides).forEach((slide, i) => {
      slide.toggleAttribute("inert", i !== heroIndex);
      slide.setAttribute("aria-hidden", String(i !== heroIndex));
    });
  }

  function startAutoplay() {
    if (prefersReducedMotion || heroPausedByUser) return;
    stopAutoplay();
    heroTimer = setInterval(() => goToSlide(heroIndex + 1), 6000);
  }
  function stopAutoplay() {
    if (heroTimer) clearInterval(heroTimer);
  }

  heroPrev.addEventListener("click", () => { goToSlide(heroIndex - 1); startAutoplay(); });
  heroNext.addEventListener("click", () => { goToSlide(heroIndex + 1); startAutoplay(); });
  heroDots.addEventListener("click", (e) => {
    const dot = e.target.closest("button");
    if (!dot) return;
    goToSlide(Array.from(heroDots.children).indexOf(dot));
    startAutoplay();
  });
  if (heroPause) {
    if (prefersReducedMotion) {
      heroPause.setAttribute("aria-pressed", "true");
      heroPause.querySelector("use").setAttribute("href", "#icon-play");
    }
    heroPause.addEventListener("click", () => {
      heroPausedByUser = !heroPausedByUser;
      heroPause.setAttribute("aria-pressed", String(heroPausedByUser));
      heroPause.setAttribute("aria-label", heroPausedByUser ? "Automatischen Wechsel fortsetzen" : "Automatischen Wechsel pausieren");
      heroPause.querySelector("use").setAttribute("href", heroPausedByUser ? "#icon-play" : "#icon-pause");
      if (heroPausedByUser) stopAutoplay();
      else startAutoplay();
    });
  }
  const heroSection = document.querySelector(".shop-hero");
  heroSection.addEventListener("mouseenter", stopAutoplay);
  heroSection.addEventListener("mouseleave", startAutoplay);
  heroSection.addEventListener("focusin", stopAutoplay);
  heroSection.addEventListener("focusout", startAutoplay);
  goToSlide(0);
  startAutoplay();

  /* -------------------- Mobile Drawer: Kategorien & Warenkorb -------------------- */
  const categoryPanel = document.getElementById("category-panel");
  const cartPanel = document.getElementById("cart-panel");
  const scrim = document.getElementById("scrim");
  const openCategoryBtn = document.getElementById("open-category-panel");
  const closeCategoryBtn = document.getElementById("close-category-panel");
  const openCartBtn = document.getElementById("open-cart");
  const closeCartBtn = document.getElementById("close-cart-panel");

  function isMobileLayout() {
    return window.matchMedia("(max-width: 1179px)").matches;
  }

  function openCategoryPanel() {
    if (!isMobileLayout()) return;
    categoryPanel.classList.add("is-open");
    scrim.classList.add("is-open");
    openCategoryBtn.setAttribute("aria-expanded", "true");
  }
  function closeCategoryPanel() {
    categoryPanel.classList.remove("is-open");
    if (!cartPanel.classList.contains("is-open")) scrim.classList.remove("is-open");
    openCategoryBtn.setAttribute("aria-expanded", "false");
  }
  function openCartPanel() {
    if (!isMobileLayout()) return;
    cartPanel.classList.add("is-open");
    scrim.classList.add("is-open");
    openCartBtn.setAttribute("aria-expanded", "true");
  }
  function closeCartPanel() {
    cartPanel.classList.remove("is-open");
    if (!categoryPanel.classList.contains("is-open")) scrim.classList.remove("is-open");
    openCartBtn.setAttribute("aria-expanded", "false");
  }

  openCategoryBtn.addEventListener("click", openCategoryPanel);
  closeCategoryBtn.addEventListener("click", closeCategoryPanel);
  openCartBtn.addEventListener("click", () => {
    if (isMobileLayout()) openCartPanel();
    else cartPanel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });
  closeCartBtn.addEventListener("click", closeCartPanel);
  scrim.addEventListener("click", () => { closeCategoryPanel(); closeCartPanel(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeCategoryPanel(); closeCartPanel(); }
  });

  /* -------------------- Warenkorb-Panel rendern -------------------- */
  const cartItemsEl = document.getElementById("cart-items");
  const cartSummaryEl = document.getElementById("cart-summary");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartShippingEl = document.getElementById("cart-shipping");
  const cartTotalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  function renderCart() {
    const summary = Cart.getSummary();
    if (summary.items.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <svg class="icon" aria-hidden="true"><use href="#icon-cart"></use></svg>
          <p>Dein Warenkorb ist noch leer. Entdecke unsere beliebten Produkte!</p>
        </div>`;
      cartSummaryEl.hidden = true;
      checkoutBtn.disabled = true;
      return;
    }
    cartSummaryEl.hidden = false;
    checkoutBtn.disabled = false;
    cartItemsEl.innerHTML = summary.items
      .map(
        (item) => `
      <div class="cart-item" data-cart-item="${item.id}">
        <div class="cart-item__media tint-${item.tint}"><svg class="icon" aria-hidden="true"><use href="#${item.icon}"></use></svg></div>
        <div class="cart-item__info">
          <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.subtitle)}</span>
          <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
        </div>
        <div class="cart-item__actions">
          <button type="button" class="cart-item__remove" data-remove="${item.id}" aria-label="${escapeHtml(item.name)} entfernen">
            <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-trash"></use></svg>
          </button>
          <div class="qty-control">
            <button type="button" data-qty-decrease="${item.id}" aria-label="Menge verringern"><svg class="icon" aria-hidden="true"><use href="#icon-minus"></use></svg></button>
            <span class="qty-control__value">${item.qty}</span>
            <button type="button" data-qty-increase="${item.id}" aria-label="Menge erhöhen"><svg class="icon" aria-hidden="true"><use href="#icon-plus"></use></svg></button>
          </div>
        </div>
      </div>`
      )
      .join("");
    cartSubtotalEl.textContent = formatPrice(summary.subtotal);
    cartShippingEl.innerHTML = summary.shippingFree
      ? '<span class="value--free">Kostenlos</span>'
      : formatPrice(summary.shippingCost) + ` (ab ${formatPrice(summary.threshold)} kostenlos)`;
    cartTotalEl.textContent = formatPrice(summary.total);
  }
  renderCart();
  window.addEventListener("novashop:cart-change", renderCart);

  cartItemsEl.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      Cart.remove(removeBtn.getAttribute("data-remove"));
      return;
    }
    const incBtn = e.target.closest("[data-qty-increase]");
    if (incBtn) {
      const id = incBtn.getAttribute("data-qty-increase");
      const summary = Cart.getSummary();
      const current = summary.items.find((i) => i.id === id);
      const before = current ? current.qty : 0;
      const result = Cart.setQty(id, before + 1);
      const after = (result.items.find((i) => i.id === id) || {}).qty || 0;
      if (after === before) showToast("Maximale Menge erreicht", "Es ist nicht mehr Lagerbestand verfügbar.");
      return;
    }
    const decBtn = e.target.closest("[data-qty-decrease]");
    if (decBtn) {
      const id = decBtn.getAttribute("data-qty-decrease");
      const summary = Cart.getSummary();
      const current = summary.items.find((i) => i.id === id);
      Cart.setQty(id, (current ? current.qty : 0) - 1);
      return;
    }
  });

  checkoutBtn.addEventListener("click", () => {
    if (Cart.getSummary().items.length === 0) return;
    closeCartPanel();
    Checkout.open();
  });
})();
