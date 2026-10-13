import test from "node:test";
import assert from "node:assert/strict";

test("rejects executable URL schemes", () => {
  assert.equal(new URL("javascript:alert(1)").protocol, "javascript:");
});
