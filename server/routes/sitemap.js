const express = require("express");
const { Products } = require("../lib/store");

const router = express.Router();

const STATIC_PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/shop.html", priority: "0.9" },
  { path: "/faq.html", priority: "0.5" },
  { path: "/bestellung.html", priority: "0.3" },
  { path: "/impressum.html", priority: "0.2" },
  { path: "/datenschutz.html", priority: "0.2" },
  { path: "/agb.html", priority: "0.2" },
  { path: "/widerruf.html", priority: "0.2" },
];

router.get("/", (req, res) => {
  const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const products = Products.listActive();
  const urls = [
    ...STATIC_PAGES.map((p) => `<url><loc>${baseUrl}${p.path}</loc><priority>${p.priority}</priority></url>`),
    ...products.map((p) => `<url><loc>${baseUrl}/product.html?id=${encodeURIComponent(p.id)}</loc><priority>0.7</priority></url>`),
  ].join("");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

module.exports = router;
