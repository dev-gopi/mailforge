import { describe, expect, it } from "vitest";
import type { EmailDocument, EmailNode } from "@mailforge/core";
import { createEmail, applyEmailTheme, resolveEmailTheme } from "../src/index.js";

const sample = (): EmailDocument => ({
    schemaVersion: "1.0", id: "redesign", version: "1.0.0", subject: "Redesign",
    body: [
        { id: "hero", type: "heading", props: { text: "Welcome" }, attrs: { "data-mf-style": "hero-title" } },
        { id: "content", type: "text", props: { text: "Useful content" }, attrs: { "data-mf-style": "body" } },
        { id: "cta", type: "button", props: { text: "Continue", href: "https://example.com" }, attrs: { "data-mf-style": "primary-action" } },
        { id: "hint", type: "text", props: { text: "Read more" }, attrs: { "data-mf-style": "muted" } },
    ],
});
const find = (document: EmailDocument, id: string): EmailNode => {
    const node = document.body.find(item => item.id === id);
    if (!node) throw new Error(`Missing ${id}`);
    return node;
};

describe("8.5.15: professional visual system", () => {
    it("uses button padding from the selected theme, not hardcoded values", () => {
        const theme = resolveEmailTheme({ appearance: { buttonPaddingX: 37, buttonPaddingY: 17 } });
        const result = applyEmailTheme(sample(), theme);
        expect(find(result, "cta").styles?.innerPadding).toBe("17px 37px");
    });
    it("uses the theme heading font and size in the hero", () => {
        const theme = resolveEmailTheme({ typography: { headingSize: 30, headingFontFamily: "Georgia, serif" } });
        const result = applyEmailTheme(sample(), theme);
        expect(find(result, "hero").styles?.fontSize).toBe(30);
        expect(find(result, "hero").styles?.fontFamily).toBe("Georgia, serif");
    });
    it("keeps developer styles above theme and semantic defaults", () => {
        const input = sample();
        input.body[0]!.styles = { fontSize: 21, textAlign: "left" };
        const result = applyEmailTheme(input, resolveEmailTheme("premium"));
        expect(find(result, "hero").styles?.fontSize).toBe(21);
        expect(find(result, "hero").styles?.textAlign).toBe("left");
    });
    it("does not modify the source document or its nested objects", () => {
        const input = sample();
        const original = structuredClone(input);
        applyEmailTheme(input, resolveEmailTheme("forest"));
        expect(input).toEqual(original);
    });
    it("uses distinct theme palettes without affecting the content", () => {
        const premium = applyEmailTheme(sample(), resolveEmailTheme("premium"));
        const ocean = applyEmailTheme(sample(), resolveEmailTheme("ocean"));
        expect(find(premium, "cta").styles?.backgroundColor).not.toBe(find(ocean, "cta").styles?.backgroundColor);
        expect(find(ocean, "content").props?.text).toBe("Useful content");
    });
    it("uses the card padding token for theme panels", () => {
        const input = sample();
        input.body.push({id:"panel", type:"column", attrs:{"data-mf-style":"panel-inner"}, children:[]});
        const result = applyEmailTheme(input, resolveEmailTheme({ appearance:{cardPadding:35} }));
        expect(find(result, "panel").styles?.padding).toBe("35px");
    });
    it("supports purpose-specific success/warning/danger styling", () => {
        const input = sample();
        for (const role of ["success-note", "warning-note", "danger-note"]) {
            input.body.push({id:role,type:"text",props:{text:role},attrs:{"data-mf-style":role}});
        }
        const theme = resolveEmailTheme("forest");
        const result = applyEmailTheme(input, theme);
        expect(find(result, "success-note").styles?.color).toBe(theme.colors.success);
        expect(find(result, "warning-note").styles?.color).toBe(theme.colors.warning);
        expect(find(result, "danger-note").styles?.color).toBe(theme.colors.danger);
    });
    it("renders new branded header with an accessible company logo", async () => {
        const email = createEmail({ brand:{name:"Northstar",logo:"https://example.com/logo.png"}, theme:"ocean" });
        const result = await email.renderDocument(sample());
        expect(result.html).toContain("Northstar logo");
        expect(result.html).toContain("https://example.com/logo.png");
        expect(result.html).toContain("#075985");
        expect(result.text).toContain("Useful content");
    });
    it("respects content visibility and explicit theme overrides", async () => {
        const email = createEmail({theme:"premium"});
        const result = await email.renderDocument(sample(), {
            display:{heading:false}, theme:{colors:{primary:"#123456"}},
        });
        expect(result.html).not.toContain("Welcome");
        expect(result.html).toContain("#123456");
        expect(result.html).toContain("Useful content");
    });
    it("renders in light, dark and RTL layouts without losing words", async () => {
        for (const theme of ["modern", "dark", "playful"] as const) {
            const email = createEmail({theme});
            const result = await email.renderDocument(sample(), {locale:"ar",direction:"rtl"});
            expect(result.html).toContain('dir="rtl"');
            expect(result.html).toContain("Useful content");
            expect(result.text).toContain("Useful content");
        }
    });
    it("renders existing welcome template with branded actions", async () => {
        const email = createEmail({brand:{name:"Acme"}, theme:"forest"});
        const result = await email.render("welcome", {data:{user:{firstName:"Priya"},actionUrl:"https://example.com/dashboard"}});
        expect(result.html).toContain("Priya");
        expect(result.html).toContain("#166534");
        expect(result.text).toContain("Priya");
    });
});
