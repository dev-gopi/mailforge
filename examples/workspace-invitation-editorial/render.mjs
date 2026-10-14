import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { workspaceInvitationEditorialPreviewData } from "../../packages/template/dist/index.js";

const output = resolve("generated/workspace-invitation-editorial");
await mkdir(output, { recursive: true });
const email = createEmail({ brand: { name: "kindred" }, theme: {
    preset: "modern", appearance: { containerWidth: 600, cardRadius: 0 },
    colors: { background: "#F4F0EB", surface: "#FFFDF9" },
} });
const result = await email.render("workspace-invitation-editorial", { data: workspaceInvitationEditorialPreviewData });
await Promise.all([
    writeFile(resolve(output, "index.html"), result.html),
    writeFile(resolve(output, "email.txt"), result.text),
]);
console.log(`Generated: ${output}/index.html`);
