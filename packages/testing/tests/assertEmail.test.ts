import { describe, it, expect } from "vitest";
import {
  assertEmailContains,
  assertEmailNotContains,
  assertEmailMatches,
  assertEmailValidHtml,
  assertEmailSizeWithinBudget,
  assertEmailHasSubject,
  assertEmailHasUnsubscribe,
  assertEmailLinksSafe,
  extractEmailLinks,
  createMockTransport,
} from "../src/assertEmail.js";

describe("@mailforge/testing assertEmail", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Test Email</title></head>
<body>
  <h1>Welcome to MailForge!</h1>
  <p>Here is your account confirmation.</p>
  <a href="https://example.com/activate">Activate Account</a>
  <p><a href="https://example.com/unsubscribe">Unsubscribe</a></p>
</body>
</html>`;

  it("passes assertEmailContains for existing content", () => {
    expect(() => assertEmailContains(sampleHtml, "Welcome to MailForge!")).not.toThrow();
  });

  it("throws assertEmailContains for missing content", () => {
    expect(() => assertEmailContains(sampleHtml, "Nonexistent Text")).toThrow();
  });

  it("passes assertEmailNotContains when text is absent", () => {
    expect(() => assertEmailNotContains(sampleHtml, "Dangerous Malware")).not.toThrow();
  });

  it("passes assertEmailMatches with regex", () => {
    expect(() => assertEmailMatches(sampleHtml, /welcome to mailforge/i)).not.toThrow();
  });

  it("validates valid HTML structure", () => {
    expect(() => assertEmailValidHtml(sampleHtml)).not.toThrow();
  });

  it("fails valid HTML check when script tag is present", () => {
    const malicious = sampleHtml + "<script>alert('xss')</script>";
    expect(() => assertEmailValidHtml(malicious)).toThrow(/Forbidden <script>/);
  });

  it("validates email size budget", () => {
    expect(() => assertEmailSizeWithinBudget(sampleHtml, 102400)).not.toThrow();
  });

  it("fails when email size exceeds budget", () => {
    expect(() => assertEmailSizeWithinBudget(sampleHtml, 10)).toThrow(/exceeds maximum budget/);
  });

  it("checks email subject", () => {
    expect(() => assertEmailHasSubject({ subject: "Welcome to MailForge" }, "Welcome")).not.toThrow();
    expect(() => assertEmailHasSubject({ subject: "Welcome to MailForge" }, /^Welcome/)).not.toThrow();
    expect(() => assertEmailHasSubject({ subject: "" })).toThrow();
  });

  it("detects unsubscribe link", () => {
    expect(() => assertEmailHasUnsubscribe(sampleHtml)).not.toThrow();
    expect(() => assertEmailHasUnsubscribe("<html><body>No links here</body></html>")).toThrow();
  });

  it("extracts email links accurately", () => {
    const links = extractEmailLinks(sampleHtml);
    expect(links).toEqual([
      "https://example.com/activate",
      "https://example.com/unsubscribe",
    ]);
  });

  it("validates link safety and rejects javascript: links", () => {
    expect(() => assertEmailLinksSafe(sampleHtml)).not.toThrow();

    const unsafeHtml = '<a href="javascript:alert(1)">Click me</a>';
    expect(() => assertEmailLinksSafe(unsafeHtml)).toThrow(/Unsafe URL scheme/);
  });

  it("records sent emails with createMockTransport", async () => {
    const transport = createMockTransport();
    expect(transport.getSentEmails()).toHaveLength(0);

    const result = await transport.sendMail({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(result.messageId).toBeDefined();
    expect(result.accepted).toContain("user@example.com");
    expect(transport.getSentEmails()).toHaveLength(1);
    expect(transport.getLatestEmail()?.subject).toBe("Test Subject");

    transport.clear();
    expect(transport.getSentEmails()).toHaveLength(0);
  });
});

