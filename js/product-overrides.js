/* ===========================================================
   NovaShop — Admin-Overrides & Custom-Produkte
   Preis, Lagerbestand und Aktiv-Status können im Admin-Bereich
   angepasst werden, ohne die Basis-Produktdaten (products.js) zu
   verändern. Neue Produkte landen in einem eigenen localStorage-
   Layer, gelöschte Produkte werden per Flag ausgeblendet. Alles
   wird beim Rendern über die Basisdaten gelegt — Änderungen wirken
   sich sofort im gesamten Shop aus.
   =========================================================== */
(function (global) {
  "use strict";

  const OVERRIDES_KEY = "novashop_product_overrides_v1";
  const CUSTOM_PRODUCTS_KEY = "novashop_custom_products_v1";

  function safeParse(json, fallback) {
    try {
      const val = JSON.parse(json);
      return val && typeof val === "object" ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function readOverrides() {
    return safeParse(localStorage.getItem(OVERRIDES_KEY), {});
  }
  function writeOverrides(overrides) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    global.dispatchEvent(new CustomEvent("novashop:products-change"));
  }
  function readCustomProducts() {
    return safeParse(localStorage.getItem(CUSTOM_PRODUCTS_KEY), {});
  }
  function writeCustomProducts(products) {
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(products));
    global.dispatchEvent(new CustomEvent("novashop:products-change"));
  }

  function setOverride(productId, patch) {
    const overrides = readOverrides();
    overrides[productId] = Object.assign({}, overrides[productId], patch);
    writeOverrides(overrides);
  }

  function resetOverride(productId) {
    const overrides = readOverrides();
    delete overrides[productId];
    writeOverrides(overrides);
  }

  function addCustomProduct(product) {
    const products = readCustomProducts();
    const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    products[id] = Object.assign({}, product, { id, custom: true });
    writeCustomProducts(products);
    return products[id];
  }

  function deleteProduct(productId) {
    const customProducts = readCustomProducts();
    if (customProducts[productId]) {
      delete customProducts[productId];
      writeCustomProducts(customProducts);
      return;
    }
    setOverride(productId, { deleted: true });
  }

  function getAllBaseProducts() {
    const custom = Object.values(readCustomProducts());
    return PRODUCTS.concat(custom);
  }

  function getEffectiveProducts() {
    const overrides = readOverrides();
    return getAllBaseProducts()
      .map((p) => {
        const o = overrides[p.id];
        return o ? Object.assign({ active: true }, p, o) : Object.assign({ active: true }, p);
      })
      .filter((p) => !p.deleted);
  }

  function getEffectiveProduct(productId) {
    const custom = readCustomProducts();
    const base = custom[productId] || (typeof getProductById === "function" ? getProductById(productId) : null);
    if (!base) return null;
    const overrides = readOverrides();
    const o = overrides[productId];
    const effective = o ? Object.assign({ active: true }, base, o) : Object.assign({ active: true }, base);
    return effective.deleted ? null : effective;
  }

  global.ProductOverrides = {
    setOverride,
    resetOverride,
    addCustomProduct,
    deleteProduct,
    getEffectiveProducts,
    getEffectiveProduct,
  };
})(window);
