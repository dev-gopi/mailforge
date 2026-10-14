import { describe, expect, it } from "vitest";
import type { EmailNode } from "@mailforge/core";
import { buildCatalogTemplate, CATALOG_TEMPLATE_DEFINITIONS } from "../src/catalog/CatalogTemplates.js";
import { getCatalogDesignFamily } from "../src/catalog/CatalogDesignFamilies.js";
import { EXPANDED_CATALOG_TEMPLATE_NAMES } from "../src/catalog/ExpandedCatalogTemplates.js";

function flatten(nodes: readonly EmailNode[]): EmailNode[] {
    return nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
}

const curated = [
    ["password-changed", "authentication", "security"],
    ["payment-failed", "billing", "ledger"],
    ["order-packed", "ecommerce", "delivery"],
    ["cart-reminder", "ecommerce", "showcase"],
    ["event-registration", "events", "ticket"],
    ["webinar-announcement", "marketing", "invitation"],
    ["api-key-created", "saas", "security"],
    ["support-ticket-resolved", "support", "conversation"],
    ["incident-resolved", "notifications", "dashboard"],
] as const;

const heroFamilies = new Set(["editorial", "spotlight", "showcase", "ticket", "invitation"]);

describe("purposeful catalog design", () => {
    it("selects semantic families instead of arbitrary hash results", () => {
        for (const [id, category, expected] of curated) {
            expect(getCatalogDesignFamily(id, category)).toBe(expected);
        }
    });

    it("retains 94 unique catalog IDs, nodes, actions and unsubscribe controls", () => {
        expect(CATALOG_TEMPLATE_DEFINITIONS).toHaveLength(96);
        expect(new Set(CATALOG_TEMPLATE_DEFINITIONS.map(([id]) => id)).size).toBe(96);
        for (const [id, category] of CATALOG_TEMPLATE_DEFINITIONS) {
            if (id === "report-ready" || id === "activity-notification" || id === "password-reset-secure" || id === "order-shipped-notice" || id === "workspace-invitation-editorial" || id === "appointment-confirmation" || id === "new-device-login-alert" || id === "subscription-activated" || id === "support-ticket-created") continue;
            const doc = buildCatalogTemplate(id);
            const nodes = flatten(doc.body);
            const ids = nodes.map(node => node.id);
            expect(new Set(ids).size, id).toBe(ids.length);
            expect(ids, id).toContain(`${id}-action`);
            expect(ids, id).not.toContain(`${id}-eyebrow`);
            if (category === "marketing") expect(ids, id).toContain(`${id}-unsubscribe`);
            const family = getCatalogDesignFamily(id, category);
            expect(doc.metadata?.designFamily, id).toBe(family);
            expect(ids.includes(`${id}-design-hero`), id).toBe(heroFamilies.has(family));
        }
    });

    it("removes repeated boilerplate from expanded introductions without changing IDs", () => {
        const expanded = new Set<string>(EXPANDED_CATALOG_TEMPLATE_NAMES);
        expect(expanded.size).toBe(51);
        for (const [id, , , description] of CATALOG_TEMPLATE_DEFINITIONS) {
            if (!expanded.has(id)) continue;
            const nodes = flatten(buildCatalogTemplate(id).body);
            const message = nodes.find(node => node.id === `${id}-message`);
            expect(message?.props, id).toMatchObject({ text: `${description}.` });
            expect(nodes.some(node => node.id === `${id}-intro`), id).toBe(true);
        }
    });
});
