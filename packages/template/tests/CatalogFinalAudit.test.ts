import { describe, expect, it } from "vitest";
import { auditTemplateCatalog } from "../src/registry/TemplateCatalogAudit.js";
import { listBuiltinTemplateCatalog } from "../src/BuiltinTemplates.js";
import { buildCatalogTemplate, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";

describe("Task 7.8.5.11–7.8.6: catalog verification", () => {
    it("has unique, complete catalog metadata and valid documents", () => {
        const audit = auditTemplateCatalog();
        expect(audit.issues).toEqual([]);
        expect(audit.valid).toBe(true);
        const rows = listBuiltinTemplateCatalog();
        expect(new Set(rows.map(r => r.id)).size).toBe(rows.length);
        expect(audit.checked).toBe(rows.length);
        expect(rows.length).toBeGreaterThanOrEqual(49);
    });
    it("keeps marketing unsubscribe link visible in every marketing catalog template", () => {
        for (const info of listCatalogTemplates("marketing")) {
            expect(() => buildCatalogTemplate(info.id, { recipientName: "Priya", actionUrl: "https://example.com", unsubscribeUrl: "https://example.com/unsubscribe" })).not.toThrow();
            expect(() => buildCatalogTemplate(info.id, { recipientName: "Priya", actionUrl: "https://example.com" })).toThrow();
        }
    });
});
