const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  res.type("text/plain").send(
    `User-agent: *\nDisallow: /admin.html\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

module.exports = router;
