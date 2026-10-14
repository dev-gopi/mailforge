import { describe, it, expect } from "vitest";
import {
  createPreviewUrl,
  inspectEmailQuality,
  renderPreviewFrame,
} from "../src/index.js";

describe("@mailforge/preview", () => {
  it("generates correct preview URL with parameters", () => {
    const url = createPreviewUrl("welcome", {
      theme: "dark",
      device: "mobile",
    });
    expect(url).toBe("/preview/welcome?theme=dark&device=mobile");
  });

  it("inspects email quality and detects metrics", () => {
    const sampleHtml = `<!DOCTYPE html>
<html>
<body>
  <h1>Hello World</h1>
  <img src="https://example.com/logo.png" alt="Logo">
  <img src="https://example.com/banner.png">
  <a href="https://example.com/click">Safe Link</a>
  <a href="javascript:alert(1)">Unsafe Link</a>
  <p>To unsubscribe, click here</p>
</body>
</html>`;

    const report = inspectEmailQuality(sampleHtml);
    expect(report.sizeBytes).toBeGreaterThan(0);
    expect(report.exceedsGmailLimit).toBe(false);
    expect(report.imagesTotal).toBe(2);
    expect(report.imagesMissingAlt).toBe(1);
    expect(report.linkCount).toBe(2);
    expect(report.unsafeLinks).toEqual(["javascript:alert(1)"]);
    expect(report.hasUnsubscribe).toBe(true);
    expect(report.score).toBeLessThan(100);
  });

  it("renders preview frame HTML with viewport and diagnostics", () => {
    const frame = renderPreviewFrame({
      title: "Welcome Email",
      subject: "Welcome to MailForge",
      html: "<p>Hello user</p>",
      text: "Hello user",
    });

    expect(frame).toContain("<!doctype html>");
    expect(frame).toContain("Welcome to MailForge");
    expect(frame).toContain("iframe");
    expect(frame).toContain("Diagnostics");
    expect(frame).toContain("emailFrameWrapper");
  });
});

