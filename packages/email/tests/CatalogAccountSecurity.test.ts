import { describe, expect, it } from "vitest";
import {
    accountCatalogTemplateDataSchema,
    authenticationCatalogTemplateDataSchema,
    buildCatalogTemplate,
} from "@mailforge/templates";
import { createEmail } from "../src/index.js";

const base = {
    recipientName: "Priya",
    actionUrl: "https://example.com/dashboard",
};

describe("Task 7.8.5.2–7.8.5.3: account and authentication catalog", () => {
    it("supports account details in existing theme-aware panels", () => {
        const data = {
            ...base,
            account: { email: "priya@example.com", referenceId: "ACCT-2026-1" },
        };
        expect(accountCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("account-activated", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("Account email: priya@example.com");
        expect(json).toContain("Reference: ACCT-2026-1");
        expect(json).toContain("account-activated-account-details");
        expect(doc.version).toBe("1.0.0");
    });

    it("supports sign-in details with a consistent UTC timestamp", () => {
        const data = {
            ...base,
            security: {
                device: "Chrome on Ubuntu",
                location: "Kolkata",
                occurredAt: "2026-10-13T09:15:00+05:30",
            },
        };
        expect(authenticationCatalogTemplateDataSchema.parse(data)).toEqual(data);
        const doc = buildCatalogTemplate("suspicious-sign-in", data);
        const json = JSON.stringify(doc.body);
        expect(json).toContain("Device: Chrome on Ubuntu");
        expect(json).toContain("Location: Kolkata");
        expect(json).toContain("Time (UTC): Tue, 13 Oct 2026 03:45:00 GMT");
    });

    it("preserves old data-only calls and IDs for both categories", async () => {
        const engine = createEmail();
        const account = await engine.render("account-activated", { data: base });
        const auth = await engine.render("suspicious-sign-in", { data: base });
        expect(account.html).toContain("Account activated");
        expect(auth.html).toContain("New sign-in detected");
        expect(account.text.length).toBeGreaterThan(0);
        expect(auth.text.length).toBeGreaterThan(0);
    });

    it("renders extra details and can hide those panels per email", async () => {
        const engine = createEmail();
        const data = {
            ...base,
            account: { email: "priya@example.com" },
        };
        const visible = await engine.render("email-verified", { data });
        expect(visible.text).toContain("Account email: priya@example.com");
        const hidden = await engine.render("email-verified", {
            data,
            display: { heading: false, hideIds: ["email-verified-account-details"] },
        });
        expect(hidden.text).not.toContain("Account email: priya@example.com");
        expect(hidden.text).not.toContain("Email verified");
    });

    it("rejects malformed account and security details", () => {
        expect(() => buildCatalogTemplate("account-activated", {
            ...base, account: { email: "bad-email" },
        })).toThrow();
        expect(() => buildCatalogTemplate("account-activated", {
            ...base, account: { referenceId: "bad ref!" },
        })).toThrow();
        expect(() => buildCatalogTemplate("magic-link", {
            ...base, security: { occurredAt: "yesterday" },
        })).toThrow();
        expect(() => buildCatalogTemplate("suspicious-sign-in", {
            ...base, security: { device: "\u0001" },
        })).toThrow();
    });

    it("rejects category-specific fields on unrelated templates", () => {
        expect(() => buildCatalogTemplate("payment-failed", {
            ...base, account: { email: "priya@example.com" },
        })).toThrow();
        expect(() => buildCatalogTemplate("account-activated", {
            ...base, security: { device: "Chrome" },
        })).toThrow();
        expect(() => buildCatalogTemplate("magic-link", {
            ...base, account: { email: "priya@example.com" },
        })).toThrow();
    });

    it("keeps marketing unsubscribe requirements intact", () => {
        expect(() => buildCatalogTemplate("product-launch", base)).toThrow();
        expect(buildCatalogTemplate("product-launch", {
            ...base, unsubscribeUrl: "https://example.com/unsubscribe",
        }).id).toBe("product-launch");
    });
});
