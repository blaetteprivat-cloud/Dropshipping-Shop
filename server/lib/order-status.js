/* Single source of truth für Bestellstatus-Texte. Die deutschen Strings sind das,
   was in der DB steht und im Admin-Panel angezeigt wird (siehe README) - daran ändert
   dieses Modul nichts. Es liefert zusätzlich einen stabilen, sprachunabhängigen Code
   pro Status, damit Frontend-Logik (z. B. order-success.html) nicht auf den exakten
   deutschen Wortlaut angewiesen ist, um zwischen den Zuständen zu unterscheiden. */

const ORDER_STATUS = {
  PENDING: "Zahlung ausstehend",
  FAILED: "Zahlung fehlgeschlagen",
  PROCESSING: "In Bearbeitung",
  SHIPPED: "Versendet",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

const STATUS_CODES = {
  [ORDER_STATUS.PENDING]: "pending",
  [ORDER_STATUS.FAILED]: "failed",
  [ORDER_STATUS.PROCESSING]: "processing",
  [ORDER_STATUS.SHIPPED]: "shipped",
  [ORDER_STATUS.COMPLETED]: "completed",
  [ORDER_STATUS.CANCELLED]: "cancelled",
};

function statusCode(status) {
  return STATUS_CODES[status] || "unknown";
}

module.exports = { ORDER_STATUS, statusCode };
