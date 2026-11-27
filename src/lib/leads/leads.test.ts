import { test } from "node:test";
import assert from "node:assert/strict";

// classifyContact / cleanUtm are pure; import through a tiny shim to avoid the server-only marker.
test("contact classification and UTM cleaning", async () => {
  const mod = await import("./pure");
  assert.deepEqual(mod.classifyContact("Me@Example.com"), { type: "email", value: "me@example.com" });
  assert.deepEqual(mod.classifyContact("@doren_en"), { type: "telegram", value: "@doren_en" });
  assert.deepEqual(mod.classifyContact("https://t.me/someone1"), { type: "telegram", value: "@someone1" });
  assert.equal(mod.classifyContact("hi"), null);
  assert.equal(mod.classifyContact("not an address"), null);
  assert.equal(mod.classifyContact("<script>@x.y"), null);
  assert.deepEqual(mod.cleanUtm({ utm_source: "telegram", utm_campaign: "pilot-1", evil: "x", utm_medium: "<b>" }), { utm_source: "telegram", utm_campaign: "pilot-1" });
});
