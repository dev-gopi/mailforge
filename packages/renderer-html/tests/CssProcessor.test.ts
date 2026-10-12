import { describe, expect, it } from "vitest";
import { CssProcessor } from "../src/index.js";

describe("CssProcessor", () => {
    const css = new CssProcessor();
    it("inlines trusted CSS", () => {
        const output = css.process('<p class="message">Hello</p>', ".message { color: red; }");
        expect(output).toMatch(/color:\s*red/i);
    });
    it("can preserve a style element instead of inlining", () => {
        const output = css.process("<html><head></head><body>Hello</body></html>", "p { color: blue; }", false);
        expect(output).toContain("<style>p { color: blue; }</style>");
    });
    it("rejects HTML markup embedded in CSS", () => {
        expect(() => css.process("<p>Hello</p>", "</style><script>bad</script>")).toThrow("CSS must not contain HTML markup");
    });
});
