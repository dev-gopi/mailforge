import { describe, expect, it } from "vitest";
import { EmailThemeError, ThemeRegistry, ThemeVersionRegistry } from "../src/index.js";

describe("theme version lifecycle", () => {
    it("publishes immutable theme snapshots and keeps older versions", () => {
        const registry = new ThemeRegistry();
        registry.register({ name: "northstar", extends: "corporate", overrides: { colors: { primary: "#112233" } } });
        const versions = new ThemeVersionRegistry();
        const original = structuredClone(registry.resolve("northstar"));
        versions.publish("northstar", "1.0.0", original);
        (original as unknown as { colors: { primary: string } }).colors.primary = "#ffffff";
        versions.migrate("northstar", "1.0.0", "1.1.0", { colors: { primary: "#445566" } });
        expect(versions.resolve("northstar", "1.0.0").colors.primary).toBe("#112233");
        expect(versions.resolve("northstar", "1.1.0").colors.primary).toBe("#445566");
        expect(versions.list("northstar").map(x => x.version)).toEqual(["1.1.0", "1.0.0"]);
    });

    it("rejects duplicates, bad versions and downgrades", () => {
        const registry = new ThemeRegistry().register({ name: "northstar" });
        const versions = new ThemeVersionRegistry().publish("northstar", "1.0.0", registry.resolve("northstar"));
        expect(() => versions.publish("northstar", "1.0.0", registry.resolve("northstar"))).toThrow(EmailThemeError);
        expect(() => versions.publish("northstar", "1.0", registry.resolve("northstar"))).toThrow(EmailThemeError);
        expect(() => versions.migrate("northstar", "1.0.0", "0.9.0", {})).toThrow(EmailThemeError);
        expect(versions.list("northstar")).toHaveLength(1);
    });

    it("deprecates safely and preserves explicit historical access", () => {
        const theme = new ThemeRegistry().register({ name: "northstar" }).resolve("northstar");
        const versions = new ThemeVersionRegistry().publish("northstar", "1.0.0", theme);
        versions.migrate("northstar", "1.0.0", "2.0.0", {}, true);
        expect(() => versions.resolve("northstar", "1.0.0")).toThrow(EmailThemeError);
        expect(versions.resolve("northstar", "1.0.0", true).colors.primary).toBe(theme.colors.primary);
        expect(versions.list("northstar")[1]!.status).toBe("deprecated");
    });

    it("validates tokens before publication and never partially publishes failures", () => {
        const theme = new ThemeRegistry().register({ name: "northstar" }).resolve("northstar");
        const versions = new ThemeVersionRegistry().publish("northstar", "1.0.0", theme);
        expect(() => versions.migrate("northstar", "1.0.0", "1.1.0", { colors: { primary: "red" } })).toThrow(EmailThemeError);
        expect(versions.list("northstar").map(x => x.version)).toEqual(["1.0.0"]);
    });
});
