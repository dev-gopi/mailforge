import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { orderShippedPreviewData } from "../../packages/template/dist/index.js";

const engine = createEmail();
const output = await engine.render("order-shipped-notice", {
    data: orderShippedPreviewData,
    // Keep the example neutral: application data and theme/overrides customize each render.
});
const folder = resolve("generated/order-shipped");
await mkdir(folder, { recursive: true });
await writeFile(resolve(folder, "index.html"), output.html);
await writeFile(resolve(folder, "message.txt"), output.text);
console.log(`Generated ${resolve(folder, "index.html")}`);
