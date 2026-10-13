import { describe, expect, it } from "vitest";
import { renderTableMarkup } from "../src/TableRenderer.js";
import { MjmlRenderer } from "../src/index.js";
import type { EmailDocument } from "@mailforge/core";

describe("Task 8.5.13: email-safe table renderer", () => {
    it("escapes HTML and attributes in cells", () => {
        const markup = renderTableMarkup({headers:["<script>"],rows:[["<img src=x onerror=alert(1)> & \"quote\""]]});
        expect(markup).not.toContain("<script>");
        expect(markup).not.toContain("<img src=x");
        expect(markup).toContain("&lt;script&gt;");
        expect(markup).toContain("&amp;");
    });
    it("supports a hidden header and optional striped rows", () => {
        const markup = renderTableMarkup({headers:["X"],rows:[["A"],["B"]],showHeader:false,striped:true});
        expect(markup).not.toContain("<th");
        expect(markup).toContain("#f8fafc");
    });
    it("rejects malformed dimensions and malicious colors", () => {
        expect(() => renderTableMarkup({headers:["A","B"],rows:[["A"]]})).toThrow();
        expect(() => renderTableMarkup({headers:["A"],rows:[["B"]],headerBackground:"red;position:absolute"})).toThrow();
        expect(() => renderTableMarkup({headers:["A"],rows:[["B"]],padding:-1})).toThrow();
    });
    it("compiles a native table node in safe mode", async () => {
        const document: EmailDocument = {schemaVersion:"1.0",id:"table-mail",version:"1.0.0",subject:"Invoice",body:[{id:"table",type:"table",props:{headers:["Item","Price"],rows:[["Seat","$12"]]}}]};
        const result = await new MjmlRenderer().render(document);
        expect(result.html.toLowerCase()).toContain("<table");
        expect(result.text).toContain("Seat");
    });
});
