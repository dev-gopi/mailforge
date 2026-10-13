import { describe, expect, it } from "vitest";
import {
    EmailThemeError, defineThemeOverrides, getThemePreset, listThemePresets,
    mergeEmailTheme, resolveEmailTheme,
} from "../src/index.js";

describe("Standalone @mailforge/themes contract", () => {
    it("exposes the three existing presets", () => {
        expect(listThemePresets()).toEqual(["modern", "minimal", "corporate"]);
        expect(getThemePreset("modern").colors.primary).toBe("#2563eb");
    });

    it("keeps returned presets isolated", () => {
        const first = getThemePreset("modern");
        Object.assign(first.colors, { primary: "#ffffff" });
        expect(getThemePreset("modern").colors.primary).toBe("#2563eb");
    });

    it("validates brand and explicit override precedence", () => {
        const result = resolveEmailTheme({
            preset: "corporate",
            colors: { primary: "#00AA11" },
        }, "#ff2200");
        expect(result.colors.primary).toBe("#00aa11");
        expect(result.preset).toBe("corporate");
    });

    it("preserves design tokens from existing email theme", () => {
        const result = resolveEmailTheme({
            appearance: { cardPadding: 30, buttonPaddingX: 32 },
            colors: { success: "#008000" },
        });
        expect(result.appearance.cardPadding).toBe(30);
        expect(result.appearance.buttonPaddingX).toBe(32);
        expect(result.colors.success).toBe("#008000");
    });

    it("merges custom themes without modifying the base", () => {
        const base = resolveEmailTheme("minimal");
        const changed = mergeEmailTheme(base, defineThemeOverrides({
            colors: { primary: "#223344" },
        }));
        expect(changed.colors.primary).toBe("#223344");
        expect(base.colors.primary).toBe("#111827");
    });

    it("rejects unknown options and unsafe color values", () => {
        expect(() => resolveEmailTheme({ colors: { primary: "red" } }))
            .toThrow(EmailThemeError);
        expect(() => resolveEmailTheme({ madeUp: true }))
            .toThrow(EmailThemeError);
    });
});
