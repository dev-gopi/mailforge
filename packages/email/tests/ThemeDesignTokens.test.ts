import { describe, expect, it } from "vitest";
import {
    applyEmailTheme,
    createEmail,
    EmailThemeError,
    getThemePreset,
    mergeEmailTheme,
    resolveEmailTheme,
    type EmailDocument,
} from "../src/index.js";

describe("advanced email-safe design tokens", () => {
    it("provides complete status, card, and button tokens in all presets", () => {
        for (const preset of ["modern", "minimal", "corporate"] as const) {
            const theme = getThemePreset(preset);
            expect(theme.colors.success).toMatch(/^#[0-9a-f]{6}$/);
            expect(theme.colors.warning).toMatch(/^#[0-9a-f]{6}$/);
            expect(theme.colors.danger).toMatch(/^#[0-9a-f]{6}$/);
            expect(theme.appearance.cardPadding).toBeGreaterThanOrEqual(8);
            expect(theme.appearance.buttonPaddingX).toBeGreaterThanOrEqual(8);
            expect(theme.appearance.buttonPaddingY).toBeGreaterThanOrEqual(8);
        }
    });

    it("accepts safe per-engine and per-render overrides without changing the base", () => {
        const email = createEmail({
            theme: {
                preset: "corporate",
                colors: { success: "#008844" },
                appearance: { cardPadding: 30, buttonPaddingY: 16, buttonPaddingX: 32 },
            },
        });
        expect(email.getTheme().colors.success).toBe("#008844");
        expect(email.getTheme().appearance.cardPadding).toBe(30);
        const resolved = email.resolveTheme({ appearance: { buttonPaddingX: 40 } });
        expect(resolved.appearance.buttonPaddingX).toBe(40);
        expect(email.getTheme().appearance.buttonPaddingX).toBe(32);
        expect(getThemePreset("corporate").appearance.buttonPaddingX).toBe(28);
    });

    it("applies card and button padding to semantic and ordinary components", () => {
        const source: EmailDocument = {
            schemaVersion: "1.0", id: "design-token-test", version: "1.0.0",
            subject: "Design tokens", body: [
                { id: "panel", type: "container", attrs: { "data-mf-style": "panel-inner" }, children: [
                    { id: "inside", type: "text", props: { text: "Hello" } },
                ] },
                { id: "primary", type: "button", attrs: { "data-mf-style": "primary-action" },
                    props: { text: "Continue", href: "https://example.com" } },
                { id: "ordinary", type: "button", props: { text: "Details", href: "https://example.com" } },
            ],
        };
        const theme = resolveEmailTheme({
            appearance: { cardPadding: 31, buttonPaddingX: 29, buttonPaddingY: 15 },
        });
        const result = applyEmailTheme(source, theme);
        expect(result.body[0]?.styles?.padding).toBe("31px");
        expect(result.body[1]?.styles?.innerPadding).toBe("15px 29px");
        expect(result.body[2]?.styles?.innerPadding).toBe("15px 29px");
        expect(source.body[0]?.styles).toBeUndefined();
    });

    it("keeps caller-specified component styles above theme defaults", () => {
        const doc: EmailDocument = {
            schemaVersion: "1.0", id: "custom", version: "1.0.0", subject: "Test",
            body: [{ id: "button", type: "button", props: { text: "OK", href: "https://example.com" },
                styles: { innerPadding: "7px 11px" } }],
        };
        const result = applyEmailTheme(doc, resolveEmailTheme());
        expect(result.body[0]?.styles?.innerPadding).toBe("7px 11px");
    });

    it("rejects unknown or unsafe token values", () => {
        expect(() => resolveEmailTheme({ appearance: { cardPadding: -1 } })).toThrow(EmailThemeError);
        expect(() => resolveEmailTheme({ appearance: { buttonPaddingY: 100 } })).toThrow(EmailThemeError);
        expect(() => resolveEmailTheme({ colors: { danger: "red" } })).toThrow(EmailThemeError);
        expect(() => resolveEmailTheme({ appearance: { unknown: 12 } })).toThrow(EmailThemeError);
    });

    it("preserves legacy themes and immutable merged snapshots", () => {
        const base = resolveEmailTheme("modern");
        const merged = mergeEmailTheme(base, { spacing: { md: 20 } });
        expect(merged.spacing.md).toBe(20);
        expect(merged.appearance.cardRadius).toBe(base.appearance.cardRadius);
        expect(base.spacing.md).toBe(16);
        expect(Object.isFrozen(merged.appearance)).toBe(true);
    });
});
