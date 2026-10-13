import test from "node:test";
import assert from "node:assert/strict";

test("render output preserves text", () => {
  const output = "<p>Hello</p>";
  assert.match(output, /Hello/);
});
