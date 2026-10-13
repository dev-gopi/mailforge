import { describe, expect, it } from "vitest";
import { mjmlStyles } from "../src/RenderUtils.js";

describe("strict MJML section style regression", () => {
    it("emits supported section styles without illegal align attributes", () => {
        const markup = mjmlStyles({ backgroundColor: "#ffffff", padding: "16px" }, "mj-section");
        expect(markup).toContain('background-color="#ffffff"');
        expect(markup).toContain('padding="16px"');
        expect(markup).not.toContain("align=");
    });

    it("rejects text alignment on sections rather than generating invalid MJML", () => {
        expect(() => mjmlStyles({ textAlign: "center" }, "mj-section"))
            .toThrow(/Unsupported style 'textAlign' for mj-section/);
    });

    it("continues allowing center alignment on text and buttons", () => {
        expect(mjmlStyles({ textAlign: "center" }, "mj-text")).toContain('align="center"');
        expect(mjmlStyles({ textAlign: "center" }, "mj-button")).toContain('align="center"');
    });
});
