import { describe, expect, it } from "vitest";
import {
    marketingCatalogTemplateDataSchema,
    notificationCatalogTemplateDataSchema,
    buildCatalogTemplate,
    listCatalogTemplates,
} from "@mailforge/templates";
import { createEmail } from "../src/index.js";

const base = {
    recipientName: "Gopi",
    actionUrl: "https://example.com/details",
};
const marketingBase = {
    ...base,
    unsubscribeUrl: "https://example.com/unsubscribe",
};

describe("marketing and notification catalog", () => {
    it("validates campaign details and uses theme-aware panel nodes", () => {
        const data = {
            ...marketingBase,
            marketing: {
                campaignName: "Autumn Launch",
                promotionCode: "SAVE_20",
                endsOn: "2026-10-30",
            },
        };
        expect(marketingCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("product-launch", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("product-launch-marketing-details");
        expect(json).toContain("Campaign: Autumn Launch");
        expect(json).toContain("Promotion code: SAVE_20");
        expect(json).toContain("Offer ends: 2026-10-30");
        expect(json).toContain("product-launch-unsubscribe");
    });

    it("validates operational details and normalizes timestamps to UTC", () => {
        const data = {
            ...base,
            notification: {
                serviceName: "API Gateway",
                referenceId: "INC-123",
                severity: "warning",
                eventAt: "2026-10-13T09:15:00+05:30",
            },
        };
        expect(notificationCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("service-outage", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("service-outage-notification-details");
        expect(json).toContain("Service: API Gateway");
        expect(json).toContain("Reference: INC-123");
        expect(json).toContain("Severity: warning");
        expect(json).toContain("Event time (UTC): Tue, 13 Oct 2026 03:45:00 GMT");
    });

    it("renders every marketing template with unsubscribe links", async () => {
        const email = createEmail();
        const templates = listCatalogTemplates("marketing");
        expect(templates.length).toBeGreaterThan(0);
        for (const { id } of templates) {
            const result = await email.render(id, {
                data: { ...marketingBase, marketing: { promotionCode: "SAVE20" } },
                variant: "compact",
            });
            expect(result.text).toContain("Promotion code: SAVE20");
            expect(result.html).toContain("https://example.com/unsubscribe");
        }
    });

    it("renders every notification using the public email API", async () => {
        const email = createEmail();
        const templates = listCatalogTemplates("notifications");
        expect(templates.length).toBeGreaterThan(0);
        for (const { id } of templates) {
            if (id === "activity-notification") {
                const result = await email.render(id, { data: {
                    brandName: "huddle", recipientName: "Gopi", actorName: "Mira",
                    itemName: "Design handoff", commentExcerpt: "Please review",
                    actionUrl: base.actionUrl,
                    preferencesUrl: "https://example.com/preferences", year: 2026,
                } });
                expect(result.text).toContain("Please review");
                continue;
            }
            if (id === "report-ready") {
                const result = await email.render(id, {
                    data: {
                        companyName: "MailForge", recipientName: "Gopi",
                        reportName: "Service report", reportPeriod: "October 2026",
                        reportUrl: base.actionUrl, year: 2026,
                    },
                });
                expect(result.text).toContain("Service report");
                continue;
            }
            const result = await email.render(id, {
                data: { ...base, notification: { serviceName: "MailForge API" } },
            });
            expect(result.text).toContain("Service: MailForge API");
        }
    });

    it("hides optional marketing panels without removing unsubscribe", async () => {
        const email = createEmail();
        const result = await email.render("seasonal-sale", {
            data: { ...marketingBase, marketing: { campaignName: "Autumn Launch" } },
            display: {
                heading: false,
                hideIds: ["seasonal-sale-marketing-details"],
            },
        });
        expect(result.text).not.toContain("Campaign: Autumn Launch");
        expect(result.html).toContain("https://example.com/unsubscribe");
    });

    it("requires unsubscribe even when campaign details are provided", () => {
        expect(() => buildCatalogTemplate("product-launch", {
            ...base, marketing: { campaignName: "Launch" },
        })).toThrow(/unsubscribeUrl/);
    });

    it("rejects invalid field values and extra keys", () => {
        expect(() => buildCatalogTemplate("seasonal-sale", {
            ...marketingBase, marketing: { promotionCode: "NOT VALID!" },
        })).toThrow();
        expect(() => buildCatalogTemplate("event-promotion", {
            ...marketingBase, marketing: { endsOn: "tomorrow" },
        })).toThrow();
        expect(() => buildCatalogTemplate("service-outage", {
            ...base, notification: { severity: "emergency" },
        })).toThrow();
        expect(() => buildCatalogTemplate("service-maintenance", {
            ...base, notification: { eventAt: "next week" },
        })).toThrow();
        expect(() => buildCatalogTemplate("weekly-digest", {
            ...base, notification: { serviceName: "ok", anotherField: "invalid" },
        })).toThrow();
    });

    it("rejects category-specific fields on unrelated templates", () => {
        expect(() => buildCatalogTemplate("payment-failed", {
            ...base, marketing: { campaignName: "Wrong" },
        })).toThrow();
        expect(() => buildCatalogTemplate("product-launch", {
            ...marketingBase, notification: { severity: "info" },
        })).toThrow();
        expect(() => buildCatalogTemplate("service-outage", {
            ...base, marketing: { promotionCode: "SAVE20" },
        })).toThrow();
    });

    it("preserves existing minimal input and template IDs", async () => {
        const email = createEmail();
        const campaign = await email.render("product-launch", { data: marketingBase });
        const notice = await email.render("scheduled-reminder", { data: base });
        expect(campaign.text.length).toBeGreaterThan(0);
        expect(notice.text.length).toBeGreaterThan(0);
        expect(buildCatalogTemplate("weekly-digest", base).id).toBe("weekly-digest");
    });
});
