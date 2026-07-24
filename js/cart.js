/* ===========================================================
   NovaShop — Geteilter Zustand: Warenkorb, Favoriten, Toasts
   localStorage-basiert, damit Landing Page und Shop synchron bleiben.
   =========================================================== */
(function (global) {
  "use strict";

  const CART_KEY = "novashop_cart_v1";
  const FAV_KEY = "novashop_favorites_v1";
  const FREE_SHIPPING_THRESHOLD = 49;

  function safeParse(json, fallback) {
    try {
      const val = JSON.parse(json);
      return val && typeof val === "object" ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function readCart() {
    if (typeof localStorage === "undefined") return {};
    return safeParse(localStorage.getItem(CART_KEY), {});
  }

  function writeCart(state) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent("novashop:cart-change", { detail: getSummary() }));
  }

  function readFavorites() {
    if (typeof localStorage === "undefined") return {};
    return safeParse(localStorage.getItem(FAV_KEY), {});
  }

  function writeFavorites(state) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAV_KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent("novashop:fav-change", { detail: state }));
  }

  function getItemsDetailed() {
    const state = readCart();
    /* Der Produktkatalog lädt async vom Server (Products.ready). Bevor er da ist, liefert
       getProductById() für JEDE id null — das darf NICHT als "Produkt gelöscht" missverstanden
       und aus dem localStorage entfernt werden, sonst verliert der Nutzer bei jedem Seitenaufruf
       mit kaltem Cache seinen ganzen Warenkorb. Erst nach vollständig geladenem Katalog wird
       "nicht gefunden" tatsächlich als "existiert nicht mehr" gewertet und persistent entfernt. */
    const catalogReady = typeof Products !== "undefined" && typeof Products.isReady === "function" ? Products.isReady() : true;
    let pruned = false;
    const items = Object.keys(state)
      .map((id) => {
        const product = typeof getProductById === "function" ? getProductById(id) : null;
        if (!product) {
          if (catalogReady) {
            delete state[id];
            pruned = true;
          }
          return null;
        }
        return Object.assign({}, product, { qty: state[id] });
      })
      .filter(Boolean);
    if (pruned && catalogReady) {
      if (typeof localStorage !== "undefined") localStorage.setItem(CART_KEY, JSON.stringify(state));
    }
    return items;
  }

  function getSummary() {
    const items = getItemsDetailed();
    const count = items.reduce((sum, it) => sum + it.qty, 0);
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const shippingFree = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0;
    const shippingCost = shippingFree ? 0 : 4.99;
    const total = subtotal + shippingCost;
    return { items, count, subtotal, shippingFree, shippingCost, total, threshold: FREE_SHIPPING_THRESHOLD };
  }

  function resolveProduct(productId) {
    return typeof getProductById === "function" ? getProductById(productId) : null;
  }

  function maxQtyFor(productId) {
    const product = resolveProduct(productId);
    if (!product || typeof product.stock !== "number") return Infinity;
    return Math.max(0, product.stock);
  }

  function add(productId, qty) {
    qty = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
    const state = readCart();
    const max = maxQtyFor(productId);
    const next = Math.min((state[productId] || 0) + qty, max);
    const capped = next < (state[productId] || 0) + qty;
    if (next <= 0) {
      delete state[productId];
    } else {
      state[productId] = next;
    }
    writeCart(state);
    const summary = getSummary();
    if (capped) summary.cappedProductId = productId;
    return summary;
  }

  function setQty(productId, qty) {
    const state = readCart();
    const max = maxQtyFor(productId);
    if (!Number.isFinite(qty) || qty <= 0 || max <= 0) {
      delete state[productId];
    } else {
      state[productId] = Math.min(Math.floor(qty), max);
    }
    writeCart(state);
    return getSummary();
  }

  function remove(productId) {
    const state = readCart();
    delete state[productId];
    writeCart(state);
    return getSummary();
  }

  function clear() {
    writeCart({});
    return getSummary();
  }

  function isFavorite(productId) {
    return !!readFavorites()[productId];
  }

  function toggleFavorite(productId) {
    const state = readFavorites();
    if (state[productId]) {
      delete state[productId];
    } else {
      state[productId] = true;
    }
    writeFavorites(state);
    return !!state[productId];
  }

  global.Cart = {
    add,
    remove,
    setQty,
    clear,
    getSummary,
    FREE_SHIPPING_THRESHOLD,
  };

  global.Favorites = {
    isFavorite,
    toggleFavorite,
  };

  /* -------------------- Toast-Benachrichtigungen -------------------- */
  function ensureToastRegion() {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    return region;
  }

  function showToast(title, desc) {
    const region = ensureToastRegion();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML =
      '<span class="toast__icon"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-check"></use></svg></span>' +
      '<span class="toast__body"><span class="toast__title"></span><span class="toast__desc"></span></span>';
    toast.querySelector(".toast__title").textContent = title;
    toast.querySelector(".toast__desc").textContent = desc || "";
    region.appendChild(toast);

    const remove = () => {
      toast.setAttribute("data-leaving", "1");
      setTimeout(() => toast.remove(), 240);
    };
    setTimeout(remove, 3200);
  }

  global.showToast = showToast;

  function formatPrice(value) {
    return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }
  global.formatPrice = formatPrice;
})(window);
