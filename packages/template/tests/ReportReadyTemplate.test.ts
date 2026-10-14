import { describe, expect, it } from "vitest";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildReportReadyTemplate, reportReadySchema, reportReadyPreviewData } from "../src/notifications/ReportReadyTemplate.js";

describe("report-ready built-in", () => {
    it("is a unique discoverable notifications template", () => {
        expect(isCatalogTemplateName("report-ready")).toBe(true);
        expect(listCatalogTemplates().filter(t => t.id === "report-ready")).toHaveLength(1);
    });
    it("renders a valid structured document with a safe HTTPS action", () => {
        const doc = buildCatalogTemplate("report-ready", reportReadyPreviewData);
        expect(doc.subject).toContain("Monthly Performance Report");
        expect(doc.body.some(node => node.id === "report-ready-summary")).toBe(true);
        expect(JSON.stringify(doc)).toContain("https://example.com/reports/sample");
    });
    it("rejects unsafe and incomplete data", () => {
        expect(() => reportReadySchema.parse({ ...reportReadyPreviewData, reportUrl: "javascript:alert(1)" })).toThrow();
        expect(() => reportReadySchema.parse({ ...reportReadyPreviewData, reportUrl: "http://example.com/report" })).toThrow();
        expect(() => reportReadySchema.parse({ ...reportReadyPreviewData, recipientName: "" })).toThrow();
        expect(() => reportReadySchema.parse({ ...reportReadyPreviewData, unexpected: true })).toThrow();
    });
    it("preserves spacing before an inline fallback link", () => {
        expect(reportReadySchema.parse(reportReadyPreviewData).fallbackPrefix).toBe("If the button doesn't work, ");
        expect(() => reportReadySchema.parse({ ...reportReadyPreviewData, fallbackPrefix: " " })).toThrow();
    });
    it("uses caller copy and palette without mutating another render", () => {
        const alternate = buildReportReadyTemplate({ ...reportReadyPreviewData, reportName: "Sales <Q4>", design: { accent: "#112233" } });
        const regular = buildReportReadyTemplate(reportReadyPreviewData);
        expect(JSON.stringify(alternate)).toContain("Sales <Q4>");
        expect(JSON.stringify(alternate)).toContain("#112233");
        expect(JSON.stringify(regular)).not.toContain("#112233");
    });
});
