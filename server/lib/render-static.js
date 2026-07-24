const path = require("path");
const fs = require("fs");

/* Ersetzt den %%BASE_URL%%-Platzhalter in statischen Seiten (Open-Graph-/Canonical-URLs), da die
   öffentliche Basis-URL erst zur Laufzeit aus der .env bekannt ist, nicht beim Schreiben der Datei. */
function renderStaticPage(rootDir) {
  return function (req, res, next) {
    const urlPath = req.path === "/" ? "/index.html" : req.path;
    const filePath = path.join(rootDir, decodeURIComponent(urlPath));
    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
    const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    fs.readFile(filePath, "utf8", (err, html) => {
      if (err) return next(err);
      res.type("html").send(html.replace(/%%BASE_URL%%/g, baseUrl));
    });
  };
}

module.exports = { renderStaticPage };
