import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { activityNotificationPreviewData } from "@mailforge/templates";

describe("activity-notification standard API", () => {
    it("escapes hostile comment and subject content, and produces plain text", async () => {
        const email = createEmail({ brand: { name: "huddle" } });
        const rendered = await email.render("activity-notification", { data: {
            ...activityNotificationPreviewData,
            actorName: "Mira <script>", commentExcerpt: "Hi <img src=x onerror=alert(1)> & thanks",
        }});
        expect(rendered.html).toContain("Mira &lt;script&gt;");
        expect(rendered.html).not.toContain("<script>");
        expect(rendered.html).not.toContain("<img src=x");
        expect(rendered.html).toContain("&lt;img");
        expect(rendered.text).toContain("thanks");
        expect(rendered.html).toContain("https://example.com/discussions/123");
    });
    it("outputs a bold inline actor and item without injecting custom HTML", async () => {
        const rendered = await createEmail().render("activity-notification", { data: activityNotificationPreviewData });
        expect(rendered.html).toMatch(/<strong[^>]*>Mira Patel<\/strong>/);
        expect(rendered.html).toMatch(/<strong[^>]*>Design handoff<\/strong>/);
        expect(rendered.html).toContain("Notification preferences");
    });
    it("preserves family styles and per-render customization", async () => {
        const email = createEmail();
        const personalized = await email.render("activity-notification", { data: {
            ...activityNotificationPreviewData, heading: "Someone replied",
            design: { button: "#112233", quoteBackground: "#fefefe" },
        }, themeName: "modern" });
        const fresh = await email.render("activity-notification", { data: activityNotificationPreviewData, themeName: "minimal" });
        expect(personalized.html).toContain("Someone replied");
        expect(personalized.html).toContain("#112233");
        expect(fresh.html).not.toContain("Someone replied");
    });
    it("refuses unsafe URLs", async () => {
        await expect(createEmail().render("activity-notification", { data: {
            ...activityNotificationPreviewData, actionUrl: "data:text/html,evil",
        } })).rejects.toThrow();
    });
});
