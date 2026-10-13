import { describe, expect, it } from "vitest";
import {
    buildCatalogTemplate,
    eventCatalogTemplateDataSchema,
    saasCatalogTemplateDataSchema,
    supportCatalogTemplateDataSchema,
    listCatalogTemplates,
} from "@mailforge/templates";
import { createEmail } from "../src/index.js";

const common = { recipientName: "Priya", actionUrl: "https://example.com/action" };

describe("Task 7.8.5.8–7.8.5.10: events, SaaS, support", () => {
    it("validates event chronology and renders UTC details", () => {
        const data = { ...common, event: { name: "Launch", startsAt: "2026-11-05T10:00:00+05:30", endsAt: "2026-11-05T11:00:00+05:30", meetingUrl: "https://example.com/join" } };
        expect(eventCatalogTemplateDataSchema.parse(data).event?.name).toBe("Launch");
        const doc = buildCatalogTemplate("event-invitation", data);
        expect(JSON.stringify(doc.body)).toContain("04:30:00 GMT");
        expect(JSON.stringify(doc.body)).toContain("event-invitation-event-details");
    });
    it("validates SaaS usage and support ticket details", () => {
        expect(saasCatalogTemplateDataSchema.parse({ ...common, saas: { usagePercent: 0, workspaceName: "Acme" } }).saas?.usagePercent).toBe(0);
        expect(supportCatalogTemplateDataSchema.parse({ ...common, support: { ticketId: "TICKET-29", status: "resolved" } }).support?.status).toBe("resolved");
        expect(JSON.stringify(buildCatalogTemplate("usage-warning", { ...common, saas: { usagePercent: 83 } }).body)).toContain("Usage: 83%");
        expect(JSON.stringify(buildCatalogTemplate("support-ticket-resolved", { ...common, support: { ticketId: "SUP-1" } }).body)).toContain("SUP-1");
    });
    it("renders through main API and hides the details panel", async () => {
        const email = createEmail();
        const data = { ...common, event: { name: "Product launch" } };
        const visible = await email.render("event-reminder", { data });
        const hidden = await email.render("event-reminder", { data, display: { heading: false, hideIds: ["event-reminder-event-details"] } });
        expect(visible.html).toContain("Product launch");
        expect(hidden.html).not.toContain("Product launch");
    });
    it("rejects impossible dates and invalid URLs", () => {
        expect(() => eventCatalogTemplateDataSchema.parse({ ...common, event: { startsAt: "2026-11-05T11:00:00Z", endsAt: "2026-11-05T10:00:00Z" } })).toThrow();
        expect(() => eventCatalogTemplateDataSchema.parse({ ...common, event: { meetingUrl: "javascript:alert(1)" } })).toThrow();
    });
    it("rejects invalid SaaS percentages and ticket statuses", () => {
        expect(() => saasCatalogTemplateDataSchema.parse({ ...common, saas: { usagePercent: 101 } })).toThrow();
        expect(() => saasCatalogTemplateDataSchema.parse({ ...common, saas: { usagePercent: Number.NaN } })).toThrow();
        expect(() => supportCatalogTemplateDataSchema.parse({ ...common, support: { ticketId: "x y" } })).toThrow();
        expect(() => supportCatalogTemplateDataSchema.parse({ ...common, support: { status: "deleted" } })).toThrow();
    });
    it("rejects details on unrelated templates and keeps old calls", () => {
        expect(() => buildCatalogTemplate("payment-failed", { ...common, event: { name: "Not allowed" } })).toThrow();
        expect(() => buildCatalogTemplate("event-invitation", { ...common, support: { ticketId: "A" } })).toThrow();
        expect(buildCatalogTemplate("event-invitation", common).id).toBe("event-invitation");
    });
    it("covers all four templates in each category", () => {
        for (const category of ["events", "saas", "support"] as const) {
            expect(listCatalogTemplates(category)).toHaveLength(4);
        }
    });
});
