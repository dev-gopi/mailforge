import { describe, expect, it } from "vitest";
import { createEmail, EmailThemeError } from "../src/index.js";

const data = { user: { firstName: "Gopi" }, actionUrl: "https://example.com/dashboard" };

function sample() {
    return createEmail({ brand: { name: "Northstar" } });
}

describe("custom theme integration", () => {
    it("renders registered themes with explicit per-render overrides", async () => {
        const email = sample();
        email.registerTheme({ name: "northstar", extends: "corporate", overrides: { colors: { primary: "#123456" } } });
        expect(email.resolveRegisteredTheme("northstar").colors.primary).toBe("#123456");
        const plain = await email.render("welcome", { themeName: "northstar", data });
        const overridden = await email.render("welcome", { themeName: "northstar", theme: { colors: { primary: "#abcdef" } }, data });
        expect(plain.html).toContain("#123456");
        expect(overridden.html).toContain("#abcdef");
    });

    it("keeps current rendering behavior when themeName is absent", async () => {
        const email = sample();
        const before = await email.render("welcome", { data });
        email.registerTheme({ name: "northstar", overrides: { colors: { primary: "#123456" } } });
        const after = await email.render("welcome", { data });
        expect(after.html).toBe(before.html);
    });

    it("keeps organization themes isolated from global themes and other organizations", async () => {
        const email = sample();
        email.registerOrganizationTheme("company-a", { name: "special", overrides: { colors: { primary: "#123456" } } });
        email.registerOrganizationTheme("company-b", { name: "special", overrides: { colors: { primary: "#abcdef" } } });
        const first = await email.render("welcome", { organizationId: "company-a", themeName: "special", data });
        const second = await email.render("welcome", { organizationId: "company-b", themeName: "special", data });
        expect(first.html).toContain("#123456");
        expect(second.html).toContain("#abcdef");
        expect(() => email.resolveRegisteredTheme("special")).toThrow(EmailThemeError);
        expect(() => email.resolveOrganizationTheme("company-c", "special")).toThrow(EmailThemeError);
    });

    it("supports validated organization-specific import/export without cross-tenant import", () => {
        const email = sample();
        email.registerOrganizationTheme("company-a", { name: "special", extends: "minimal" });
        const json = email.exportOrganizationThemes("company-a");
        const another = sample();
        expect(() => another.importOrganizationThemes("company-b", json)).toThrow(EmailThemeError);
        another.importOrganizationThemes("company-a", json);
        expect(another.resolveOrganizationTheme("company-a", "special").preset).toBe("minimal");
    });

    it("keeps theme versions immutable and requires explicit access to deprecated versions", async () => {
        const email = sample();
        email.registerTheme({ name: "special", overrides: { colors: { primary: "#123456" } } });
        email.publishThemeVersion("special", "1.0.0");
        email.migrateThemeVersion("special", "1.0.0", "2.0.0", { colors: { primary: "#abcdef" } }, true);
        expect(email.listThemeVersions("special").map(x => x.version)).toEqual(["2.0.0", "1.0.0"]);
        expect(() => email.resolvePublishedTheme("special", "1.0.0")).toThrow(EmailThemeError);
        const old = await email.render("welcome", { themeName: "special", themeVersion: "1.0.0", includeDeprecatedTheme: true, data });
        const current = await email.render("welcome", { themeName: "special", themeVersion: "2.0.0", data });
        expect(old.html).toContain("#123456");
        expect(current.html).toContain("#abcdef");
    });

    it("rejects unresolved named themes, version without name and invalid organization ID", async () => {
        const email = sample();
        await expect(email.render("welcome", { themeName: "missing", data })).rejects.toThrow(EmailThemeError);
        await expect(email.render("welcome", { themeVersion: "1.0.0", data })).rejects.toThrow(EmailThemeError);
        await expect(email.render("welcome", { organizationId: "../bad", themeName: "special", data })).rejects.toThrow();
    });
});
