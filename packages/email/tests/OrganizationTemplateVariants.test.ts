import { describe, expect, it } from "vitest";
import { createEmail, TemplateVariantError } from "../src/index.js";

const data = {
    user: { firstName: "Priya" },
    actionUrl: "https://example.com/dashboard",
};

describe("Task 7.8.4.6–7.8.4.7 — organization-specific variants", () => {
    it("renders independent colors for the same variant ID in two organizations", async () => {
        const email = createEmail();
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "special",
            theme: { colors: { primary: "#1256a8" } },
        });
        email.registerOrganizationTemplateVariant("org-b", {
            templateId: "welcome", id: "special",
            theme: { colors: { primary: "#0f766e" } },
        });
        const a = await email.render("welcome", {
            organizationId: "org-a", variant: "special", data,
        });
        const b = await email.render("welcome", {
            organizationId: "org-b", variant: "special", data,
        });
        expect(a.html).toContain("#1256a8");
        expect(b.html).toContain("#0f766e");
        expect(a.html).not.toBe(b.html);
    });

    it("does not expose a global custom variant to a tenant or vice versa", async () => {
        const email = createEmail();
        email.registerTemplateVariant({
            templateId: "welcome", id: "global-special",
            theme: { colors: { primary: "#123456" } },
        });
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "tenant-special",
        });
        expect(() => email.resolveTemplateVariant("welcome", "tenant-special"))
            .toThrow(TemplateVariantError);
        expect(() => email.resolveOrganizationTemplateVariant("org-a", "welcome", "global-special"))
            .toThrow(TemplateVariantError);
        expect(() => email.resolveOrganizationTemplateVariant("org-b", "welcome", "tenant-special"))
            .toThrow(TemplateVariantError);
        await expect(email.render("welcome", {
            organizationId: "org-b", variant: "tenant-special", data,
        })).rejects.toThrow(TemplateVariantError);
    });

    it("keeps built-in presets and legacy unscoped rendering available", async () => {
        const email = createEmail();
        const scoped = email.resolveOrganizationTemplateVariant("org-a", "welcome", "premium");
        expect(scoped.theme?.appearance?.cardRadius).toBe(16);
        expect(email.listOrganizationTemplateVariants("org-a", "welcome")
            .map(item => item.id)).toEqual(["branded", "compact", "default", "premium"]);
        const legacy = await email.render("welcome", { data });
        const premium = await email.render("welcome", {
            organizationId: "org-a", variant: "premium", data,
        });
        expect(legacy.subject).toBe(premium.subject);
        expect(legacy.html).not.toBe(premium.html);
    });

    it("round-trips inherited custom variants using scoped JSON", async () => {
        const original = createEmail();
        original.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "parent", extends: "premium",
            theme: { colors: { primary: "#1256a8" } },
        });
        original.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "child", extends: "parent",
            layout: { header: { enabled: false } },
        });
        const json = original.exportOrganizationTemplateVariants("org-a");
        const parsed = JSON.parse(json) as { organizationId: string; variants: { id: string }[] };
        expect(parsed.organizationId).toBe("org-a");
        expect(parsed.variants.map(item => item.id)).toEqual(["child", "parent"]);
        const restored = createEmail();
        restored.importOrganizationTemplateVariants("org-a", json);
        const resolved = restored.resolveOrganizationTemplateVariant("org-a", "welcome", "child");
        expect(resolved.theme?.colors?.primary).toBe("#1256a8");
        expect(resolved.layout?.header?.enabled).toBe(false);
        const result = await restored.render("welcome", {
            organizationId: "org-a", variant: "child", data,
        });
        expect(result.subject).toBe("Welcome, Priya!");
    });

    it("rejects a different tenant ID and leaves current data unchanged", () => {
        const email = createEmail();
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "existing",
            theme: { colors: { primary: "#1256a8" } },
        });
        const before = email.exportOrganizationTemplateVariants("org-a");
        expect(() => email.importOrganizationTemplateVariants("org-b", before))
            .toThrow(TemplateVariantError);
        expect(email.exportOrganizationTemplateVariants("org-a")).toBe(before);
        expect(JSON.parse(email.exportOrganizationTemplateVariants("org-b"))
            .variants).toEqual([]);
    });

    it("rejects invalid import, duplicate definitions and preserves atomicity", () => {
        const email = createEmail();
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "existing",
            theme: { colors: { primary: "#1256a8" } },
        });
        const snapshot = email.exportOrganizationTemplateVariants("org-a");
        const invalid = JSON.stringify({
            schemaVersion: 1, organizationId: "org-a", variants: [
                { templateId: "welcome", id: "valid" },
                { templateId: "welcome", id: "invalid", theme: {
                    colors: { primary: "not-a-color" },
                } },
            ],
        });
        expect(() => email.importOrganizationTemplateVariants("org-a", invalid)).toThrow();
        expect(email.exportOrganizationTemplateVariants("org-a")).toBe(snapshot);
        expect(() => email.importOrganizationTemplateVariants("org-a", snapshot))
            .toThrow(TemplateVariantError);
        expect(() => email.importOrganizationTemplateVariants("org-a", "{bad"))
            .toThrow(TemplateVariantError);
    });

    it("rejects invalid organization IDs and cross-tenant parent references", () => {
        const email = createEmail();
        expect(() => email.registerOrganizationTemplateVariant("", {
            templateId: "welcome", id: "special",
        })).toThrow(TemplateVariantError);
        expect(() => email.exportOrganizationTemplateVariants("../bad"))
            .toThrow(TemplateVariantError);
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "parent",
        });
        expect(() => email.registerOrganizationTemplateVariant("org-b", {
            templateId: "welcome", id: "child", extends: "parent",
        })).toThrow(TemplateVariantError);
    });

    it("lets the explicit render override win over the organization variant", async () => {
        const email = createEmail();
        email.registerOrganizationTemplateVariant("org-a", {
            templateId: "welcome", id: "special",
            theme: { colors: { primary: "#1256a8" } },
        });
        const result = await email.render("welcome", {
            organizationId: "org-a", variant: "special", data,
            theme: { colors: { primary: "#9333ea" } },
            display: { heading: false },
        });
        expect(result.html).toContain("#9333ea");
        expect(result.html).not.toContain("Welcome to your new workspace.");
    });
});
