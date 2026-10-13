import { describe, expect, it } from "vitest";
import {
    EmailThemeError,
    ThemeRegistry,
    getThemePreset,
    listThemePresets,
    resolveEmailTheme,
} from "../src/index.js";

describe("8.0.6.2–8.0.6.4: standalone theme registry", () => {
    it("preserves the three existing preset definitions", () => {
        expect(listThemePresets()).toEqual(["modern", "minimal", "corporate"]);
        for (const id of listThemePresets()) {
            expect(getThemePreset(id)).toEqual(resolveEmailTheme(id));
        }
    });

    it("creates an inherited custom theme without changing built-ins", () => {
        const registry = new ThemeRegistry();
        registry.register({ name: "acme", extends: "corporate", overrides: { colors: { primary: "#123456" } } });
        registry.register({ name: "acme-premium", extends: "acme", overrides: { appearance: { cardRadius: 14 } } });
        const result = registry.resolve("acme-premium");
        expect(result.colors.primary).toBe("#123456");
        expect(result.appearance.cardRadius).toBe(14);
        expect(result.colors.background).toBe(getThemePreset("corporate").colors.background);
        expect(resolveEmailTheme("corporate").colors.primary).not.toBe("#123456");
    });

    it("respects explicit overrides over inherited theme values", () => {
        const registry = new ThemeRegistry();
        registry.register({ name: "custom", overrides: { colors: { primary: "#112233" } } });
        expect(registry.resolve("custom", { colors: { primary: "#abcdef" } }).colors.primary).toBe("#abcdef");
        expect(registry.resolve("custom").colors.primary).toBe("#112233");
    });

    it("clones saved definitions and isolates independent registries", () => {
        const first = new ThemeRegistry();
        const second = new ThemeRegistry();
        const draft = { name: "custom", overrides: { colors: { primary: "#123456" } } };
        first.register(draft);
        draft.overrides.colors.primary = "#ffffff";
        const exposed = first.get("custom");
        exposed.overrides!.colors!.primary = "#000000";
        expect(first.resolve("custom").colors.primary).toBe("#123456");
        expect(() => second.resolve("custom")).toThrow(EmailThemeError);
    });

    it("round-trips JSON with out-of-order inherited definitions", () => {
        const first = new ThemeRegistry();
        first.register({ name: "parent", overrides: { colors: { primary: "#123456" } } });
        first.register({ name: "child", extends: "parent", overrides: { appearance: { cardPadding: 26 } } });
        const saved = JSON.parse(first.exportJSON()) as { schemaVersion: number; themes: object[] };
        saved.themes.reverse();
        const second = new ThemeRegistry().importJSON(JSON.stringify(saved));
        expect(second.list()).toEqual(["child", "parent"]);
        expect(second.resolve("child").colors.primary).toBe("#123456");
        expect(second.resolve("child").appearance.cardPadding).toBe(26);
    });

    it("rejects invalid names, unsupported tokens and duplicates", () => {
        const registry = new ThemeRegistry();
        expect(() => registry.register({ name: "modern" })).toThrow(EmailThemeError);
        expect(() => registry.register({ name: "Bad Name" })).toThrow(EmailThemeError);
        expect(() => registry.register({ name: "bad", overrides: { colors: { primary: "red" } } })).toThrow(EmailThemeError);
        expect(() => registry.register({ name: "orphan", extends: "absent" })).toThrow(EmailThemeError);
        registry.register({ name: "okay" });
        expect(() => registry.register({ name: "okay" })).toThrow(EmailThemeError);
        expect(registry.list()).toEqual(["okay"]);
    });

    it("rejects cycles and invalid imports without partial changes", () => {
        const registry = new ThemeRegistry();
        registry.register({ name: "existing" });
        const old = registry.exportJSON();
        expect(() => registry.importJSON(JSON.stringify({
            schemaVersion: 1,
            themes: [{ name: "a", extends: "b" }, { name: "b", extends: "a" }],
        }))).toThrow(EmailThemeError);
        expect(() => registry.importJSON("not-json")).toThrow(EmailThemeError);
        expect(() => registry.importJSON(JSON.stringify({ schemaVersion: 1, themes: [{ name: "unknown", overrides: { colors: { primary: "red" } } }] }))).toThrow(EmailThemeError);
        expect(registry.exportJSON()).toBe(old);
    });

    it("can replace custom registry state without affecting built-in themes", () => {
        const registry = new ThemeRegistry().register({ name: "old" });
        const payload = JSON.stringify({ schemaVersion: 1, themes: [{ name: "replacement", extends: "minimal" }] });
        expect(() => registry.importJSON(payload, { replace: "yes" as unknown as boolean })).toThrow(EmailThemeError);
        registry.importJSON(payload, { replace: true });
        expect(registry.list()).toEqual(["replacement"]);
        expect(registry.resolve("replacement").colors.primary).toBe(getThemePreset("minimal").colors.primary);
        expect(() => registry.get("old")).toThrow(EmailThemeError);
    });
});
