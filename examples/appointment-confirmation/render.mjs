import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { appointmentConfirmationPreviewData } from "../../packages/template/dist/index.js";

const folder = resolve("generated/appointment-confirmation");
await mkdir(folder, { recursive: true });
const output = await createEmail({ theme: { appearance: { containerWidth: 600, cardRadius: 0 } } })
  .render("appointment-confirmation", { data: appointmentConfirmationPreviewData });
await Promise.all([writeFile(resolve(folder, "index.html"), output.html), writeFile(resolve(folder, "message.txt"), output.text)]);
console.log(`Generated ${folder}/index.html`);
