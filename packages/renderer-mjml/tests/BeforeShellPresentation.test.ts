import { describe, expect, it } from "vitest";
import { MjmlRenderer } from "../src/MjmlRenderer.js";
import type { EmailDocument } from "@mailforge/core";
const doc = (body: EmailDocument["body"]): EmailDocument => ({
    schemaVersion: "1.0", id: "before-shell-test", version: "1.0.0", subject: "Test", body,
});
const segment = (id: string, copy: string, placement?: string) => ({
    id, type: "section" as const, ...(placement ? { attrs: { "data-mf-placement": placement } } : {}),
    children: [{ id: `${id}-col`, type: "column" as const, children: [
        { id: `${id}-text`, type: "text" as const, props: { text: copy } },
    ] }],
});
describe("reusable before-shell layout placement", () => {
    it("renders brand before the shell, content inside, footer after it", async () => {
        const result = await new MjmlRenderer().render(doc([
            segment("brand", "BRAND ABOVE", "before-shell"),
            segment("content", "MAIN CONTENT"),
            segment("footer", "FOOTER BELOW", "after-shell"),
        ]));
        const html = result.html;
        expect(html).toContain("BRAND ABOVE");
        expect(html).toContain("MAIN CONTENT");
        expect(html).toContain("FOOTER BELOW");
        expect(html.indexOf("BRAND ABOVE")).toBeLessThan(html.indexOf("MAIN CONTENT"));
        expect(html.indexOf("MAIN CONTENT")).toBeLessThan(html.indexOf("FOOTER BELOW"));
    });
    it("rejects unsupported placement and placement on non-section leaves", async () => {
        await expect(new MjmlRenderer().render(doc([segment("bad", "BAD", "before-unknown")]))).rejects.toThrow();
        await expect(new MjmlRenderer().render(doc([{
            id: "bad-leaf", type: "text", attrs: { "data-mf-placement": "before-shell" }, props: { text: "bad" },
        }]))).rejects.toThrow(/section/i);
    });
});
