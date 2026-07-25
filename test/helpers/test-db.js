const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

/* Muss VOR jedem require("../../server/db") (direkt oder über server/lib/store,
   server/index.js, ...) aufgerufen werden — server/db.js liest DATABASE_PATH beim ersten
   require synchron aus und legt die SQLite-Datei an. Jede Testdatei bekommt so ihre eigene,
   leere DB statt die echte Shop-Datenbank anzufassen (node:test führt jede Testdatei in einem
   eigenen Prozess aus, ein einmaliges Setzen pro Datei genügt). */
function useIsolatedTestDb() {
  const dbPath = path.join(os.tmpdir(), `novashop-test-${process.pid}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DATABASE_PATH = dbPath;
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret-not-for-production";
  return dbPath;
}

/* better-sqlite3 hält unter Windows ein natives Datei-Handle offen, solange die Verbindung nicht
   explizit geschlossen ist — fs.rmSync schlägt sonst mit EBUSY/EPERM fehl (und wurde bisher still
   verschluckt, wodurch Temp-DBs sich unbemerkt angesammelt haben). Deshalb hier zuerst db.close(). */
function cleanupTestDb(dbPath) {
  try {
    require("../../server/db").close();
  } catch (e) {
    /* DB war evtl. schon zu oder nie geöffnet — ok. */
  }
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      fs.rmSync(dbPath + suffix);
    } catch (e) {
      /* Datei existierte nicht (z. B. kein WAL geschrieben) — ok. */
    }
  }
}

module.exports = { useIsolatedTestDb, cleanupTestDb };
