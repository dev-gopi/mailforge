import { describe, it, expect } from "vitest";
import { isSafeUrl, sanitizeUrl } from "../src/security/isSafeUrl.js";

describe("isSafeUrl", () => {
  it("allows standard http and https URLs", () => {
    expect(isSafeUrl("https://example.com/click")).toBe(true);
    expect(isSafeUrl("http://example.com/newsletter")).toBe(true);
    expect(isSafeUrl("https://sub.domain.co.uk/path?query=1&foo=bar#section")).toBe(true);
  });

  it("allows mailto and tel links for email contacts", () => {
    expect(isSafeUrl("mailto:support@example.com")).toBe(true);
    expect(isSafeUrl("tel:+1234567890")).toBe(true);
  });

  it("allows relative links and hash anchors by default", () => {
    expect(isSafeUrl("#top")).toBe(true);
    expect(isSafeUrl("/privacy")).toBe(true);
  });

  it("rejects dangerous executable schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("JAVASCRIPT:alert(document.cookie)")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("blob:https://example.com/uuid")).toBe(false);
  });

  it("rejects obfuscated schemes with whitespace or null bytes", () => {
    expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
    expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
    expect(isSafeUrl("javascript\0:alert(1)")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeUrl("//evil.com/phishing")).toBe(false);
  });

  it("sanitizes unsafe URLs to fallback", () => {
    expect(sanitizeUrl("javascript:alert(1)", "#safe")).toBe("#safe");
    expect(sanitizeUrl("https://example.com", "#safe")).toBe("https://example.com");
  });
});

