import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { activityNotificationPreviewData, activityNotificationSchema, buildActivityNotificationTemplate } from "../src/notifications/ActivityNotificationTemplate.js";

describe("activity-notification template", () => {
    it("is a distinct discoverable built-in notification", () => {
        expect(isCatalogTemplateName("activity-notification")).toBe(true);
        expect(listCatalogTemplates().filter(row => row.id === "activity-notification")).toHaveLength(1);
        expect(listCatalogTemplates()).toHaveLength(89);
    });
    it("validates the standalone document and renders user-provided text", () => {
        const doc = buildCatalogTemplate("activity-notification", activityNotificationPreviewData);
        expect(new DocumentValidator().validate(doc).valid).toBe(true);
        expect(doc.subject).toContain("Mira Patel commented on Design handoff");
        expect(doc.body.some(node => node.id === "activity-quote")).toBe(true);
        expect(doc.body.some(node => node.id === "activity-outside-footer")).toBe(true);
    });
    it("rejects dangerous URLs, extra fields, empty excerpt and control characters", () => {
        const data = activityNotificationPreviewData;
        expect(() => activityNotificationSchema.parse({ ...data, actionUrl: "javascript:alert(1)" })).toThrow();
        expect(() => activityNotificationSchema.parse({ ...data, preferencesUrl: "http://example.com" })).toThrow();
        expect(() => activityNotificationSchema.parse({ ...data, unknown: true })).toThrow();
        expect(() => activityNotificationSchema.parse({ ...data, commentExcerpt: "" })).toThrow();
        expect(() => activityNotificationSchema.parse({ ...data, actorName: "bad\nactor" })).toThrow();
    });
    it("supports independent palette and copy customization", () => {
        const changed = buildActivityNotificationTemplate({ ...activityNotificationPreviewData,
            heading: "New feedback", design: { accent: "#112233", quoteBorder: "#123456" } });
        const original = buildActivityNotificationTemplate(activityNotificationPreviewData);
        expect(JSON.stringify(changed)).toContain("New feedback");
        expect(JSON.stringify(changed)).toContain("#123456");
        expect(JSON.stringify(original)).not.toContain("#123456");
    });
});
