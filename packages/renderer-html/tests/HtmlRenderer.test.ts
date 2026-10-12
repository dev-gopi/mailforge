
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    HtmlRenderer,
} from "../src/index.js";

describe("HtmlRenderer", () => {
    const renderer = new HtmlRenderer();

    it("renders a basic HTML email", async () => {
        const result = await renderer.render({
            subject: "Welcome",
            html: "<h1>Hello John</h1>",
        });

        expect(result.html).toContain("Hello John");
        expect(result.subject).toBe("Welcome");
    });

    it("generates plain text", async () => {
        const result = await renderer.render({
            subject: "Welcome",
            html: "<p>Hello <b>John</b></p>",
        });

        expect(result.text).toContain("Hello John");
    });

    it("removes scripts in safe mode", async () => {
        const result = await renderer.render({
            subject: "Test",
            html: "<p>Hello</p><script>alert(1)</script>",
        });

        expect(result.html).not.toContain("<script");
        expect(result.html).toContain("Hello");
    });

    it("rejects custom CSS in safe mode", async () => {
        await expect(
            renderer.render({
                subject: "Test",
                html: "<p>Hello</p>",
                css: "p { color: red; }",
            }),
        ).rejects.toThrow(
            "Custom CSS requires trusted",
        );
    });

    it("allows trusted HTML and CSS", async () => {
        const result = await renderer.render(
            {
                subject: "Custom",
                html: `<!doctype html>
<html>
  <head>
    <title>Welcome</title>
  </head>
  <body>
    <p class="message">Hello!</p>
  </body>
</html>`,
                css: ".message { color: red; }",
            },
            {
                trust: "trusted",
                inlineCss: true,
            },
        );

        expect(result.html).toContain("Hello!");
        expect(result.html).toMatch(/color:\s*red/i);
    });

    it("rejects an empty subject", async () => {
        await expect(
            renderer.render({
                subject: "",
                html: "<p>Hello</p>",
            }),
        ).rejects.toThrow(
            "Email subject is required",
        );
    });

    it("preserves safe custom data attributes", async () => {
        const result = await renderer.render({
            subject: "Tracking",
            html: '<p data-campaign="welcome">Hello</p>',
        });

        expect(result.html).toContain(
            'data-campaign="welcome"',
        );
    });

    it("removes event handlers in safe mode", async () => {
        const result = await renderer.render({
            subject: "Security",
            html: '<p onclick="alert(1)">Hello</p>',
        });

        expect(result.html).not.toContain("onclick");
    });

    it("removes javascript URLs", async () => {
        const result = await renderer.render({
            subject: "Security",
            html: '<a href="javascript:alert(1)">Click</a>',
        });

        expect(result.html).not.toContain(
            "javascript:alert",
        );
    });

    it("rejects oversized HTML", async () => {
        await expect(
            renderer.render({
                subject: "Large",
                html: "a".repeat(512_001),
            }),
        ).rejects.toThrow("HTML document is too large");
    });

    it("rejects CSS in safe mode even when inlining is disabled", async () => {
        await expect(
            renderer.render(
                {
                    subject: "Test",
                    html: "<p>Hello</p>",
                    css: "p { color: red; }",
                },
                {
                    trust: "safe",
                    inlineCss: false,
                },
            ),
        ).rejects.toThrow(
            "Custom CSS requires trusted",
        );
    });

    it("preserves preheader metadata", async () => {
        const result = await renderer.render({
            subject: "Welcome",
            html: "<p>Hello</p>",
            preheader: "Your account is ready",
        });

        expect(result.preheader).toBe(
            "Your account is ready",
        );
    });
});
