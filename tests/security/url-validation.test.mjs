import test from "node:test";
import assert from "node:assert/strict";
import { isSafeUrl, sanitizeUrl } from "../../packages/core/dist/index.js";

test("isSafeUrl allows valid HTTP, HTTPS, mailto, and tel schemes", () => {
  assert.equal(isSafeUrl("https://example.com"), true);
  assert.equal(isSafeUrl("http://example.com/login"), true);
  assert.equal(isSafeUrl("mailto:support@mailforge.dev"), true);
  assert.equal(isSafeUrl("tel:+1234567890"), true);
  assert.equal(isSafeUrl("#anchor"), true);
  assert.equal(isSafeUrl("/terms"), true);
});

test("isSafeUrl rejects executable and unsafe URL schemes", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("JAVASCRIPT:alert(document.cookie)"), false);
  assert.equal(isSafeUrl("vbscript:msgbox(1)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeUrl("file:///etc/passwd"), false);
  assert.equal(isSafeUrl("blob:https://example.com/blob-id"), false);
});

test("isSafeUrl rejects obfuscated attacks", () => {
  assert.equal(isSafeUrl("java\nscript:alert(1)"), false);
  assert.equal(isSafeUrl("java\tscript:alert(1)"), false);
  assert.equal(isSafeUrl("javascript\0:alert(1)"), false);
  assert.equal(isSafeUrl("//evil.com/phish"), false);
});

test("sanitizeUrl falls back to safe target", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)", "#safe"), "#safe");
  assert.equal(sanitizeUrl("https://valid.com", "#safe"), "https://valid.com");
});
