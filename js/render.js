/* ===========================================================
   NovaShop — Geteiltes Rendering für Produktkarten
   Wird von main.js (Landing) und shop.js (Shop) genutzt.
   =========================================================== */
function renderProductCard(product) {
  const isFav = window.Favorites ? window.Favorites.isFavorite(product.id) : false;
  const priceHtml = product.oldPrice
    ? `<strong>${formatPrice(product.price)}</strong><del>${formatPrice(product.oldPrice)}</del>`
    : `<strong>${formatPrice(product.price)}</strong>`;
  const soldOut = typeof product.stock === "number" && product.stock <= 0;
  const lowStock = typeof product.stock === "number" && product.stock > 0 && product.stock <= 5;
  const badge = discountBadgeFor(product);
  const name = escapeHtml(product.name);
  const subtitle = escapeHtml(product.subtitle);
  const badgeHtml = soldOut
    ? `<span class="product-card__badge product-card__badge--soldout">Ausverkauft</span>`
    : badge
    ? `<span class="product-card__badge">${escapeHtml(badge)}</span>`
    : "";
  return `
    <article class="product-card glass tint-${product.tint}" data-id="${product.id}">
      <a class="product-card__media" href="product.html?id=${product.id}" aria-label="${name} ansehen">
        ${badgeHtml}
        <button class="product-card__fav" type="button" aria-pressed="${isFav}" aria-label="${name} zu Favoriten hinzufügen" data-fav-toggle="${product.id}">
          <svg class="icon icon-sm icon-heart" aria-hidden="true"><use href="#icon-heart"></use></svg>
          <svg class="icon icon-sm icon-heart-filled" aria-hidden="true"><use href="#icon-heart-filled"></use></svg>
        </button>
        <svg class="icon" aria-hidden="true"><use href="#${product.icon}"></use></svg>
      </a>
      <div class="product-card__body">
        <a class="product-card__name-link" href="product.html?id=${product.id}">
          <h3 class="product-card__name">${name}</h3>
        </a>
        <p class="product-card__subtitle">${subtitle}</p>
        <span class="product-card__rating">
          <svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>
          ${product.rating.toFixed(1)} (${product.reviews})
        </span>
        ${lowStock ? `<span class="product-card__stock">Nur noch ${product.stock} auf Lager</span>` : ""}
        <div class="product-card__footer">
          <span class="product-card__price">${priceHtml}</span>
        </div>
        <button class="product-card__add product-card__add--full" type="button" ${soldOut ? "disabled" : ""} aria-label="${soldOut ? name + " ist ausverkauft" : name + " in den Warenkorb legen"}" data-add-to-cart="${product.id}">
          <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-cart"></use></svg>
          In den Warenkorb
        </button>
      </div>
    </article>`;
}

/* Delegierte Klick-Handler für Warenkorb-Buttons + Favoriten (auf allen Seiten aktiv) */
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest("[data-add-to-cart]");
  if (addBtn) {
    if (addBtn.disabled) return;
    const id = addBtn.getAttribute("data-add-to-cart");
    const product = typeof getProductById === "function" ? getProductById(id) : null;
    if (product && typeof product.stock === "number" && product.stock <= 0) return;
    const before = (Cart.getSummary().items.find((i) => i.id === id) || {}).qty || 0;
    const result = Cart.add(id, 1);
    const after = (result.items.find((i) => i.id === id) || {}).qty || 0;
    addBtn.setAttribute("data-added", "1");
    setTimeout(() => addBtn.removeAttribute("data-added"), 900);
    if (after === before) {
      showToast("Maximale Menge erreicht", "Es ist nicht mehr Lagerbestand verfügbar.");
    } else if (product) {
      if (window.NovaCapacitor) window.NovaCapacitor.haptic();
      showToast("Zum Warenkorb hinzugefügt", product.name);
    }
    return;
  }
  const favBtn = e.target.closest("[data-fav-toggle]");
  if (favBtn) {
    const id = favBtn.getAttribute("data-fav-toggle");
    const isFav = window.Favorites.toggleFavorite(id);
    favBtn.setAttribute("aria-pressed", String(isFav));
  }
});

/* Cart-Badge aktuell halten (alle Badges auf der Seite, z.B. Header + Warenkorb-Panel-Titel) */
function updateCartBadges() {
  const summary = Cart.getSummary();
  document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
    if (summary.count > 0) {
      badge.hidden = false;
      badge.textContent = summary.count > 99 ? "99+" : String(summary.count);
      badge.setAttribute("data-pop", "1");
      setTimeout(() => badge.removeAttribute("data-pop"), 350);
    } else {
      badge.hidden = true;
    }
  });
}
document.addEventListener("DOMContentLoaded", updateCartBadges);
Products.ready.then(updateCartBadges);
window.addEventListener("novashop:cart-change", updateCartBadges);
