import { describe, expect, it } from "vitest";
import {
    EmailThemeError, ThemeRegistry, ThemeVersionRegistry,
    auditThemeContrast, getContrastRatio, getThemePreset, listThemeCatalog,
    listThemePresets, resolveEmailTheme,
} from "../src/index.js";

const NEW_PRESETS = ["dark", "premium", "ocean", "forest", "sunset", "elegant", "playful"] as const;
const LEGACY = ["modern", "minimal", "corporate"] as const;

describe("8.5.14: ten professional design presets", () => {
    it("preserves the original three in their existing order", () => {
        expect(listThemePresets().slice(0, 3)).toEqual(LEGACY);
    });
    it("exposes exactly ten unique theme IDs", () => {
        const names = listThemePresets();
        expect(names).toHaveLength(10);
        expect(new Set(names).size).toBe(10);
        expect(names.slice(3)).toEqual(NEW_PRESETS);
    });
    it("resolves every new preset by name and configuration", () => {
        for (const name of NEW_PRESETS) {
            expect(resolveEmailTheme(name).preset).toBe(name);
            expect(resolveEmailTheme({ preset: name }).preset).toBe(name);
        }
    });
    it("each preset has valid six-digit design colors", () => {
        for (const name of NEW_PRESETS) {
            const theme = getThemePreset(name);
            for (const value of Object.values(theme.colors)) {
                expect(value).toMatch(/^#[0-9a-f]{6}$/i);
            }
        }
    });
    it("maintains WCAG AA normal-text contrast on all diagnosed surfaces", () => {
        for (const name of NEW_PRESETS) {
            const results = auditThemeContrast(getThemePreset(name));
            expect(results).toHaveLength(3);
            expect(results.every(result => result.passes)).toBe(true);
        }
    });
    it("supports white button labels on the seven accent colors", () => {
        for (const name of NEW_PRESETS) {
            expect(getContrastRatio("#ffffff", getThemePreset(name).colors.primary)).toBeGreaterThanOrEqual(4.5);
        }
    });
    it("has seven visually distinct primary/background combinations", () => {
        const signatures = NEW_PRESETS.map(name => {
            const { colors } = getThemePreset(name);
            return `${colors.primary}:${colors.background}`;
        });
        expect(new Set(signatures).size).toBe(7);
    });
    it("preserves all current design token categories", () => {
        const modern = getThemePreset("modern");
        for (const name of NEW_PRESETS) {
            const theme = getThemePreset(name);
            for (const kind of ["colors", "typography", "spacing", "appearance"] as const) {
                expect(Object.keys(theme[kind]).sort()).toEqual(Object.keys(modern[kind]).sort());
            }
        }
    });
    it("returns isolated copies without mutating future resolutions", () => {
        const draft = getThemePreset("dark");
        const copied = structuredClone(draft);
        (copied.colors as { primary: string }).primary = "#ffffff";
        expect(getThemePreset("dark").colors.primary).not.toBe("#ffffff");
    });
    it("keeps the legacy modern blue unchanged", () => {
        expect(getThemePreset("modern").colors.primary).toBe("#2563eb");
    });
    it("brand primary color can explicitly override a preset", () => {
        const theme = resolveEmailTheme("forest", "#123456");
        expect(theme.colors.primary).toBe("#123456");
        expect(getThemePreset("forest").colors.primary).toBe("#166534");
    });
    it("per-render token overrides beat the brand color", () => {
        const theme = resolveEmailTheme({ preset: "premium", colors: { primary: "#abcdef" } }, "#123456");
        expect(theme.colors.primary).toBe("#abcdef");
    });
    it("custom themes can inherit from the seven new presets", () => {
        const registry = new ThemeRegistry();
        for (const name of NEW_PRESETS) {
            const customName = `acme-${name}`;
            registry.register({ name: customName, extends: name, overrides: { colors: { secondary: "#112233" } } });
            expect(registry.resolve(customName).colors.background).toBe(getThemePreset(name).colors.background);
            expect(registry.resolve(customName).colors.secondary).toBe("#112233");
        }
    });
    it("theme version registry publishes a new preset snapshot", () => {
        const snapshot = getThemePreset("ocean");
        const registry = new ThemeVersionRegistry();
        registry.publish("ocean-brand", "1.0.0", snapshot);
        expect(registry.resolve("ocean-brand", "1.0.0").colors.primary).toBe(snapshot.colors.primary);
    });
    it("catalog entries cover the expanded library and include metadata", () => {
        const catalog = listThemeCatalog();
        expect(catalog.map(x => x.name)).toEqual(listThemePresets());
        expect(catalog.every(x => x.label.length > 0 && x.description.length > 0)).toBe(true);
    });
    it("rejects unsupported preset names without creating implicit presets", () => {
        expect(() => resolveEmailTheme("unknown-new-theme")).toThrow(EmailThemeError);
    });
});
