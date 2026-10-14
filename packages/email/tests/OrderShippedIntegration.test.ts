import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { orderShippedPreviewData } from "@mailforge/templates";

describe("order-shipped-notice public MailForge rendering", () => {
    it("renders compiled safe HTML, subject and text through the standard API", async () => {
        const output = await createEmail().render("order-shipped-notice", { data: {
            ...orderShippedPreviewData, firstName: "Maya <script>alert(1)</script>",
            currentStep: 3,
        } });
        expect(output.subject).toContain("NL-20481");
        expect(output.html).toContain("https://example.com/track/PK9048193");
        expect(output.html).toContain("&lt;script&gt;");
        expect(output.html).not.toContain("<script>alert(1)</script>");
        expect(output.text).toContain("PK9048193");
        expect(output.text).toContain("Shipped");
    });
    it("applies theme, user design overrides and public byId node overrides in isolation", async () => {
        const engine = createEmail();
        const first = await engine.render("order-shipped-notice", { data: {
            ...orderShippedPreviewData, design: { accent: "#112233" },
        }, themeName: "modern", overrides: { byId: {
            "order-shipped-tracking-action": { props: { text: "Track parcel" } },
        } } });
        const second = await engine.render("order-shipped-notice", { data: orderShippedPreviewData });
        expect(first.html).toContain("#112233");
        expect(first.html).toContain("Track parcel");
        expect(second.html).not.toContain("Track parcel");
        expect(second.html).not.toContain("#112233");
    });
    it("rejects unsafe tracking links and unknown fields before rendering", async () => {
        await expect(createEmail().render("order-shipped-notice", { data: {
            ...orderShippedPreviewData, trackingUrl: "javascript:alert(1)",
        } })).rejects.toThrow();
        await expect(createEmail().render("order-shipped-notice", { data: {
            ...orderShippedPreviewData, extra: true,
        } })).rejects.toThrow();
    });
});
