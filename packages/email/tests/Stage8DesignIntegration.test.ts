import { describe, it, expect } from "vitest";
import { createEmail } from "../src/index.js";
import { createHeroSectionDefinition } from "@mailforge/components";

describe("Stage 8 end-to-end visual contracts", () => {
    it("renders responsive HTML while preserving MJML's fallback tables", async () => {
        const email = createEmail();
        const result = await email.render("welcome", {
            data: { user: { firstName: "Priya" }, actionUrl: "https://example.com/dashboard" },
            responsive: true,
        });
        expect(result.html).toContain("<table");
        expect(result.html).toContain("mf-responsive-copy");
        expect(result.html).toContain("max-width: 480px");
    });
    it("supports opt-in dark mode and validates custom dark tokens", async () => {
        const email = createEmail();
        const doc = { schemaVersion: "1.0" as const, id: "stage8", version: "1.0.0", subject: "Hello", body: [{ id: "body", type: "text" as const, props: { text: "Hello" } }] };
        const result = await email.renderDocument(doc, { darkMode: "auto", darkModeColors: { background: "#171717" } });
        expect(result.html).toContain("prefers-color-scheme");
        expect(result.html).toContain("#171717");
        await expect(email.renderDocument(doc, { darkModeColors: { text: "#bad" } })).rejects.toThrow();
    });
    it("supports semantic professional components via the existing registration API", async () => {
        const email = createEmail();
        email.registerComponent(createHeroSectionDefinition());
        const doc = {
            schemaVersion: "1.0" as const, id: "hero-demo", version: "1.0.0", subject: "Demo",
            body: [{ id: "hero", type: "mf-hero-section", props: { title: "Hello", description: "Welcome", actionText: "Open", actionUrl: "https://example.com" } }],
        };
        const result = await email.renderDocument(doc);
        expect(result.html).toContain("Welcome");
        expect(result.html).toContain("example.com");
    });
});
