import { describe, expect, it } from "vitest";
import {
    BuiltinTemplateDataError,
    TemplateVersionError,
    createEmail,
} from "../src/index.js";

function invoice(name = "Rahul") {
    return {
        customer: { name },
        invoice: {
            number: "INV-1001",
            issuedOn: "2026-10-12",
            dueOn: "2026-10-20",
            currency: "USD",
            items: [{ name: "Notebook", quantity: 2, unitPriceCents: 2000 }],
        },
        paymentUrl: "https://example.com/pay/INV-1001",
    };
}

describe("Task 7.8.3.7 — data-safe template versions", () => {
    it("materializes fresh validated invoice content for every render", async () => {
        const email = createEmail();
        const patches = [{
            op: "update" as const,
            target: "invoice-heading",
            styles: { fontSize: 26 },
        }];
        email.publishDomainTemplateVersion("invoice", "2.0.0", patches);
        patches[0]!.styles.fontSize = 50;

        const first = await email.render("invoice", {
            data: invoice("Rahul"),
            templateVersion: { version: "2.0.0" },
        });
        const second = await email.render("invoice", {
            data: invoice("Priya"),
            templateVersion: { version: "2.0.0" },
        });
        expect(first.subject).toBe("Invoice INV-1001");
        expect(first.text).toContain("Rahul");
        expect(second.text).toContain("Priya");
        expect(second.text).not.toContain("Rahul");
        expect(first.text).toContain("Notebook");
        expect(first.text).toContain("USD 40.00");
        expect(email.getTemplateVersion("invoice", "2.0.0").subject)
            .toContain("{{invoice.number}}");
        expect(JSON.stringify(email.getTemplateVersion("invoice", "2.0.0")))
            .not.toContain("Rahul");
    });

    it("allows call-specific patches and display options without changing history", async () => {
        const email = createEmail();
        email.publishDomainTemplateVersion("invoice", "1.0.0", [{
            op: "update", target: "invoice-heading", styles: { fontSize: 22 },
        }]);
        const rendered = await email.render("invoice", {
            data: invoice(),
            templateVersion: { version: "1.0.0" },
            patches: [{
                op: "update", target: "invoice-heading", props: { text: "Billing statement" },
            }],
            display: { headerTitle: false },
        });
        expect(rendered.html).toContain("Billing statement");
        expect(rendered.text).toContain("Notebook");
        expect(email.getTemplateVersion("invoice", "1.0.0").subject)
            .toContain("{{invoice.number}}");
    });

    it("rejects invalid domain data and unsafe URLs even with version selection", async () => {
        const email = createEmail();
        email.publishDomainTemplateVersion("invoice", "1.0.0");
        await expect(email.render("invoice", {
            data: { ...invoice(), paymentUrl: "javascript:alert(1)" },
            templateVersion: { version: "1.0.0" },
        })).rejects.toBeInstanceOf(BuiltinTemplateDataError);
        await expect(email.render("invoice", {
            templateVersion: { version: "1.0.0" },
        })).rejects.toBeInstanceOf(BuiltinTemplateDataError);
    });

    it("rejects duplicate, unsafe and unavailable domain publications", async () => {
        const email = createEmail();
        expect(() => email.publishDomainTemplateVersion("welcome" as "invoice", "1.0.0"))
            .toThrow(TemplateVersionError);
        expect(() => email.publishDomainTemplateVersion("invoice", "1.0.0", [
            { op: "remove", target: "invoice-heading" },
        ])).toThrow(TemplateVersionError);
        email.publishDomainTemplateVersion("invoice", "1.0.0");
        expect(() => email.publishDomainTemplateVersion("invoice", "1.0.0"))
            .toThrow(TemplateVersionError);
        await expect(email.render("invoice", {
            data: invoice(),
            templateVersion: { version: "3.0.0" },
        })).rejects.toThrow(TemplateVersionError);
        email.deprecateTemplateVersion("invoice", "1.0.0");
        await expect(email.render("invoice", {
            data: invoice(),
            templateVersion: { version: "1.0.0" },
        })).rejects.toThrow(TemplateVersionError);
        expect((await email.render("invoice", {
            data: invoice(),
            templateVersion: { version: "1.0.0", includeDeprecated: true },
        })).text).toContain("Rahul");
    });

    it("rejects unmanaged static snapshots of data-driven built-ins", async () => {
        const email = createEmail();
        expect(() => email.registerTemplateVersion({
            schemaVersion: "1.0",
            id: "invoice",
            version: "4.0.0",
            subject: "Potential customer snapshot",
            body: [{ id: "unsafe-data", type: "text", props: { text: "Secret" } }],
        })).toThrow(TemplateVersionError);
        expect(email.listTemplateVersions("invoice")).toEqual([]);
        email.publishDomainTemplateVersion("invoice", "1.0.0");
        expect(() => email.migrateTemplateVersion(
            "invoice", "1.0.0", "1.1.0", draft => draft,
        )).toThrow(TemplateVersionError);
        expect(email.listTemplateVersions("invoice")).toHaveLength(1);
    });

    it("validates ordinary built-in data for versioned rendering too", async () => {
        const email = createEmail();
        email.publishTemplateVersion("welcome");
        await expect(email.render("welcome", {
            templateVersion: { version: "1.0.0" },
            data: { user: { firstName: "Sam" }, actionUrl: "javascript:alert(1)" },
        })).rejects.toBeInstanceOf(BuiltinTemplateDataError);
        const valid = await email.render("welcome", {
            templateVersion: { version: "1.0.0" },
            data: { user: { firstName: "Sam" }, actionUrl: "https://example.com" },
        });
        expect(valid.text).toContain("Sam");
    });

    it("preserves ordinary unversioned invoice rendering", async () => {
        const email = createEmail();
        const rendered = await email.render("invoice", { data: invoice() });
        expect(rendered.subject).toBe("Invoice INV-1001");
        expect(rendered.text).toContain("Notebook");
    });
});
