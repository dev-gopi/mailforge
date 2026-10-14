import { describe, expect, it } from "vitest";
import { createEmail, EmailDocumentOverrideError } from "../src/index.js";
import { listBuiltinTemplateCatalog } from "@mailforge/templates";

const reset = {
    brandName: "Northstar", firstName: "Alex", resetUrl: "https://example.com/reset",
    supportUrl: "https://example.com/support", expiryMinutes: 30, year: 2026,
};

function dataForTemplate(id: string): Record<string, unknown> {
    const url = "https://example.com/action";
    switch (id) {
        case "welcome": return { user: { firstName: "Alex" }, actionUrl: url };
        case "otp": return { code: "123456", expiresInMinutes: 10 };
        case "login": return { user: { firstName: "Alex" }, loginUrl: url, expiresInMinutes: 10 };
        case "password-reset": return { user: { firstName: "Alex" }, resetUrl: url, expiresInMinutes: 10 };
        case "invitation": return { invitee: { firstName: "Alex" }, inviterName: "Mira", organizationName: "Northstar", inviteUrl: url };
        case "notification": return { title: "Notice", message: "An update is available.", actionUrl: url };
        case "invoice": return { customer: { name: "Alex" }, invoice: { number: "INV-1", issuedOn: "2026-10-01", dueOn: "2026-10-15", currency: "USD", items: [{ name: "Plan", quantity: 1, unitPriceCents: 1000 }] }, paymentUrl: url };
        case "payment-receipt": return { customer: { name: "Alex" }, receipt: { number: "REC-1", transactionId: "TXN-1", paidOn: "2026-10-01", currency: "USD", items: [{ name: "Plan", quantity: 1, unitPriceCents: 1000 }] }, receiptUrl: url };
        case "order-confirmation": return { customer: { firstName: "Alex" }, order: { id: "ORD-1", placedOn: "2026-10-01", currency: "USD", items: [{ name: "Plan", quantity: 1, unitPriceCents: 1000 }] }, orderUrl: url };
        case "security-alert": return { user: { firstName: "Alex" }, alert: { kind: "new-device", occurredAt: "2026-10-01T12:00:00Z", device: "Browser" }, reviewUrl: url };
        case "newsletter": return { issue: "October", title: "Product news", summary: "The latest updates.", featured: { title: "New release", description: "A helpful update.", articleUrl: url }, unsubscribeUrl: "https://example.com/unsubscribe" };
        case "promotion": return { title: "Autumn offer", description: "Save on your next purchase.", discountCode: "SAVE20", discountPercent: 20, expiresOn: "2026-10-31", actionUrl: url };
        case "shipping-update": return { customer: { firstName: "Alex" }, order: { id: "ORD-1" }, shipment: { carrier: "MailForge Express", trackingNumber: "TRACK-1", trackingUrl: url, estimatedDelivery: "2026-10-15" } };
        case "password-reset-secure": return reset;
        case "activity-notification": return { brandName: "huddle", recipientName: "Alex", actorName: "Mira", itemName: "Board", commentExcerpt: "Hi", actionUrl: url, preferencesUrl: "https://example.com/preferences", year: 2026 };
        case "workspace-invitation-editorial": return {
            brandName: "kindred", workspaceName: "Fieldnotes", workspaceInitial: "F",
            recipientFirstName: "Alex", inviterName: "Mira", roleName: "Member", expiryDays: 7,
            invitationUrl: url, supportUrl: "https://example.com/support",
            year: 2026, companyAddress: "Example Street",
        };
        case "order-shipped-notice": return {
            brandName: "Northstar", firstName: "Alex", orderNumber: "ORD-1",
            deliveryDate: "October 18", carrierName: "ShipCo", trackingNumber: "TRK-1",
            trackingUrl: url, supportUrl: "https://example.com/support", companyAddress: "Example St",
        };
        case "report-ready": return { companyName: "Northstar", recipientName: "Alex", reportName: "Monthly Report", reportPeriod: "September 2026", reportUrl: "https://example.com/report", year: 2026 };
        default: return { recipientName: "Alex", actionUrl: url, unsubscribeUrl: "https://example.com/unsubscribe", detail: "Reference 1" };
    }
}

describe("universal per-render overrides", () => {
    it("overrides a standalone built-in's text, URL, styles and subject", async () => {
        const email = createEmail();
        const result = await email.render("password-reset-secure", {
            data: reset, themeName: "modern",
            theme: { colors: { primary: "#3047a3" } },
            display: { subject: "A custom secure action" },
            overrides: {
                byType: { text: { styles: { fontFamily: "Georgia, serif" } } },
                byRole: { "primary-action": { styles: { backgroundColor: "#d13263" } } },
                byId: {
                    "password-secure-heading": { props: { text: "Set your new password" },
                        styles: { fontSize: 27, color: "#10557a" } },
                    "password-secure-action": { props: { href: "https://example.com/second-reset", text: "Proceed" } },
                },
            },
        });
        expect(result.subject).toBe("A custom secure action");
        expect(result.html).toContain("Set your new password");
        expect(result.html).toContain("https://example.com/second-reset");
        expect(result.html).toContain("#d13263");
        expect(result.html).toContain("#10557a");
    });
    it("works across the activity template and original catalog templates", async () => {
        const email = createEmail();
        const activity = await email.render("activity-notification", {
            data: { brandName: "huddle", recipientName: "Alex", actorName: "Mira",
                itemName: "Board", commentExcerpt: "Hi", actionUrl: "https://example.com/action",
                preferencesUrl: "https://example.com/preferences", year: 2026 },
            overrides: { byId: { "activity-comment": { props: { text: "Custom comment" } } } },
        });
        expect(activity.html).toContain("Custom comment");
        const catalog = await email.render("payment-failed", {
            data: { recipientName: "Alex", actionUrl: "https://example.com/pay" },
            overrides: { byRole: { "primary-action": { styles: { backgroundColor: "#b22466" } } } },
        });
        expect(catalog.html).toContain("#b22466");
    });
    it("supports generic type overrides throughout the complete built-in catalog", async () => {
        const email = createEmail();
        const catalog = listBuiltinTemplateCatalog();
        expect(catalog).toHaveLength(105);
        for (const { id } of catalog) {
            const data = dataForTemplate(id);
            const result = await email.render(id, {
                data,
                overrides: { byType: { text: { styles: { fontFamily: "Verdana, Geneva, sans-serif" } } } },
            });
            expect(result.html.length, id).toBeGreaterThan(100);
        }
    });
    it("rejects an unknown byId without affecting subsequent renders", async () => {
        const email = createEmail();
        await expect(email.render("password-reset-secure", { data: reset,
            overrides: { byId: { missing: { props: { text: "Invalid" } } } },
        })).rejects.toThrow(EmailDocumentOverrideError);
        const normal = await email.render("password-reset-secure", { data: reset });
        expect(normal.html).toContain("Reset your password");
        expect(normal.html).not.toContain("Invalid");
    });
});
