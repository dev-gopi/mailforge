import { describe, expect, it } from "vitest";
import { TemplateVariantRegistry } from "../src/registry/TemplateVariantRegistry.js";

describe("variant registry", () => {
    it("supports inheritance, exports, and safe importing", () => {
        const variants = new TemplateVariantRegistry();
        variants.register({ templateId: "invoice", id: "base", theme: { colors: { primary: "#1166aa" } } });
        variants.register({ templateId: "invoice", id: "premium", extends: "base", patches: [
            { op: "update", target: "invoice-action", props: { text: "Pay Securely" } },
        ] });
        expect(variants.resolve("invoice", "premium").theme?.colors?.primary).toBe("#1166aa");
        const copy = new TemplateVariantRegistry();
        copy.importJSON(variants.exportJSON());
        expect(copy.list("invoice")).toHaveLength(2);
        expect(() => copy.importJSON(variants.exportJSON())).toThrow();
    });
    it("rejects missing parents", () => {
        expect(() => new TemplateVariantRegistry().register({
            templateId: "welcome", id: "child", extends: "missing",
        })).toThrow(/not found/);
    });
});
