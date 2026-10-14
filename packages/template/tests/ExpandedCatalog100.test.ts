import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import {
    CATALOG_TEMPLATE_DEFINITIONS,
    buildCatalogTemplate,
    listCatalogTemplates,
} from "../src/catalog/CatalogTemplates.js";
import {
    EXPANDED_CATALOG_TEMPLATE_NAMES,
    EXPANDED_TEMPLATE_STORIES,
    expandedTemplatePresentationSchema,
    isExpandedCatalogTemplateName,
} from "../src/catalog/ExpandedCatalogTemplates.js";
import { BUILTIN_CATALOG_TEMPLATE_NAMES, getBuiltinCatalogTemplate, listBuiltinTemplateCatalog } from "../src/BuiltinTemplates.js";

const sample = {recipientName:"Gopi",actionUrl:"https://example.com/next",unsubscribeUrl:"https://example.com/unsubscribe"};

describe("complete 106-template catalog", () => {
    it("has exactly 106 unique public template IDs", () => {
        expect(EXPANDED_CATALOG_TEMPLATE_NAMES).toHaveLength(51);
        expect(CATALOG_TEMPLATE_DEFINITIONS).toHaveLength(93);
        expect(listBuiltinTemplateCatalog()).toHaveLength(106);
        expect(BUILTIN_CATALOG_TEMPLATE_NAMES).toHaveLength(106);
        expect(new Set(BUILTIN_CATALOG_TEMPLATE_NAMES).size).toBe(106);
    });
    it("retains all previous 49 IDs without changing their relative order", () => {
        const names = BUILTIN_CATALOG_TEMPLATE_NAMES;
        expect(names.slice(0,10)).toEqual([
            "welcome","otp","login","password-reset","invitation","notification",
            "invoice","payment-receipt","order-confirmation","security-alert",
        ]);
        expect(names).toContain("payment-failed");
        expect(names).toContain("support-ticket-resolved");
        expect(names).toContain("promotion");
    });
    it("includes every new template with its own authored content and correct category", () => {
        const stories = Object.keys(EXPANDED_TEMPLATE_STORIES);
        expect(stories).toHaveLength(51);
        expect(new Set(EXPANDED_CATALOG_TEMPLATE_NAMES).size).toBe(51);
        const validator = new DocumentValidator();
        for (const id of EXPANDED_CATALOG_TEMPLATE_NAMES) {
            expect(isExpandedCatalogTemplateName(id), id).toBe(true);
            const info = listCatalogTemplates().find(row => row.id === id);
            expect(info, id).toBeDefined();
            const document = getBuiltinCatalogTemplate(id);
            expect(document.id).toBe(id);
            expect(document.version).toBe("1.0.0");
            expect(validator.validate(document).valid, id).toBe(true);
            expect(document.body.some(n => n.id === `${id}-highlights`), id).toBe(true);
            expect(document.body.some(n => n.id === `${id}-intro`), id).toBe(true);
            expect(EXPANDED_TEMPLATE_STORIES[id].intro).not.toEqual(info?.description);
        }
    });
    it("materializes validated per-category input and optional fact panels", () => {
        for (const id of EXPANDED_CATALOG_TEMPLATE_NAMES) {
            const document = buildCatalogTemplate(id, {
                ...sample,
                presentation: {
                    facts: [{label:"Reference",value:"MF-123"}],
                    nextSteps: ["Review information", "Save your changes"],
                },
            });
            expect(document.body.some(node => node.id === `${id}-facts`)).toBe(true);
            expect(document.body.some(node => node.id === `${id}-steps`)).toBe(true);
            expect(document.body.some(node => node.id === `${id}-action`)).toBe(true);
        }
    });
    it("requires an unsubscribe URL for each new marketing template", () => {
        for (const item of listCatalogTemplates("marketing")) {
            if (!isExpandedCatalogTemplateName(item.id)) continue;
            expect(() => buildCatalogTemplate(item.id, {recipientName:"Gopi",actionUrl:sample.actionUrl})).toThrow();
            const doc = buildCatalogTemplate(item.id, sample);
            expect(doc.body.some(node => node.id === `${item.id}-unsubscribe`)).toBe(true);
        }
    });
    it("refuses unsupported fields or unsafe URLs and oversized data", () => {
        expect(() => buildCatalogTemplate("flash-sale", {...sample, unknown:123})).toThrow();
        expect(() => buildCatalogTemplate("flash-sale", {...sample, presentation:{secondaryAction:{label:"Click",url:"javascript:alert(1)"}}})).toThrow();
        expect(() => buildCatalogTemplate("flash-sale", {...sample, presentation:{facts:Array.from({length:7},()=>({label:"x",value:"y"}))}})).toThrow();
        expect(() => buildCatalogTemplate("flash-sale", {...sample, presentation:{nextSteps:["a\nb"]}})).toThrow();
        expect(() => expandedTemplatePresentationSchema.parse({nextSteps:["ok"],unknown:true})).toThrow();
    });
    it("retains the old strict data behavior", () => {
        expect(() => buildCatalogTemplate("payment-failed", {...sample,presentation:{summary:"not allowed"}})).toThrow();
        expect(() => buildCatalogTemplate("invoice-overdue", {...sample,billing:{amount:"20.00"}})).toThrow();
        expect(() => buildCatalogTemplate("event-rescheduled", {...sample,event:{startsAt:"2026-11-05T10:00:00Z",endsAt:"2026-11-04T10:00:00Z"}})).toThrow();
    });
    it("rejects getters without invoking user-defined code", () => {
        let invoked=false;
        const input={...sample,get presentation(){invoked=true;return {summary:"Test"};}};
        expect(() => buildCatalogTemplate("flash-sale",input)).toThrow(/getter/i);
        expect(invoked).toBe(false);
    });
});
