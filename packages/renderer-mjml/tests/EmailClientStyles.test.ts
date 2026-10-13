import { describe, it, expect } from "vitest";
import { emailClientHead, resolveEmailClientStyles } from "../src/EmailClientStyles.js";

describe("Stage 8 email-client CSS", () => {
    it("keeps optional CSS off by default for backward compatibility", () => {
        const html = emailClientHead();
        expect(html).toBe("");
        expect(emailClientHead({ responsive: true })).toContain("max-width: 480px");
    });
    it("produces a controlled dark-mode stylesheet", () => {
        const head = emailClientHead({ darkMode: "auto", darkModeColors: { background: "#101010" } });
        expect(head).toContain("#101010");
        expect(head).toContain("prefers-color-scheme");
    });
    it("allows disabling optional CSS", () => {
        expect(emailClientHead({ darkMode: "off", responsive: false })).toBe("");
    });
    it("rejects injected CSS and invalid settings", () => {
        expect(() => resolveEmailClientStyles({ darkModeColors: { background: "red;url(x)" } })).toThrow();
        expect(() => resolveEmailClientStyles({ darkModeColors: { unknown: "#ffffff" } as never })).toThrow();
        expect(() => resolveEmailClientStyles({ darkMode: "invalid" as never })).toThrow();
    });
});
