/* ===========================================================
   NovaShop — Produktdetailseite
   Galerie, Produktinfos, Warenkorb-Panel, Kategorien-Sidebar,
   mobile Drawer und ähnliche Produkte.
   =========================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  const product = ProductOverrides.getEffectiveProduct(productId) || ProductOverrides.getEffectiveProducts()[0];
  const primaryCategoryId = product ? (product.categories.find((c) => c !== "beliebt") || product.categories[0]) : "beliebt";
  const primaryCategory = CATEGORIES.find((c) => c.id === primaryCategoryId) || CATEGORIES[0];

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

  /* -------------------- Suche: leitet zur Shop-Übersicht -------------------- */
  const searchInput = document.getElementById("product-search");
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      window.location.href = "shop.html?q=" + encodeURIComponent(searchInput.value.trim());
    }
  });

  /* -------------------- Kategorien-Sidebar (führt zur Shop-Übersicht) -------------------- */
  const categoryListEl = document.getElementById("category-list");
  function countForCategory(catId) {
    return ProductOverrides.getEffectiveProducts().filter((p) => p.active && p.categories.includes(catId)).length;
  }
  categoryListEl.innerHTML = CATEGORIES.map(
    (cat) => `
    <button type="button" role="option" aria-selected="${cat.id === primaryCategoryId}" class="${cat.id === primaryCategoryId ? "is-active" : ""}" data-category="${cat.id}">
      <svg class="icon icon-sm" aria-hidden="true"><use href="#${cat.icon}"></use></svg>
      ${cat.label}
      <span class="count">${countForCategory(cat.id)}</span>
    </button>`
  ).join("");
  categoryListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    window.location.href = "shop.html?cat=" + btn.getAttribute("data-category");
  });

  /* -------------------- Breadcrumb -------------------- */
  const breadcrumbEl = document.getElementById("breadcrumb");
  if (product) {
    breadcrumbEl.innerHTML = `
      <a href="index.html">Startseite</a>
      <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-chevron-right"></use></svg>
      <a href="shop.html?cat=${primaryCategory.id}">${primaryCategory.label}</a>
      <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-chevron-right"></use></svg>
      <span aria-current="page">${product.name}</span>`;
  }

  /* -------------------- Produktdetail rendern -------------------- */
  const detailEl = document.getElementById("product-detail");

  function renderNotFound() {
    detailEl.innerHTML = `
      <div class="empty-state">
        <svg class="icon" aria-hidden="true"><use href="#icon-search"></use></svg>
        <p>Dieses Produkt ist nicht mehr verfügbar.</p>
        <a class="btn btn-primary" href="shop.html">Zurück zum Shop</a>
      </div>`;
  }

  function renderProductDetail() {
    if (!product) { renderNotFound(); return; }
    const isFav = Favorites.isFavorite(product.id);
    const soldOut = typeof product.stock === "number" && product.stock <= 0;
    const lowStock = typeof product.stock === "number" && product.stock > 0 && product.stock <= 5;
    const priceHtml = product.oldPrice
      ? `<strong>${formatPrice(product.price)}</strong><del>${formatPrice(product.oldPrice)}</del>`
      : `<strong>${formatPrice(product.price)}</strong>`;

    document.title = product.name + " — NovaShop";
    const badge = discountBadgeFor(product);
    const name = escapeHtml(product.name);
    const subtitle = escapeHtml(product.subtitle);

    detailEl.innerHTML = `
      <div class="product-detail">
        <div class="product-detail__gallery">
          <div class="product-detail__main glass tint-${product.tint}">
            ${badge && !soldOut ? `<span class="product-card__badge">${escapeHtml(badge)}</span>` : ""}
            ${soldOut ? `<span class="product-card__badge product-card__badge--soldout">Ausverkauft</span>` : ""}
            <button class="product-card__fav" type="button" aria-pressed="${isFav}" aria-label="${name} zu Favoriten hinzufügen" data-fav-toggle="${product.id}">
              <svg class="icon icon-sm icon-heart" aria-hidden="true"><use href="#icon-heart"></use></svg>
              <svg class="icon icon-sm icon-heart-filled" aria-hidden="true"><use href="#icon-heart-filled"></use></svg>
            </button>
            <svg class="icon" aria-hidden="true"><use href="#${product.icon}"></use></svg>
          </div>
          <div class="product-detail__thumbs">
            ${[0, 1, 2, 3].map((i) => `
              <button type="button" class="product-detail__thumb tint-${product.tint} ${i === 0 ? "is-active" : ""}" aria-label="Ansicht ${i + 1}">
                <svg class="icon icon-sm" aria-hidden="true"><use href="#${product.icon}"></use></svg>
              </button>`).join("")}
          </div>
        </div>

        <div class="product-detail__info">
          <h1 class="product-detail__title">${name}</h1>
          <span class="product-card__rating product-detail__rating">
            <svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>
            ${product.rating.toFixed(1)} (${product.reviews} Bewertungen)
          </span>
          <div class="product-detail__price">${priceHtml}</div>
          <p class="product-detail__desc">${subtitle}. Sorgfältig ausgewählt für Alltagstauglichkeit, geprüfte Qualität und schnellen Versand — mit vollem Käuferschutz abgesichert.</p>

          <div class="product-detail__specs">
            <span><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-check"></use></svg>Premium Qualität</span>
            <span><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-truck"></use></svg>Schneller Versand</span>
            <span><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-shield-check"></use></svg>Käuferschutz</span>
            <span><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-rotate"></use></svg>30 Tage Rückgabe</span>
          </div>

          <div class="product-detail__stock">
            <span class="product-detail__stock-dot ${soldOut ? "is-out" : ""}" aria-hidden="true"></span>
            ${soldOut ? "Ausverkauft" : lowStock ? `Nur noch ${product.stock} auf Lager` : "Auf Lager"}
            <span class="product-detail__delivery">Lieferzeit 1–3 Werktage</span>
          </div>

          <div class="product-detail__actions">
            <div class="qty-control qty-control--lg" id="detail-qty">
              <button type="button" id="detail-qty-decrease" aria-label="Menge verringern"><svg class="icon" aria-hidden="true"><use href="#icon-minus"></use></svg></button>
              <span class="qty-control__value" id="detail-qty-value">1</span>
              <button type="button" id="detail-qty-increase" aria-label="Menge erhöhen"><svg class="icon" aria-hidden="true"><use href="#icon-plus"></use></svg></button>
            </div>
            <button class="btn btn-primary product-detail__add" type="button" id="detail-add-to-cart" ${soldOut ? "disabled" : ""}>
              <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-cart"></use></svg>
              ${soldOut ? "Ausverkauft" : "In den Warenkorb"}
            </button>
          </div>

          <button class="product-detail__wishlist" type="button" id="detail-fav-toggle" data-fav-toggle="${product.id}" aria-pressed="${isFav}">
            <svg class="icon icon-sm icon-heart" aria-hidden="true"><use href="#icon-heart"></use></svg>
            <svg class="icon icon-sm icon-heart-filled" aria-hidden="true"><use href="#icon-heart-filled"></use></svg>
            <span>${isFav ? "Gemerkt" : "Merken"}</span>
          </button>
        </div>
      </div>

      <div class="trust-row">
        <span><svg class="icon" aria-hidden="true"><use href="#icon-truck"></use></svg>Kostenloser Versand</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-shield-check"></use></svg>Sicher bezahlen</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-rotate"></use></svg>Einfache Rückgabe</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-headset"></use></svg>Persönlicher Support</span>
      </div>`;

    let qty = 1;
    const maxQty = typeof product.stock === "number" ? Math.max(1, product.stock) : Infinity;
    const qtyValueEl = document.getElementById("detail-qty-value");
    document.getElementById("detail-qty-decrease").addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyValueEl.textContent = qty;
    });
    document.getElementById("detail-qty-increase").addEventListener("click", () => {
      if (qty >= maxQty) {
        showToast("Maximale Menge erreicht", `Nur noch ${maxQty} Stück auf Lager.`);
        return;
      }
      qty = qty + 1;
      qtyValueEl.textContent = qty;
    });
    const addBtn = document.getElementById("detail-add-to-cart");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const before = qty;
        const summary = Cart.add(product.id, qty);
        const inCart = (summary.items.find((i) => i.id === product.id) || {}).qty || 0;
        showToast("Zum Warenkorb hinzugefügt", `${Math.min(before, inCart)} × ${product.name}`);
      });
    }
    detailEl.querySelectorAll(".product-detail__thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        detailEl.querySelectorAll(".product-detail__thumb").forEach((t) => t.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }
  renderProductDetail();

  /* Hält Herz-Button im Bild und "Merken"-Button synchron, egal welcher geklickt wurde */
  if (product) {
    window.addEventListener("novashop:fav-change", () => {
      const isNowFav = Favorites.isFavorite(product.id);
      const wishlistBtn = document.getElementById("detail-fav-toggle");
      if (wishlistBtn) {
        wishlistBtn.setAttribute("aria-pressed", String(isNowFav));
        wishlistBtn.querySelector("span").textContent = isNowFav ? "Gemerkt" : "Merken";
      }
      const mediaFavBtn = detailEl.querySelector("[data-fav-toggle]:not(#detail-fav-toggle)");
      if (mediaFavBtn) mediaFavBtn.setAttribute("aria-pressed", String(isNowFav));
    });
  }

  /* -------------------- Ähnliche Produkte -------------------- */
  const relatedSection = document.getElementById("related-section");
  const relatedGrid = document.getElementById("related-grid");
  if (product) {
    const related = ProductOverrides.getEffectiveProducts()
      .filter((p) => p.active && p.id !== product.id && p.categories.some((c) => product.categories.includes(c)))
      .slice(0, 4);
    if (related.length > 0) {
      relatedSection.hidden = false;
      relatedGrid.innerHTML = related.map(renderProductCard).join("");
    }
  }

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
