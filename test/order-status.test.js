const test = require("node:test");
const assert = require("node:assert/strict");
const { ORDER_STATUS, statusCode } = require("../server/lib/order-status");

test("statusCode maps every known German status text to a stable code", () => {
  assert.equal(statusCode(ORDER_STATUS.PENDING), "pending");
  assert.equal(statusCode(ORDER_STATUS.FAILED), "failed");
  assert.equal(statusCode(ORDER_STATUS.PROCESSING), "processing");
  assert.equal(statusCode(ORDER_STATUS.SHIPPED), "shipped");
  assert.equal(statusCode(ORDER_STATUS.COMPLETED), "completed");
  assert.equal(statusCode(ORDER_STATUS.CANCELLED), "cancelled");
});

test("statusCode falls back to 'unknown' instead of throwing on unmapped input", () => {
  assert.equal(statusCode("irgendein Text"), "unknown");
  assert.equal(statusCode(undefined), "unknown");
  assert.equal(statusCode(""), "unknown");
});
