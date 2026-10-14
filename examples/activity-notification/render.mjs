/** Run after workspace build: node examples/activity-notification/render.mjs */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { activityNotificationPreviewData } from "../../packages/template/dist/index.js";

const directory = resolve("generated/activity-notification");
await mkdir(directory, { recursive: true });
const email = createEmail({ brand: { name: "huddle" } });
const options = {
    data: activityNotificationPreviewData,
    themeName: "modern",
    theme: {
        colors: {
            primary: "#a8512f", background: "#f7f4ef", surface: "#ffffff",
            section: "#ffffff", text: "#252523", muted: "#81786e", border: "#e9e3d9",
        },
        typography: { fontFamily: "Tahoma, Arial, sans-serif", headingFontFamily: "Tahoma, Arial, sans-serif" },
        appearance: { containerWidth: 580, cardRadius: 12 },
    },
};
const rendered = await email.render("activity-notification", options);
await writeFile(resolve(directory, "activity-notification.html"), rendered.html);
await writeFile(resolve(directory, "activity-notification.txt"), rendered.text);
await writeFile(resolve(directory, "index.html"), rendered.html);
console.log(`Activity notification HTML: ${resolve(directory, "activity-notification.html")}`);
console.log(`Subject: ${rendered.subject}`);
