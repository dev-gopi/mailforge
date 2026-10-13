import { mkdir, writeFile } from "node:fs/promises";
import { createEmail } from "@mailforge/email";

const email = createEmail({
    brand: { name: "Northstar", primaryColor: "#2563eb" },
    theme: { preset: "corporate" },
});
const result = await email.renderDocument({
    schemaVersion: "1.0", id: "sample-invoice", version: "1.0.0",
    subject: "Your Northstar invoice",
    body: [
        { id: "invoice-title", type: "heading", props: { text: "Invoice summary", level: 1 } },
        { id: "invoice-items", type: "mf-invoice-table", props: {
            title: "October 2026", currency: "INR",
            lines: [
                { description: "Premium plan", quantity: 1, unitPrice: "1299.00", amount: "1299.00" },
                { description: "Additional seats", quantity: 2, unitPrice: "249.00", amount: "498.00" },
            ],
            total: "1797.00",
        } },
        { id: "invoice-note", type: "text", props: { text: "Thank you for your business." } },
    ],
});
await mkdir("generated", { recursive: true });
await writeFile("generated/stage8513-invoice.html", result.html, "utf8");
await writeFile("generated/stage8513-invoice.txt", result.text, "utf8");
console.log("Saved generated/stage8513-invoice.html and .txt");
