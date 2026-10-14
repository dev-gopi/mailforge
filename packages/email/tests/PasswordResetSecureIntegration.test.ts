import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { passwordResetSecurePreviewData } from "@mailforge/templates";

describe("password-reset-secure public API", () => {
    it("renders through the standard API, safely escaping names and keeping plain text", async () => {
        const output = await createEmail().render("password-reset-secure", {
            data: { ...passwordResetSecurePreviewData, firstName: "Alex <img src=x onerror=alert(1)>" },
        });
        expect(output.subject).toContain("Northstar");
        expect(output.html).toContain("&lt;img");
        expect(output.html).not.toContain("<img src=x onerror");
        expect(output.text).toContain("Link expires in 30 minutes");
        expect(output.html).toContain("https://example.com/reset/example-only");
    });
    it("allows theme overrides without changing other renders", async () => {
        const email = createEmail();
        const custom = await email.render("password-reset-secure", { data: {
            ...passwordResetSecurePreviewData, design: { accent: "#112233" },
        }, themeName: "modern" });
        const regular = await email.render("password-reset-secure", { data: passwordResetSecurePreviewData, themeName: "minimal" });
        expect(custom.html).toContain("#112233");
        expect(regular.html).not.toContain("#112233");
    });
    it("rejects unsafe reset links", async () => {
        await expect(createEmail().render("password-reset-secure", { data: {
            ...passwordResetSecurePreviewData, resetUrl: "data:text/html,evil",
        } })).rejects.toThrow();
    });
});
