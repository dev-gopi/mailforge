import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildPasswordResetSecureTemplate, passwordResetSecureSchema, passwordResetSecurePreviewData } from "../src/authentication/PasswordResetSecureTemplate.js";

describe("password-reset-secure standalone catalog template", () => {
    it("registers a distinct ID without replacing the existing password-reset", () => {
        expect(isCatalogTemplateName("password-reset-secure")).toBe(true);
        expect(listCatalogTemplates()).toHaveLength(90);
        expect(listCatalogTemplates().filter(x => x.id === "password-reset-secure")).toHaveLength(1);
    });
    it("builds a valid default document with before- and after-shell sections", () => {
        const doc = buildCatalogTemplate("password-reset-secure");
        expect(doc.id).toBe("password-reset-secure");
        expect(doc.body.some(node => node.attrs?.["data-mf-placement"] === "before-shell")).toBe(true);
        expect(doc.body.some(node => node.attrs?.["data-mf-placement"] === "after-shell")).toBe(true);
        expect(new DocumentValidator().validate(doc).valid).toBe(true);
    });
    it("supports distinct caller content, theme colors and complete custom copy", () => {
        const doc = buildPasswordResetSecureTemplate({ ...passwordResetSecurePreviewData,
            firstName: "Mira", heading: "Choose a new password", expiryMinutes: 12,
            design: { accent: "#112233", panel: "#F0F0F0" },
        });
        const stringified = JSON.stringify(doc);
        expect(stringified).toContain("Mira");
        expect(stringified).toContain("#112233");
        expect(stringified).toContain("12 minutes");
        expect(JSON.stringify(buildPasswordResetSecureTemplate())).not.toContain("#112233");
    });
    it("rejects non-HTTPS or credentialed links, extraneous fields, invalid minutes, and control characters", () => {
        const d = passwordResetSecurePreviewData;
        expect(() => passwordResetSecureSchema.parse({ ...d, resetUrl: "javascript:alert(1)" })).toThrow();
        expect(() => passwordResetSecureSchema.parse({ ...d, supportUrl: "http://example.com" })).toThrow();
        expect(() => passwordResetSecureSchema.parse({ ...d, resetUrl: "https://user:pass@example.com/reset" })).toThrow();
        expect(() => passwordResetSecureSchema.parse({ ...d, expiryMinutes: 0 })).toThrow();
        expect(() => passwordResetSecureSchema.parse({ ...d, firstName: "Bad\nUser" })).toThrow();
        expect(() => passwordResetSecureSchema.parse({ ...d, added: true })).toThrow();
    });
});
