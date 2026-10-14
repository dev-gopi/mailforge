import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { newDeviceLoginAlertPreviewData } from "../../packages/template/dist/index.js";

const folder = resolve("generated/new-device-login-alert");
await mkdir(folder, { recursive: true });
const result = await createEmail({ theme: { appearance: { containerWidth: 600, cardRadius: 0 } } })
  .render("new-device-login-alert", { data: newDeviceLoginAlertPreviewData });
await Promise.all([
  writeFile(resolve(folder, "index.html"), result.html),
  writeFile(resolve(folder, "message.txt"), result.text),
]);
console.log(`Generated ${folder}/index.html`);
