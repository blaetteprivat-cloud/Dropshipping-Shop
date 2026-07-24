/* Zentrale Produktdaten – wird von index.html (Vorschau), shop.html (voller Katalog) und admin.html genutzt. */
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

const PRODUCTS = [
  { id: "p1", name: "Wireless Earbuds Pro", subtitle: "High-End Klangqualität", price: 129.99, oldPrice: 159.99, categories: ["beliebt", "elektronik"], icon: "icon-earbuds", tint: "blue", badge: "Bestseller", rating: 4.8, reviews: 312, stock: 42 },
  { id: "p2", name: "Gaming Maus RGB", subtitle: "Präzision neu definiert", price: 59.99, oldPrice: null, categories: ["beliebt", "gaming"], icon: "icon-mouse", tint: "violet", badge: null, rating: 4.6, reviews: 198, stock: 65 },
  { id: "p3", name: "Smartwatch X1", subtitle: "Dein smarter Begleiter", price: 199.99, oldPrice: 249.99, categories: ["beliebt", "elektronik"], icon: "icon-watch", tint: "cyan", badge: "-20%", rating: 4.7, reviews: 421, stock: 18 },
  { id: "p4", name: "Mechanical Keyboard", subtitle: "Für echte Gamer", price: 89.99, oldPrice: null, categories: ["beliebt", "gaming"], icon: "icon-keyboard", tint: "pink", badge: "Neu", rating: 4.9, reviews: 156, stock: 27 },
  { id: "p5", name: "Premium Kopfhörer ANC", subtitle: "Aktive Geräuschunterdrückung", price: 179.99, oldPrice: 219.99, categories: ["elektronik", "beliebt"], icon: "icon-headset", tint: "blue", badge: "-18%", rating: 4.8, reviews: 267, stock: 9 },
  { id: "p6", name: "Bluetooth Lautsprecher", subtitle: "360° Sound Erlebnis", price: 69.99, oldPrice: null, categories: ["elektronik"], icon: "icon-speaker", tint: "violet", badge: null, rating: 4.5, reviews: 143, stock: 34 },
  { id: "p7", name: "USB-C Ladekabel Set", subtitle: "3er Pack, schnellladefähig", price: 19.99, oldPrice: 24.99, categories: ["zubehoer"], icon: "icon-package", tint: "cyan", badge: null, rating: 4.4, reviews: 88, stock: 120 },
  { id: "p8", name: "Handyhülle Premium", subtitle: "Stoßfest & elegant", price: 24.99, oldPrice: null, categories: ["zubehoer"], icon: "icon-phone", tint: "pink", badge: null, rating: 4.3, reviews: 67, stock: 88 },
  { id: "p9", name: "Gaming Headset Surround", subtitle: "7.1 Raumklang", price: 99.99, oldPrice: 129.99, categories: ["gaming"], icon: "icon-headset", tint: "violet", badge: "-23%", rating: 4.7, reviews: 210, stock: 21 },
  { id: "p10", name: "Controller Pro", subtitle: "Kompatibel mit PC & Konsole", price: 54.99, oldPrice: null, categories: ["gaming"], icon: "icon-gamepad", tint: "blue", badge: null, rating: 4.6, reviews: 132, stock: 40 },
  { id: "p11", name: "Oversized Hoodie", subtitle: "Kuschelweiches Fleece", price: 44.99, oldPrice: null, categories: ["kleidung"], icon: "icon-shirt", tint: "cyan", badge: null, rating: 4.5, reviews: 74, stock: 55 },
  { id: "p12", name: "Sonnenbrille UV400", subtitle: "Zeitloses Design", price: 29.99, oldPrice: 39.99, categories: ["kleidung"], icon: "icon-sparkles", tint: "pink", badge: null, rating: 4.2, reviews: 51, stock: 6 },
  { id: "p13", name: "LED Ambientelampe", subtitle: "16 Mio. Farben, App-Steuerung", price: 34.99, oldPrice: null, categories: ["home"], icon: "icon-home", tint: "violet", badge: "Neu", rating: 4.6, reviews: 96, stock: 30 },
  { id: "p14", name: "Duftkerzen Set", subtitle: "3er Set, natürliches Wachs", price: 22.99, oldPrice: null, categories: ["home"], icon: "icon-sparkles", tint: "blue", badge: null, rating: 4.4, reviews: 39, stock: 47 },
  { id: "p15", name: "Gesichtspflege-Set", subtitle: "Vegan & dermatologisch getestet", price: 39.99, oldPrice: 49.99, categories: ["beauty"], icon: "icon-sparkles", tint: "pink", badge: "-20%", rating: 4.7, reviews: 184, stock: 24 },
  { id: "p16", name: "Haarstyling Tool", subtitle: "Keramikbeschichtung", price: 49.99, oldPrice: null, categories: ["beauty"], icon: "icon-sparkles", tint: "cyan", badge: null, rating: 4.3, reviews: 58, stock: 15 },
  { id: "p17", name: "Yoga Matte Premium", subtitle: "Rutschfest, 6mm", price: 32.99, oldPrice: null, categories: ["sport"], icon: "icon-dumbbell", tint: "violet", badge: null, rating: 4.6, reviews: 112, stock: 38 },
  { id: "p18", name: "Widerstandsbänder Set", subtitle: "5 Stärken inklusive", price: 18.99, oldPrice: 24.99, categories: ["sport"], icon: "icon-dumbbell", tint: "blue", badge: null, rating: 4.5, reviews: 77, stock: 60 },
  { id: "p19", name: "RC Mini Drohne", subtitle: "Mit HD Kamera", price: 79.99, oldPrice: 99.99, categories: ["spielzeug"], icon: "icon-toy", tint: "cyan", badge: "-20%", rating: 4.4, reviews: 63, stock: 3 },
  { id: "p20", name: "Puzzle 1000 Teile", subtitle: "Weltkarte Edition", price: 16.99, oldPrice: null, categories: ["spielzeug"], icon: "icon-toy", tint: "pink", badge: null, rating: 4.6, reviews: 45, stock: 72 },
  { id: "p21", name: "Notizbuch Set", subtitle: "A5, 3er Pack liniert", price: 14.99, oldPrice: null, categories: ["buero"], icon: "icon-book", tint: "violet", badge: null, rating: 4.5, reviews: 41, stock: 95 },
  { id: "p22", name: "Ergonomischer Schreibtischorganizer", subtitle: "Bambus, nachhaltig", price: 27.99, oldPrice: null, categories: ["buero"], icon: "icon-book", tint: "blue", badge: null, rating: 4.3, reviews: 29, stock: 19 },
];

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

/* Schützt vor Stored-XSS, wenn Produktdaten (z.B. aus dem Admin-Formular) per innerHTML gerendert werden. */
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
