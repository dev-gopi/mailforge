import { describe, expect, it } from "vitest";
import { DocumentValidator, type EmailNode } from "@mailforge/core";
import {
    buildCatalogTemplate, listCatalogTemplates,
} from "../src/catalog/CatalogTemplates.js";
import {
    CATALOG_DESIGN_FAMILIES, getCatalogDesignFamily,
} from "../src/catalog/CatalogDesignFamilies.js";

const data = { recipientName: "Gopi", actionUrl: "https://example.com/open", unsubscribeUrl: "https://example.com/unsubscribe" };
const nodes = (tree: readonly EmailNode[]): EmailNode[] => tree.flatMap(node => [node, ...nodes(node.children ?? [])]);

describe("distinct purpose-driven catalog compositions", () => {
    it("assigns every catalog ID to exactly twelve stable design families", () => {
        const names = new Set<string>();
        for (const info of listCatalogTemplates()) {
            const family = getCatalogDesignFamily(info.id, info.category);
            expect(getCatalogDesignFamily(info.id, info.category)).toBe(family);
            names.add(family);
            const doc = buildCatalogTemplate(info.id);
            expect(doc.metadata?.designFamily).toBe(family);
            expect(new DocumentValidator().validate(doc).valid, info.id).toBe(true);
        }
        expect([...names].sort()).toEqual([...CATALOG_DESIGN_FAMILIES].sort());
    });
    it("keeps original content IDs and important links across all layouts", () => {
        for (const info of listCatalogTemplates().filter(info => !["report-ready", "activity-notification", "password-reset-secure", "order-shipped-notice", "workspace-invitation-editorial", "appointment-confirmation", "new-device-login-alert", "subscription-activated", "support-ticket-created"].includes(info.id))) {
            const document = buildCatalogTemplate(info.id, data);
            const all = nodes(document.body);
            for (const part of ["title", "greeting", "message", "action"]) {
                expect(all.some(node => node.id === `${info.id}-${part}`), `${info.id}:${part}`).toBe(true);
            }
            expect(all.find(node => node.id === `${info.id}-action`)?.props?.href).toBe(data.actionUrl);
            if (info.category === "marketing") {
                expect(all.some(node => node.id === `${info.id}-unsubscribe`), info.id).toBe(true);
            }
            expect(new DocumentValidator().validate(document).valid, info.id).toBe(true);
        }
    });
    it("uses one full-width content card rather than side-by-side story cards", () => {
        for (const info of listCatalogTemplates().filter(info => info.id !== "report-ready" && info.id !== "activity-notification" && info.id !== "password-reset-secure" && info.id !== "order-shipped-notice" && info.id !== "workspace-invitation-editorial" && info.id !== "appointment-confirmation" && info.id !== "new-device-login-alert" && info.id !== "subscription-activated" && info.id !== "support-ticket-created")) {
            const document = buildCatalogTemplate(info.id, data);
            for (const section of nodes(document.body).filter(node => node.type === "section")) {
                const columns = section.children?.filter(child => child.type === "column") ?? [];
                expect(columns.length, `${info.id}:${section.id}`).toBeLessThanOrEqual(1);
            }
        }
    });
    it("uses purpose-specific records, routes, conversations, and alerts", () => {
        const cases = [
            ["invoice-overdue", "design-ledger"],
            ["invoice-reminder", "design-record"],
            ["order-out-for-delivery", "design-route"],
            ["ticket-escalated", "design-conversation"],
            ["login-attempt-blocked", "design-alert"],
        ] as const;
        for (const [id, role] of cases) {
            const document = buildCatalogTemplate(id, data);
            expect(nodes(document.body).some(node =>
                node.attrs?.["data-mf-style"] === role,
            ), id).toBe(true);
        }
    });
    it("offers multiple fallback font families without embedding unsafe inline styles", () => {
        const families = new Set<string>();
        for (const info of listCatalogTemplates().filter(info => info.id !== "report-ready" && info.id !== "activity-notification" && info.id !== "password-reset-secure" && info.id !== "order-shipped-notice" && info.id !== "workspace-invitation-editorial" && info.id !== "appointment-confirmation" && info.id !== "new-device-login-alert" && info.id !== "subscription-activated" && info.id !== "support-ticket-created")) {
            const doc = buildCatalogTemplate(info.id, data);
            const title = nodes(doc.body).find(node => node.id === `${info.id}-title`);
            expect(title?.attrs?.["data-mf-font"]).toBeTruthy();
            expect(title?.styles?.fontFamily).toBeUndefined();
            families.add(String(title?.attrs?.["data-mf-font"]));
        }
        expect(families.size).toBeGreaterThanOrEqual(5);
    });
    it("keeps validated detail labels intact in their original panels", () => {
        const invoice = buildCatalogTemplate("invoice-overdue", {...data, billing: { referenceId: "INV-71", amount: "24.50", currency: "USD" }});
        expect(JSON.stringify(invoice.body)).toContain("Reference: INV-71");
        const product = buildCatalogTemplate("order-placed", {...data, ecommerce: {orderId:"ORD-99", carrier:"Acme"}});
        expect(JSON.stringify(product.body)).toContain("Order: ORD-99");
        const promotion = buildCatalogTemplate("flash-sale", {...data, marketing:{promotionCode:"SAVE20"}});
        expect(JSON.stringify(promotion.body)).toContain("Promotion code: SAVE20");
        const workspace = buildCatalogTemplate("workspace-created", {...data, saas:{usagePercent:84}});
        expect(JSON.stringify(workspace.body)).toContain("Usage: 84%");
    });
    it("does not invent money, tickets, prices or event details without user data", () => {
        for (const id of ["invoice-overdue", "order-placed", "event-ticket-issued", "flash-sale"] as const) {
            const raw = JSON.stringify(buildCatalogTemplate(id));
            expect(raw).not.toContain("$99.00");
            expect(raw).not.toContain("SAVE20");
            expect(raw).not.toContain("INV-71");
        }
    });
});
