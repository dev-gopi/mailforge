import { describe, expect, it } from "vitest";
import { auditThemeContrast, getContrastRatio, listThemeCatalog } from "../src/catalog/ThemeCatalog.js";
import { getThemePreset } from "../src/presets/ThemePresets.js";

describe("theme catalog", () => {
    it("exposes a unique entry for every real built-in theme", () => {
        const items = listThemeCatalog();
        expect(items.map(item => item.name).sort()).toEqual(["corporate", "minimal", "modern"]);
        expect(items.every(item => /^#[0-9a-f]{6}$/i.test(item.primary))).toBe(true);
    });
    it("computes standards-based black and white contrast", () => {
        expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
        expect(getContrastRatio("#ffffff", "#ffffff")).toBe(1);
    });
    it("reports low-contrast combinations without silently rewriting brands", () => {
        const theme = getThemePreset("modern");
        const findings = auditThemeContrast({ ...theme, colors: { ...theme.colors, text: theme.colors.surface } });
        expect(findings.find(item => item.pair === "text/surface")?.passes).toBe(false);
    });
    it("rejects invalid contrast colors", () => {
        expect(() => getContrastRatio("red", "#ffffff")).toThrow(/HEX/);
    });
});
