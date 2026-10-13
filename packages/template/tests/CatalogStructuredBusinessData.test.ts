import { describe, expect, it } from "vitest";
import type { EmailNode } from "@mailforge/core";
import { buildCatalogTemplate, CATALOG_TEMPLATE_DEFINITIONS } from "../src/catalog/CatalogTemplates.js";

function flatten(nodes: readonly EmailNode[]): EmailNode[] {
    return nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
}
function getNode(id: string, input: Record<string, unknown>, suffix: string): EmailNode | undefined {
    return flatten(buildCatalogTemplate(id as Parameters<typeof buildCatalogTemplate>[0], input).body)
        .find(node => node.id === `${id}-${suffix}`);
}
const base = { recipientName: "Riley", actionUrl: "https://example.com/view" };

describe("Task 8.5.19 — validated structured business details", () => {
    it("renders caller-supplied invoice line items, without calculating money", () => {
        const input = { ...base, billing: {
            referenceId: "INV-001", amount: "26.00", currency: "USD",
            lineItems: [
                { description: "Support plan", quantity: 2, unitPrice: "10.00", lineTotal: "20.00" },
                { description: "Setup", quantity: 1, unitPrice: "6.00", lineTotal: "6.00" },
            ],
        } };
        const table = getNode("invoice-overdue", input, "invoice-lines");
        expect(table?.type).toBe("table");
        expect(table?.props?.rows).toEqual([
            ["Support plan", "2", "USD 10.00", "USD 20.00"],
            ["Setup", "1", "USD 6.00", "USD 6.00"],
        ]);
        expect(getNode("invoice-overdue", input, "billing-amount")?.props?.text)
            .toBe("Amount: USD 26.00");
        expect(getNode("invoice-overdue", { ...base, billing: { referenceId: "INV-002" } }, "invoice-lines"))
            .toBeUndefined();
        expect(() => buildCatalogTemplate("invoice-overdue", {
            ...base, billing: { lineItems: [input.billing.lineItems[0]] },
        })).toThrow();
    });

    it("renders product cards using only validated merchant-provided values", () => {
        const input = { ...base, unsubscribeUrl: "https://example.com/unsubscribe", marketing: {
            products: [
                { name: "Cotton shirt", priceLabel: "USD 20.00", description: "Regular fit" },
                { name: "Denim jacket", priceLabel: "USD 70.00",
                    imageUrl: "https://example.com/jacket.png", imageAlt: "Denim jacket" },
            ],
        } };
        expect(getNode("product-recommendation", input, "product-0-name")?.props?.text)
            .toBe("Cotton shirt");
        expect(getNode("product-recommendation", input, "product-1-image")?.props)
            .toMatchObject({ src: "https://example.com/jacket.png", alt: "Denim jacket" });
        expect(getNode("product-recommendation", input, "unsubscribe")).toBeDefined();
        expect(() => buildCatalogTemplate("product-recommendation", {
            ...base, unsubscribeUrl: input.unsubscribeUrl,
            marketing: { products: [{ name: "Item", priceLabel: "USD 1", imageUrl: "https://example.com/x.png" }] },
        })).toThrow();
    });

    it("renders an event ticket only when real event name and code are supplied", () => {
        const input = { ...base, event: {
            name: "Developer Summit", ticketCode: "TKT-001", admission: "General",
            venue: "Hall B",
        } };
        expect(getNode("event-ticket-issued", input, "event-ticket")?.props?.rows).toEqual([
            ["Event", "Developer Summit"], ["Attendee", "Riley"],
            ["Ticket", "TKT-001"], ["Admission", "General"],
        ]);
        expect(getNode("event-ticket-issued", input, "event-venue")?.props?.text)
            .toBe("Venue: Hall B");
        expect(getNode("event-ticket-issued", base, "event-ticket")).toBeUndefined();
        expect(() => buildCatalogTemplate("event-ticket-issued", {
            ...base, event: { ticketCode: "TKT-001" },
        })).toThrow();
    });

    it("renders supplied dashboard metrics and keeps the valid zero usage value", () => {
        const input = { ...base, saas: {
            workspaceName: "Team Alpha", usagePercent: 0,
            metrics: [{ label: "Requests", value: "120" }, { label: "Errors", value: "0" }],
        } };
        expect(getNode("usage-limit-reached", input, "saas-metrics")?.props?.rows).toEqual([
            ["Requests", "120"], ["Errors", "0"],
        ]);
        expect(getNode("usage-limit-reached", input, "saas-usage")?.props?.text)
            .toBe("Usage: 0%");
        expect(getNode("usage-limit-reached", base, "saas-metrics")).toBeUndefined();
    });

    it("retains all 87 IDs and previously supplied security/reference node IDs", () => {
        expect(CATALOG_TEMPLATE_DEFINITIONS).toHaveLength(87);
        const input = { ...base, security: {
            device: "Firefox", location: "Kolkata", occurredAt: "2026-10-13T18:30:00+05:30",
        } };
        const nodes = flatten(buildCatalogTemplate("login-attempt-blocked", input).body);
        const ids = nodes.map(node => node.id);
        expect(ids).toContain("login-attempt-blocked-security-device");
        expect(ids).toContain("login-attempt-blocked-security-location");
        expect(ids).toContain("login-attempt-blocked-security-time");
        expect(new Set(ids).size).toBe(ids.length);
    });
});
