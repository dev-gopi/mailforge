import { describe, expect, it } from "vitest";
import { MjmlRenderer } from "../src/MjmlRenderer.js";
import type { EmailDocument } from "@mailforge/core";

const doc = (nodes: EmailDocument["body"]): EmailDocument => ({
    schemaVersion: "1.0", id: "test-activity-layout", version: "1.0.0", subject: "Hello",
    body: nodes,
});

describe("reusable activity presentation primitives", () => {
    it("renders escaped inline rich-text with strong segments", async () => {
        const output = await new MjmlRenderer().render(doc([{
            id: "rich", type: "rich-text", props: { segments: [
                { text: "<unsafe>", strong: true }, { text: " & ok" },
            ] },
        }]));
        expect(output.html).toContain("&lt;unsafe&gt;");
        expect(output.html).toContain("<strong>&lt;unsafe&gt;</strong>");
        expect(output.html).not.toContain("<unsafe>");
    });
    it("rejects malformed fragments", async () => {
        await expect(new MjmlRenderer().render(doc([{
            id: "bad", type: "rich-text", props: { segments: [{ text: "X", color: "url(evil)" }] },
        }]))).rejects.toThrow();
    });
    it("supports an outside-shell footer and retains legacy shell content", async () => {
        const result = await new MjmlRenderer().render(doc([
            { id: "inside", type: "section", styles: { padding: "0" }, children: [
                { id: "col", type: "column", children: [{ id: "copy", type: "text", props: { text: "Main content" } }] },
            ] },
            { id: "outside", type: "section", attrs: { "data-mf-placement": "after-shell" },
                styles: { padding: "16px", backgroundColor: "#f7f4ef" }, children: [
                    { id: "footer-column", type: "column", children: [{ id: "footer-text", type: "text", props: { text: "Outside footer" } }] },
                ] },
        ]));
        expect(result.html).toContain("Outside footer");
        expect(result.html).toContain("Main content");
    });
    it("rejects invalid outside-shell placement on leaf nodes", async () => {
        await expect(new MjmlRenderer().render(doc([{
            id: "bad", type: "text", props: { text: "Bad" }, attrs: { "data-mf-placement": "after-shell" },
        }]))).rejects.toThrow(/section/i);
    });
});
