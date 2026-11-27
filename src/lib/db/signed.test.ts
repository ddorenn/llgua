import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// Mirrors signPayload() without the server-only import; the database recomputes the same HMAC.
test("HMAC signature matches pgcrypto hmac(sha256) hex format", () => {
  const secret = "a".repeat(64);
  const payload = JSON.stringify({ op: "placement.save", uid: "u", exp: 1, d: { x: "привет" } });
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  assert.match(sig, /^[0-9a-f]{64}$/);
  assert.notEqual(sig, createHmac("sha256", secret).update(payload + " ", "utf8").digest("hex"));
});
