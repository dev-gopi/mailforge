import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { supportTicketCreatedPreviewData } from "../../packages/template/dist/index.js";

const folder = resolve("generated/support-ticket-created");
await mkdir(folder, { recursive: true });
const result = await createEmail({ theme: { appearance: { containerWidth: 588, cardRadius: 0 } } })
  .render("support-ticket-created", { data: supportTicketCreatedPreviewData });
await Promise.all([
  writeFile(resolve(folder, "index.html"), result.html),
  writeFile(resolve(folder, "message.txt"), result.text),
]);
console.log(`Generated ${folder}/index.html`);

