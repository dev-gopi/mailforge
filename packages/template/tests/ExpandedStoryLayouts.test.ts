import { describe, expect, it } from "vitest";
import type { EmailNode } from "@mailforge/core";
import {
    EXPANDED_CATALOG_TEMPLATE_DEFINITIONS,
    buildExpandedTemplateContent,
} from "../src/catalog/ExpandedCatalogTemplates.js";
import { getCatalogDesignFamily } from "../src/catalog/CatalogDesignFamilies.js";

function flatten(nodes: readonly EmailNode[]): EmailNode[] {
    return nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
}

const unboxed = new Set([
    "editorial", "spotlight", "showcase", "ticket", "invitation",
    "conversation", "minimal",
]);

describe("expanded story composition", () => {
    it("retains the same stable highlight IDs in all 51 expanded templates", () => {
        expect(EXPANDED_CATALOG_TEMPLATE_DEFINITIONS).toHaveLength(51);
        for (const [id, category] of EXPANDED_CATALOG_TEMPLATE_DEFINITIONS) {
            const body = buildExpandedTemplateContent(id);
            const nodes = flatten(body);
            const ids = nodes.map(node => node.id);
            expect(new Set(ids).size, id).toBe(ids.length);
            for (const suffix of ["intro", "highlights", "highlights-column", "highlight-1", "highlight-2"]) {
                expect(ids, id).toContain(`${id}-${suffix}`);
            }
            const highlightSection = nodes.find(node => node.id === `${id}-highlights`);
            expect(highlightSection?.type, id).toBe("section");
            const family = getCatalogDesignFamily(id, category);
            expect(Boolean(highlightSection?.attrs?.["data-mf-style"] === "panel-outer"), id)
                .toBe(!unboxed.has(family));
            expect(nodes.find(node => node.id === `${id}-highlight-1`)?.props?.text, id)
                .toBeTruthy();
            expect(nodes.find(node => node.id === `${id}-highlight-2`)?.props?.text, id)
                .toBeTruthy();
        }
    });

    it("uses open narrative treatments for editorial, marketing and support", () => {
        for (const [id, category] of [
            ["flash-sale", "marketing"],
            ["event-ticket-issued", "events"],
            ["ticket-escalated", "support"],
            ["account-restored", "account"],
        ] as const) {
            expect(unboxed.has(getCatalogDesignFamily(id, category)), id).toBe(true);
            const nodes = flatten(buildExpandedTemplateContent(id));
            expect(nodes.find(node => node.id === `${id}-highlights`)?.attrs?.["data-mf-style"], id)
                .toBeUndefined();
        }
    });

    it("retains highlighted record and security panels where appropriate", () => {
        for (const [id, category] of [
            ["invoice-overdue", "billing"],
            ["order-out-for-delivery", "ecommerce"],
            ["login-attempt-blocked", "authentication"],
            ["workspace-created", "saas"],
        ] as const) {
            expect(unboxed.has(getCatalogDesignFamily(id, category)), id).toBe(false);
            const nodes = flatten(buildExpandedTemplateContent(id));
            expect(nodes.find(node => node.id === `${id}-highlights`)?.attrs?.["data-mf-style"], id)
                .toBe("panel-outer");
        }
    });

    it("keeps validated presentation, facts, steps and secondary-action nodes", () => {
        const nodes = flatten(buildExpandedTemplateContent("invoice-overdue", {
            summary: "Your invoice requires review",
            facts: [{ label: "Invoice", value: "INV-123" }],
            nextSteps: ["Review payment status"],
            secondaryAction: { label: "Contact support", url: "https://example.com/help" },
        }));
        expect(nodes.find(node => node.id === "invoice-overdue-intro")?.props?.text)
            .toBe("Your invoice requires review");
        expect(nodes.find(node => node.id === "invoice-overdue-fact-0")?.props?.text)
            .toBe("Invoice: INV-123");
        expect(nodes.find(node => node.id === "invoice-overdue-step-0")?.props?.text)
            .toBe("1. Review payment status");
        expect(nodes.find(node => node.id === "invoice-overdue-secondary")?.props?.href)
            .toBe("https://example.com/help");
    });
});
