/* Zentrale Produktdaten – wird von index.html (Vorschau), shop.html (voller Katalog),
   product.html und admin.html genutzt. Lädt den Katalog vom Backend statt aus einer
   hartcodierten Liste; Admin-Änderungen (Preis/Bestand/aktiv/neu/gelöscht) landen jetzt
   in der echten products-Tabelle statt in einem localStorage-Patch-Layer. */
const CATEGORIES = [
  { id: "beliebt", label: "Beliebt", icon: "icon-flame" },
  { id: "elektronik", label: "Elektronik", icon: "icon-camera" },
  { id: "gaming", label: "Gaming", icon: "icon-gamepad" },
  { id: "zubehoer", label: "Zubehör", icon: "icon-package" },
  { id: "kleidung", label: "Kleidung", icon: "icon-shirt" },
  { id: "home", label: "Home & Living", icon: "icon-home" },
  { id: "beauty", label: "Beauty", icon: "icon-sparkles" },
  { id: "sport", label: "Sport", icon: "icon-dumbbell" },
  { id: "spielzeug", label: "Spielzeug", icon: "icon-toy" },
  { id: "buero", label: "Büro & Schule", icon: "icon-book" },
];

const Products = (function () {
  let cache = [];
  let byId = new Map();
  let loaded = false;

  function setCache(list) {
    cache = Array.isArray(list) ? list : [];
    byId = new Map(cache.map((p) => [p.id, p]));
  }

  async function load() {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Produkte konnten nicht geladen werden.");
    setCache(await res.json());
    loaded = true;
  }

  const ready = load().catch((err) => {
    console.error(err);
  });

  async function refresh() {
    await load();
    window.dispatchEvent(new CustomEvent("novashop:products-change"));
  }

  return {
    ready,
    refresh,
    getAll: () => cache,
    getById: (id) => byId.get(id) || null,
    /* Wichtig für Cart.getItemsDetailed(): Solange der Katalog noch nicht geladen ist, bedeutet
       "Produkt nicht gefunden" nur "noch nicht da", nicht "existiert nicht mehr". */
    isReady: () => loaded,
  };
})();

function getProductById(id) {
  return Products.getById(id);
}

/* Schützt vor Stored-XSS, wenn Produktdaten per innerHTML gerendert werden. */
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* Berechnet Rabatt-Badges live aus Preis/altem Preis, statt eine feste Text-Angabe zu übernehmen,
   die nach einer Preisänderung im Admin-Panel nicht mehr stimmen würde. Badges wie "Bestseller"
   oder "Neu" (kein Prozent-Muster) bleiben davon unberührt. */
function discountBadgeFor(product) {
  const isPercentBadge = typeof product.badge === "string" && /^-?\d+%$/.test(product.badge);
  if (product.oldPrice && product.oldPrice > product.price && (isPercentBadge || !product.badge)) {
    const pct = Math.round((1 - product.price / product.oldPrice) * 100);
    return "-" + pct + "%";
  }
  return product.badge || null;
}
