/** Generate 40 real MJML-rendered example emails for design review. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../packages/email/dist/index.js";
import { listThemePresets } from "../packages/themes/dist/index.js";

const out = resolve("generated/stage8515-previews");
await mkdir(out, { recursive: true });
const templates = ["welcome", "payment-failed", "event-reminder", "feature-announcement"];
const commonData = {
    recipientName: "Priya",
    actionUrl: "https://example.com/action",
    unsubscribeUrl: "https://example.com/unsubscribe",
    detail: "Reference 12345",
};
const fixtureFor = template => template === "welcome"
    ? { user: { firstName: "Priya" }, actionUrl: commonData.actionUrl }
    : commonData;
const report = [];
for (const theme of listThemePresets()) {
    const engine = createEmail({ brand: { name: "Northstar Studio" }, theme });
    for (const template of templates) {
        const rendered = await engine.render(template, { data: fixtureFor(template) });
        const filename = `${template}-${theme}`;
        await writeFile(resolve(out, `${filename}.html`), rendered.html, "utf8");
        await writeFile(resolve(out, `${filename}.txt`), rendered.text, "utf8");
        report.push({ template, theme, html: `${filename}.html`, text: `${filename}.txt`, warnings: rendered.warnings });
    }
}
await writeFile(resolve(out, "manifest.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`Created ${report.length} theme/template previews in ${out}`);
