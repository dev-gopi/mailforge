import { describe, expect, it } from "vitest";
import { applyDocumentOverrides, EmailDocumentOverrideError, type EmailDocument } from "../src/index.js";

const sample: EmailDocument = {
    schemaVersion: "1.0", id: "example", version: "1.0.0", subject: "Example",
    body: [
        { id: "intro", type: "text", props: { text: "Original" },
            attrs: { "data-mf-style": "body" }, styles: { color: "#111111" } },
        { id: "action", type: "button", props: { text: "Continue", href: "https://example.com" },
            attrs: { "data-mf-style": "primary-action" }, styles: { color: "#222222" } },
        { id: "details", type: "section", children: [
            { id: "nested", type: "text", props: { text: "Nested" }, styles: { color: "#222222" } },
        ] },
    ],
};

describe("applyDocumentOverrides", () => {
    it("applies type, semantic role, and ID in deterministic priority", () => {
        const result = applyDocumentOverrides(sample, {
            byType: { text: { styles: { color: "#aaaaaa", fontSize: 14 } } },
            byRole: { body: { styles: { color: "#bbbbbb" } } },
            byId: { intro: { styles: { color: "#cccccc" }, props: { text: "Edited" } } },
        });
        expect(result.body[0]?.styles).toMatchObject({ color: "#cccccc", fontSize: 14 });
        expect(result.body[0]?.props?.text).toBe("Edited");
        expect(result.body[2]?.children?.[0]?.styles?.color).toBe("#aaaaaa");
        expect(sample.body[0]?.props?.text).toBe("Original");
    });
    it("replaces links and attributes while retaining other props", () => {
        const result = applyDocumentOverrides(sample, { byId: {
            action: { props: { text: "Open", href: "https://example.org" },
                attrs: { "aria-label": "Open details" }, styles: { backgroundColor: "#ff0000" } },
        } });
        expect(result.body[1]?.props).toMatchObject({ text: "Open", href: "https://example.org" });
        expect(result.body[1]?.attrs?.["aria-label"]).toBe("Open details");
        expect(result.body[1]?.styles?.backgroundColor).toBe("#ff0000");
    });
    it("permits reusable selectors not present in this template", () => {
        expect(applyDocumentOverrides(sample, {
            byType: { image: { styles: { width: 180 } } },
            byRole: { "design-dashboard": { styles: { color: "#cccccc" } } },
        })).toEqual(sample);
    });
    it("throws on a mistyped exact component ID", () => {
        expect(() => applyDocumentOverrides(sample, { byId: { typo: { props: { text: "Missing" } } } }))
            .toThrow(EmailDocumentOverrideError);
    });
    it("rejects unsafe object keys, invalid style values and unsupported fields", () => {
        const injected = JSON.parse('{"byId":{"__proto__":{"styles":{"color":"red"}}}}');
        expect(() => applyDocumentOverrides(sample, injected)).toThrow(EmailDocumentOverrideError);
        expect(() => applyDocumentOverrides(sample, { byId: { intro: { styles: { opacity: NaN } } } }))
            .toThrow(EmailDocumentOverrideError);
        expect(() => applyDocumentOverrides(sample, { unexpected: {} } as never)).toThrow(EmailDocumentOverrideError);
    });
    it("does not mutate shared caller overrides or source", () => {
        const source = structuredClone(sample);
        const overrides = { byId: { nested: { props: { text: "Changed" } } } };
        const first = applyDocumentOverrides(sample, overrides);
        first.body[2]!.children![0]!.props!.text = "After";
        const second = applyDocumentOverrides(sample, overrides);
        expect(second.body[2]!.children![0]!.props?.text).toBe("Changed");
        expect(sample).toEqual(source);
        expect(overrides.byId.nested.props.text).toBe("Changed");
    });
});
