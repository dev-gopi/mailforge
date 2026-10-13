import test from "node:test";
import assert from "node:assert/strict";

test("string utility smoke test", () => {
  assert.equal("mailforge".toUpperCase(), "MAILFORGE");
});
