const express = require("express");
const { Products } = require("../lib/store");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(Products.listActive());
});

router.get("/:id", (req, res) => {
  const product = Products.findById(req.params.id);
  if (!product || !product.active) return res.status(404).json({ error: "Produkt nicht gefunden." });
  res.json(product);
});

module.exports = router;
