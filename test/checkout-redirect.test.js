const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRedirectUrls, CAPACITOR_RETURN_URL } = require("../server/lib/checkout-redirect");

test("web platform gets https success/cancel URLs on the real domain", () => {
  const { successUrl, cancelUrl } = buildRedirectUrls("https://shop.example.com", false);
  assert.equal(successUrl, "https://shop.example.com/order-success.html?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(cancelUrl, "https://shop.example.com/shop.html");
});

test("capacitor platform gets the custom URL scheme instead of an https URL", () => {
  const { successUrl, cancelUrl } = buildRedirectUrls("https://shop.example.com", true);
  assert.ok(successUrl.startsWith(CAPACITOR_RETURN_URL), "success URL must use the app's custom scheme");
  assert.ok(cancelUrl.startsWith(CAPACITOR_RETURN_URL), "cancel URL must use the app's custom scheme");
  assert.match(successUrl, /status=success/);
  assert.match(successUrl, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(cancelUrl, /status=cancel/);
  assert.ok(!successUrl.includes("shop.example.com"), "app redirect must not leak the https domain into the deep link");
});
