const path = require("path");
const fs = require("fs");
const { Products } = require("../lib/store");

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "product.html");

function escapeAttr(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Serviert product.html mit serverseitig eingesetzten Open-Graph-/Meta-Tags pro Produkt-ID,
   damit Link-Vorschauen (Social Media, Messenger) und Suchmaschinen-Snippets pro Produkt
   stimmen — der Rest der Seite bleibt unverändert clientseitig gerendert (js/product-page.js). */
module.exports = function productPageRoute(req, res) {
  const id = req.query.id ? String(req.query.id) : null;
  const product = id ? Products.findById(id) : null;
  const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  const title = product ? `${product.name} — NovaShop` : "Produkt — NovaShop";
  const description = product
    ? `${product.subtitle} — jetzt bei NovaShop für ${product.price.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € bestellen.`
    : "Entdecke unser Produktsortiment bei NovaShop.";
  const url = `${baseUrl}/product.html${id ? "?id=" + encodeURIComponent(id) : ""}`;
  const image = `${baseUrl}/img/hero-shop.jpg`;

  let html = fs.readFileSync(TEMPLATE_PATH, "utf8");
  html = html
    .replace(/<!--OG_TITLE-->/g, escapeAttr(title))
    .replace(/<!--OG_DESCRIPTION-->/g, escapeAttr(description))
    .replace(/<!--OG_URL-->/g, escapeAttr(url))
    .replace(/<!--OG_IMAGE-->/g, escapeAttr(image));

  res.type("html").send(html);
};
