import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildNewDeviceLoginAlertTemplate, newDeviceLoginAlertPreviewData, newDeviceLoginAlertSchema } from "../src/authentication/NewDeviceLoginAlertTemplate.js";

describe("new-device-login-alert (#107)", () => {
    it("registers a standalone security alert with a valid document", () => {
        expect(isCatalogTemplateName("new-device-login-alert")).toBe(true);
        expect(listCatalogTemplates().filter(item => item.id === "new-device-login-alert")).toHaveLength(1);
        const document = buildCatalogTemplate("new-device-login-alert");
        expect(document.metadata?.designFamily).toBe("security");
        expect(new DocumentValidator().validate(document).valid).toBe(true);
    });
    it("customizes security facts, palette and canvas without leaking state", () => {
        const document = buildNewDeviceLoginAlertTemplate({ ...newDeviceLoginAlertPreviewData,
            deviceName: "Safari on iPhone", design: { accent: "#112233", canvas: "#445566" },
        });
        const output = JSON.stringify(document);
        expect(output).toContain("Safari on iPhone");
        expect(output).toContain("#112233");
        expect(document.head?.bodyBackgroundColor).toBe("#445566");
        expect(JSON.stringify(buildNewDeviceLoginAlertTemplate())).not.toContain("#112233");
    });
    it("rejects unsafe URLs, unsafe content, and unknown fields while preserving generic catalog input", () => {
        const data = newDeviceLoginAlertPreviewData;
        expect(() => newDeviceLoginAlertSchema.parse({ ...data, securityUrl: "http://example.com/security" })).toThrow();
        expect(() => newDeviceLoginAlertSchema.parse({ ...data, supportUrl: "https://u:p@example.com/support" })).toThrow();
        expect(() => newDeviceLoginAlertSchema.parse({ ...data, eventId: "SL\nBcc: x" })).toThrow();
        expect(() => newDeviceLoginAlertSchema.parse({ ...data, unexpected: true })).toThrow();
        const generic = buildCatalogTemplate("new-device-login-alert", { recipientName: "Sam", actionUrl: "https://example.com/security" });
        expect(JSON.stringify(generic)).toContain("Sam");
        expect(JSON.stringify(generic)).toContain("https://example.com/security");
    });
});
