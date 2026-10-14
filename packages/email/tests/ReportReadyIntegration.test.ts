import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";

describe("report-ready standard render API", () => {
    const data = {
        companyName: "Aperture", recipientName: "Alex", reportName: "Quarterly <Report>",
        reportPeriod: "Q3 2026", reportUrl: "https://example.com/reports/q3", year: 2026,
    };
    it("renders safe HTML and plain text through createEmail", async () => {
        const mail = createEmail({ brand: { name: "Aperture" } });
        const rendered = await mail.render("report-ready", { data });
        expect(rendered.html).toContain("Aperture");
        expect(rendered.html).toContain("Quarterly &lt;Report&gt;");
        expect(rendered.html).toContain("https://example.com/reports/q3");
        expect(rendered.html).not.toContain("<script");
        expect(rendered.text).toContain("Q3 2026");
    });
    it("accepts theme and copy overrides independently", async () => {
        const mail = createEmail({ brand: { name: "Aperture" } });
        const result = await mail.render("report-ready", {
            data: { ...data, heading: "Your export is ready", design: { accent: "#112233" } },
            themeName: "modern",
        });
        expect(result.html).toContain("Your export is ready");
        expect(result.html).toContain("#112233");
    });
    it("escapes inline link text while retaining the safe destination", async () => {
        const mail = createEmail();
        const result = await mail.render("report-ready", {
            data: { ...data, fallbackPrefix: "If <script>alert(1)</script>, ", fallbackLabel: "open here" },
        });
        expect(result.html).not.toContain("<script>");
        expect(result.html).toContain("&lt;script&gt;");
        expect(result.html).toContain("open here");
    });
    it("does not allow script URLs", async () => {
        const mail = createEmail();
        await expect(mail.render("report-ready", { data: { ...data, reportUrl: "javascript:alert(1)" } })).rejects.toThrow();
    });
});
