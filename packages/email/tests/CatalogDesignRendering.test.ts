import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { listCatalogTemplates } from "@mailforge/templates";

const sample = { recipientName: "Gopi", actionUrl: "https://example.com/open", unsubscribeUrl: "https://example.com/unsubscribe" };
const examples = ["feature-announcement", "flash-sale", "invoice-reminder", "invoice-overdue", "order-out-for-delivery", "product-launch", "event-ticket-issued", "event-invitation", "workspace-created", "ticket-escalated", "login-attempt-blocked", "account-restored"];

describe("compiled MJML and theme diversity", () => {
    it("renders every catalog template without alignment-invalid MJML", async () => {
        const email = createEmail({ theme: "modern", brand: { name: "Northstar" } });
        for (const template of listCatalogTemplates()) {
            const data = template.id === "activity-notification"
                ? { brandName: "huddle", recipientName: "Gopi", actorName: "Mira",
                    itemName: "Design handoff", commentExcerpt: "Please review",
                    actionUrl: sample.actionUrl, preferencesUrl: "https://example.com/preferences", year: 2026 }
                : sample;
            const result = await email.render(template.id, { data });
            expect(result.html, template.id).toContain("<html");
            expect(result.html, template.id).toContain("https://example.com/open");
        }
    }, 120_000);

    it("renders all twelve layout families with safe links and plain text", async () => {
        const email = createEmail({ theme: "modern", brand: { name: "Northstar" } });
        for (const id of examples) {
            const result = await email.render(id, { data: sample });
            expect(result.html, id).toContain("<html");
            expect(result.html, id).toContain("https://example.com/open");
            expect(result.text, id).toContain("Gopi");
            expect(result.html.length, id).toBeGreaterThan(500);
        }
    }, 120_000);
    it("renders actual invoice, order, metric and coupon business components", async () => {
        const email = createEmail({ theme: "forest", brand: { name: "Northstar" } });
        const inputs = [
            ["invoice-overdue", { billing: {referenceId:"INV-71", amount:"24.50", currency:"USD"}}, "INV-71"],
            ["order-placed", { ecommerce: {orderId:"ORD-99",carrier:"Acme"}}, "ORD-99"],
            ["workspace-created", { saas: {usagePercent:84}}, "84"],
            ["flash-sale", { marketing: {promotionCode:"SAVE20"}}, "SAVE20"],
        ] as const;
        for (const [id, extras, expected] of inputs) {
            const result = await email.render(id, { data: { ...sample, ...extras } });
            expect(result.html, id).toContain(expected);
            expect(result.text, id).toContain(expected);
        }
    }, 120_000);
    it("changes font families between editorial, technical, corporate and friendly templates", async () => {
        const email = createEmail({ theme: "modern" });
        const first = await email.render("feature-announcement", { data: sample });
        const second = await email.render("login-attempt-blocked", { data: sample });
        const third = await email.render("invoice-overdue", { data: sample });
        expect(first.html).toContain("Georgia");
        expect(second.html).toContain("Verdana");
        expect(third.html).toContain("Tahoma");
    }, 60_000);
    it("preserves heading visibility, marketing opt-out and safe escaping", async () => {
        const email = createEmail({theme:"premium"});
        const result = await email.render("flash-sale", {
            data: {...sample, presentation:{summary:"<img src=x onerror=alert(1)>"}},
            display: {heading:false},
        });
        expect(result.html).toContain("&lt;img");
        expect(result.html).not.toContain("<img src=x onerror");
        expect(result.text).toContain("Unsubscribe");
        expect(result.html).not.toContain("Flash sale</");
    });
});
