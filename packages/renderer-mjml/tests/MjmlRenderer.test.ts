import { describe, expect, it } from "vitest";
import { MjmlRenderer } from "../src/index.js";
import type { EmailDocument } from "@mailforge/core";

function sample(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome to MailForge",
        preheader: "Your account is ready",
        locale: "en-IN",
        header: {
            id: "header",
            type: "header",
            children: [{ id: "brand", type: "heading", props: { text: "MailForge" } }],
        },
        body: [
            { id: "greeting", type: "text", props: { text: "Hello John!" } },
            { id: "action", type: "button", props: { text: "Get Started", href: "https://example.com/login" } },
        ],
        footer: {
            id: "footer",
            type: "footer",
            children: [{ id: "support", type: "text", props: { text: "support@example.com" } }],
        },
        copyright: {
            id: "copyright",
            type: "copyright",
            props: { text: "© 2026 MailForge" },
        },
    };
}

const renderer = new MjmlRenderer();

describe("MjmlRenderer", () => {
    it("renders an HTML email", async () => {
        const result = await renderer.render(sample());
        expect(result.html).toContain("<html");
        expect(result.html).toContain("Hello John!");
        expect(result.html).toContain("Get Started");
    });
    it("returns subject and preheader", async () => {
        const result = await renderer.render(sample());
        expect(result.subject).toBe("Welcome to MailForge");
        expect(result.preheader).toBe("Your account is ready");
    });
    it("returns a plain-text alternative", async () => {
        const result = await renderer.render(sample());
        expect(result.text).toContain("Hello John!");
        expect(result.text).toContain("Get Started");
    });
    it("preserves header, footer and copyright content", async () => {
        const result = await renderer.render(sample());
        expect(result.html).toContain("MailForge");
        expect(result.html).toContain("support@example.com");
        expect(result.text).toContain("2026 MailForge");
    });
    it("escapes dangerous text content", async () => {
        const doc = sample();
        doc.body[0]!.props = { text: "<script>alert(1)</script>" };
        const result = await renderer.render(doc);
        expect(result.html).not.toContain("<script>alert(1)</script>");
        expect(result.html).toContain("&lt;script&gt;");
    });
    it("rejects JavaScript button links", async () => {
        const doc = sample();
        doc.body[1]!.props = { text: "Click", href: "javascript:alert(1)" };
        await expect(renderer.render(doc)).rejects.toThrow();
    });
    it("rejects custom CSS in safe mode", async () => {
        const doc = sample();
        doc.head = { customCss: ".banner { color: red; }" };
        await expect(renderer.render(doc)).rejects.toThrow("Custom CSS requires trusted");
    });
    it("compiles trusted CSS", async () => {
        const doc = sample();
        doc.head = { customCss: ".banner { color: red; }" };
        const result = await renderer.render(doc, { trust: "trusted" });
        expect(result.html).toContain("<html");
    });
    it("rejects markup embedded into trusted CSS", async () => {
        const doc = sample();
        doc.head = { customCss: "</mj-style><mj-raw>bad</mj-raw>" };
        await expect(renderer.render(doc, { trust: "trusted" })).rejects.toThrow("contains markup");
    });
    it("rejects unknown component types", async () => {
        const doc = sample();
        doc.body.push({ id: "mystery", type: "unregistered" });
        await expect(renderer.render(doc)).rejects.toThrow("Unknown component");
    });
    it("preserves declared data-* attributes in generated source", async () => {
        const doc = sample();
        doc.body[0]!.attrs = { "data-campaign": "welcome" };
        const result = await renderer.render(doc);
        expect(result.html).toContain("data-campaign");
    });
    it("rejects unsupported HTML attribute names", async () => {
        const doc = sample();
        doc.body[0]!.attrs = { "contenteditable": "true" };
        await expect(renderer.render(doc)).rejects.toThrow("Unsupported HTML attribute");
    });
    it("rejects event handler attributes", async () => {
        const doc = sample();
        doc.body[0]!.attrs = { onclick: "alert(1)" };
        await expect(renderer.render(doc)).rejects.toThrow("Unsafe attribute");
    });
    it("sanitizes raw HTML in safe mode", async () => {
        const doc = sample();
        doc.body.push({ id: "raw", type: "raw-html", props: { html: "<p>Extra</p><script>alert(1)</script>" } });
        const result = await renderer.render(doc);
        expect(result.html).toContain("Extra");
        expect(result.html).not.toContain("<script>alert(1)</script>");
    });
    it("handles section and column layouts", async () => {
        const doc = sample();
        doc.body.push({
            id: "grid", type: "section", children: [
                { id: "left", type: "column", children: [{ id: "left-text", type: "text", props: { text: "Left" } }] },
                { id: "right", type: "column", children: [{ id: "right-text", type: "text", props: { text: "Right" } }] },
            ],
        });
        const result = await renderer.render(doc);
        expect(result.html).toContain("Left");
        expect(result.html).toContain("Right");
    });
    it("rejects an invalid mixture of columns and leaf nodes", async () => {
        const doc = sample();
        doc.body.push({ id: "bad-grid", type: "section", children: [
            { id: "col", type: "column" },
            { id: "text", type: "text", props: { text: "Hi" } },
        ] });
        await expect(renderer.render(doc)).rejects.toThrow("cannot mix columns");
    });
    it("rejects CID and data URLs as button destinations", async () => {
        const doc = sample();
        doc.body[1]!.props = { text: "Bad Link", href: "cid:example" };
        await expect(renderer.render(doc)).rejects.toThrow();
    });
    it("rejects inline data images in safe mode", async () => {
        const doc = sample();
        doc.body.push({ id: "image", type: "image", props: {
            src: "data:image/png;base64,aGVsbG8=", alt: "Inline test image",
        } });
        await expect(renderer.render(doc)).rejects.toThrow("trusted rendering mode");
    });
    it("rejects subjects containing line breaks", async () => {
        const doc = sample();
        doc.subject = "Hello\r\nBcc: hidden@example.com";
        await expect(renderer.render(doc)).rejects.toThrow("line breaks");
    });
    it("reports MJML's unavoidable CSS behavior", async () => {
        const result = await renderer.render(sample(), { inlineCss: false });
        expect(result.warnings.some(w => w.code === "MJML_CSS_INLINING")).toBe(true);
    });
});
