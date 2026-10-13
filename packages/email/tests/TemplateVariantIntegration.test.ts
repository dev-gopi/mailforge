import { describe, expect, it } from "vitest";
import {
    createEmail,
    TemplateVariantError,
} from "../src/index.js";

const welcomeData = {
    user: { firstName: "Priya" },
    actionUrl: "https://example.com/dashboard",
};

describe("Task 7.8.4.1–7.8.4.5 — reusable template variants", () => {
    it("provides four built-in variants without changing default renders", async () => {
        const email = createEmail();
        expect(email.listTemplateVariants("welcome").map(v => v.id))
            .toEqual(["branded", "compact", "default", "premium"]);
        expect(email.resolveTemplateVariant("welcome", "premium")
            .theme?.appearance?.cardRadius).toBe(16);
        const original = await email.render("welcome", { data: welcomeData });
        const compact = await email.render("welcome", {
            variant: "compact", data: welcomeData,
        });
        expect(original.subject).toBe("Welcome, Priya!");
        expect(compact.subject).toBe(original.subject);
        expect(compact.html).not.toBe(original.html);
    });

    it("applies inheritance and lets per-render theme/patches win", async () => {
        const email = createEmail();
        email.registerTemplateVariant({
            templateId: "welcome", id: "base", extends: "premium",
            theme: { colors: { primary: "#0f766e" } },
            patches: [{ op: "update", target: "welcome-action",
                props: { text: "Base button" } }],
        });
        email.registerTemplateVariant({
            templateId: "welcome", id: "child", extends: "base",
            layout: { header: { enabled: false } },
        });
        const result = await email.render("welcome", {
            variant: "child", data: welcomeData,
            theme: { colors: { primary: "#9333ea" } },
            patches: [{ op: "update", target: "welcome-action",
                props: { text: "Final button" } }],
            display: { heading: false },
        });
        expect(result.html).toContain("#9333ea");
        expect(result.text).toContain("Final button");
        expect(result.text).not.toContain("Base button");
        expect(result.html).not.toContain("Welcome to your new workspace.");
        expect(email.resolveTemplateVariant("welcome", "child").theme?.appearance?.cardRadius)
            .toBe(16);
        expect(email.resolveTemplateVariant("welcome", "child").layout?.header?.enabled)
            .toBe(false);
    });

    it("uses registered theme profiles and still honors an explicit override", async () => {
        const email = createEmail();
        email.registerThemeProfile("partner-color", {
            colors: { primary: "#0f766e" },
        });
        email.registerTemplateVariant({
            templateId: "welcome", id: "with-profile", themeProfile: "partner-color",
        });
        const fromProfile = await email.render("welcome", {
            variant: "with-profile", data: welcomeData,
        });
        expect(fromProfile.html).toContain("#0f766e");
        const overridden = await email.render("welcome", {
            variant: "with-profile", data: welcomeData,
            theme: { colors: { primary: "#2563eb" } },
        });
        expect(overridden.html).toContain("#2563eb");
    });

    it("clones registered definitions and keeps engine instances isolated", () => {
        const first = createEmail();
        const second = createEmail();
        const definition = {
            templateId: "welcome", id: "custom",
            theme: { colors: { primary: "#123456" } },
        };
        first.registerTemplateVariant(definition);
        definition.theme.colors.primary = "#abcdef";
        expect(first.resolveTemplateVariant("welcome", "custom").theme?.colors?.primary)
            .toBe("#123456");
        expect(() => second.resolveTemplateVariant("welcome", "custom"))
            .toThrow(TemplateVariantError);
    });

    it("round-trips inherited variants through JSON", async () => {
        const first = createEmail();
        first.registerTemplateVariant({ templateId: "welcome", id: "partner",
            extends: "premium", theme: { colors: { primary: "#1166aa" } } });
        const json = first.exportTemplateVariants();
        const second = createEmail();
        second.importTemplateVariants(json);
        expect(second.resolveTemplateVariant("welcome", "partner").theme?.colors?.primary)
            .toBe("#1166aa");
        const rendered = await second.render("welcome", { variant: "partner", data: welcomeData });
        expect(rendered.subject).toBe("Welcome, Priya!");
        expect(() => second.importTemplateVariants(json)).toThrow(TemplateVariantError);
    });

    it("rejects unknown templates, variants, profiles and invalid theme values", async () => {
        const email = createEmail();
        expect(() => email.registerTemplateVariant({
            templateId: "missing", id: "my-variant",
        })).toThrow(/Template not found/);
        expect(() => email.registerTemplateVariant({
            templateId: "welcome", id: "my-variant", extends: "missing",
        })).toThrow(TemplateVariantError);
        expect(() => email.registerTemplateVariant({
            templateId: "welcome", id: "my-variant", themeProfile: "missing",
        })).toThrow(TemplateVariantError);
        expect(() => email.registerTemplateVariant({
            templateId: "welcome", id: "my-variant", theme: { colors: { primary: "not-a-color" } },
        })).toThrow();
        await expect(email.render("welcome", { data: welcomeData, variant: "unknown" }))
            .rejects.toThrow(TemplateVariantError);
    });

    it("combines variants with version-only custom templates", async () => {
        const email = createEmail();
        email.registerTemplateVersion({
            schemaVersion: "1.0", id: "version-only-variant", version: "1.0.0",
            subject: "Version-only subject", body: [{
                id: "content", type: "text", props: { text: "Version-only content" },
            }],
        });
        const result = await email.render("version-only-variant", {
            templateVersion: { version: "1.0.0" }, variant: "compact",
        });
        expect(result.subject).toBe("Version-only subject");
        expect(result.text).toContain("Version-only content");
    });

    it("rejects invalid imports before committing any definitions", () => {
        const email = createEmail();
        const bad = JSON.stringify({
            schemaVersion: 1, variants: [{
                templateId: "welcome", id: "bad",
                theme: { colors: { primary: "javascript:alert(1)" } },
            }],
        });
        expect(() => email.importTemplateVariants(bad)).toThrow();
        expect(email.listTemplateVariants()).toEqual([]);
    });

    it("continues validating built-in data with a selected variant", async () => {
        const email = createEmail();
        await expect(email.render("welcome", {
            variant: "premium", data: { user: { firstName: "" }, actionUrl: "bad-url" },
        })).rejects.toThrow();
    });
});
