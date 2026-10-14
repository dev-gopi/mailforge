import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { subscriptionActivatedPreviewData } from "../../packages/template/dist/index.js";

const folder = resolve("generated/subscription-activated");
await mkdir(folder, { recursive: true });
const result = await createEmail({ theme: { appearance: { containerWidth: 600, cardRadius: 0 } } })
  .render("subscription-activated", { data: subscriptionActivatedPreviewData });
await Promise.all([
  writeFile(resolve(folder, "index.html"), result.html),
  writeFile(resolve(folder, "message.txt"), result.text),
]);
console.log(`Generated ${folder}/index.html`);

