import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";
import { passwordResetSecurePreviewData } from "../../packages/template/dist/index.js";

// Preview-only data. Issue real single-use reset tokens in your application backend.
const result = await createEmail({ brand: { name: "Northstar", primaryColor: "#4F46E5" } })
  .render("password-reset-secure", {
    data: passwordResetSecurePreviewData,
    themeName: "modern",
    theme: {
      colors: { background: "#EEF1F7", surface: "#FFFFFF", primary: "#4F46E5" },
      appearance: { containerWidth: 560, cardRadius: 16 },
    },
  });
const directory = resolve("generated/password-reset-secure");
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "index.html"), result.html);
await writeFile(resolve(directory, "message.txt"), result.text);
console.log(`Password reset preview: ${directory}/index.html`);
