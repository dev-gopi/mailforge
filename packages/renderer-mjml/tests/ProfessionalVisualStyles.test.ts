import { describe, it, expect } from "vitest";
import { emailClientHead, resolveEmailClientStyles } from "../src/EmailClientStyles.js";

describe("mobile and dark-mode style safety", () => {
    it("includes mobile heading, panel, and full-width actions by default", () => {
        const css = emailClientHead({ responsive: true });
        expect(css).toContain("mf-role-hero-title");
        expect(css).toContain("mf-role-panel-outer");
        expect(css).toContain("mf-responsive-action table");
    });
    it("can disable extra mobile CSS without changing MJML defaults", () => {
        expect(emailClientHead({responsive:false})).toBe("");
    });
    it("keeps automatic dark mode strictly opt in", () => {
        expect(emailClientHead()).not.toContain("prefers-color-scheme");
        expect(emailClientHead({darkMode:"auto"})).toContain("prefers-color-scheme");
    });
    it("uses validated dark tokens", () => {
        expect(emailClientHead({darkMode:"auto",darkModeColors:{surface:"#181818"}})).toContain("#181818");
        expect(() => resolveEmailClientStyles({darkModeColors:{text:"red"}})).toThrow();
    });
    it("does not allow CSS injection via dark tokens", () => {
        expect(() => emailClientHead({darkMode:"auto",darkModeColors:{border:"#fff;url(1)"}})).toThrow();
    });
});
