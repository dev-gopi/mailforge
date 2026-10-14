/** Run from repository root after build: node examples/report-ready/render.mjs */
import { mkdir, writeFile } from "node:fs/promises";
import { createEmail } from "../../packages/email/dist/index.js";

const email = createEmail({ brand: { name: "Aperture", primaryColor: "#3154c8" } });
const result = await email.render("report-ready", {
    data: {
        companyName: "Aperture", recipientName: "Alex",
        reportName: "Monthly Performance Report", reportPeriod: "1–30 September 2026",
        reportUrl: "https://example.com/reports/sample", year: 2026,
        design: { accent: "#3154c8", surface: "#ffffff", text: "#18233b", muted: "#6f7d95", panel: "#f4f7ff", panelBorder: "#e2e9fb" },
    },
    themeName: "modern",
    bodyBackgroundColor: "#f4f6fa",
    containerWidth: 600,
    containerRadius: 12,
    layout: { header: { enabled: false }, footer: { enabled: false }, copyright: { enabled: false } },
});
await mkdir("generated/report-ready", { recursive: true });
await Promise.all([
    writeFile("generated/report-ready/index.html", result.html, "utf8"),
    writeFile("generated/report-ready/plain.txt", result.text, "utf8"),
]);
console.log("Rendered report-ready to generated/report-ready/index.html and plain.txt");
