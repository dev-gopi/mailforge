import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createEmail } from "../../packages/email/dist/index.js";

// Preview data only. A real reset URL must come from your authenticated backend.
const email = createEmail({ brand: { name: "Northstar" } });
const output = await email.render("password-reset-secure", {
  data: {
    brandName: "Northstar", firstName: "Alex",
    resetUrl: "https://example.com/reset", supportUrl: "https://example.com/support",
    expiryMinutes: 30, year: 2026,
  },
  themeName: "modern",
  theme: {
    colors: { primary: "#3253ac", background: "#eef2ff" },
    appearance: { containerWidth: 560 },
  },
  display: { subject: "Your secure password link" },
  overrides: {
    byType: { text: { styles: { fontFamily: "Georgia, Times New Roman, serif" } } },
    byRole: { "primary-action": { styles: { backgroundColor: "#a3316c" } } },
    byId: {
      "password-secure-heading": { props: { text: "Create a new password" },
        styles: { fontSize: 28, color: "#123456" } },
      "password-secure-action": { props: { text: "Reset now" } },
    },
  },
});
const folder = resolve("generated/customization");
await mkdir(folder, { recursive: true });
await writeFile(resolve(folder, "password-reset-secure.html"), output.html);
await writeFile(resolve(folder, "password-reset-secure.txt"), output.text);
console.log(`Customized password reset: ${folder}/password-reset-secure.html`);
