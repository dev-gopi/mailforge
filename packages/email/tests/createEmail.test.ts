
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    type EmailDocument,
} from "../src/index.js";

function createTestTemplate(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome to MailForge",

        header: {
            id: "company-header",
            type: "header",
            children: [
                {
                    id: "brand-heading",
                    type: "heading",
                    props: {
                        text: "MailForge",
                    },
                },
            ],
        },

        body: [
            {
                id: "welcome-message",
                type: "text",
                props: {
                    text: "Hello John!",
                },
            },
            {
                id: "welcome-button",
                type: "button",
                props: {
                    text: "Get Started",
                    href: "https://example.com/login",
                },
            },
        ],

        footer: {
            id: "company-footer",
            type: "footer",
            children: [
                {
                    id: "support-text",
                    type: "text",
                    props: {
                        text: "support@example.com",
                    },
                },
            ],
        },

        copyright: {
            id: "company-copyright",
            type: "copyright",
            props: {
                text: "© 2026 MailForge",
            },
        },
    };
}

describe("MailForge plug-and-play API", () => {
    it("creates an email engine", () => {
        const email = createEmail();

        expect(email.listTemplates()).toEqual([]);
    });

    it("registers and lists templates", () => {
        const email = createEmail();

        email.registerTemplate(createTestTemplate());

        expect(email.listTemplates()).toEqual([
            "welcome",
        ]);
    });

    it("rejects duplicate templates", () => {
        const email = createEmail();

        email.registerTemplate(createTestTemplate());

        expect(() => {
            email.registerTemplate(createTestTemplate());
        }).toThrow("Template already registered");
    });

    it("protects registered templates from mutation", () => {
        const email = createEmail();
        const original = createTestTemplate();

        email.registerTemplate(original);

        original.body[0]!.props!.text = "Changed";

        const copy = email.getTemplate("welcome");

        expect(copy.body[0]?.props?.text)
            .toBe("Hello John!");

        copy.body[0]!.props!.text = "Changed again";

        expect(
            email.getTemplate("welcome")
                .body[0]?.props?.text,
        ).toBe("Hello John!");
    });

    it("renders a registered template", async () => {
        const email = createEmail();

        email.registerTemplate(createTestTemplate());

        const result = await email.render("welcome");

        expect(result.subject)
            .toBe("Welcome to MailForge");

        expect(result.html)
            .toContain("Hello John!");

        expect(result.text)
            .toContain("Hello John!");
    });

    it("renders a customized copyright", async () => {
        const email = createEmail();

        email.registerTemplate(createTestTemplate());

        const result = await email.render("welcome", {
            patches: [
                {
                    op: "update",
                    target: "company-copyright",
                    props: {
                        text: "© 2026 Acme Technologies",
                    },
                },
            ],
        });

        expect(result.html)
            .toContain("Acme Technologies");

        expect(
            email.getTemplate("welcome")
                .copyright?.props?.text,
        ).toBe("© 2026 MailForge");
    });

    it("rejects unknown template names", async () => {
        const email = createEmail();

        await expect(
            email.render("missing-template"),
        ).rejects.toThrow("Template not found");
    });

    it("does not mutate templates when patches fail", async () => {
        const email = createEmail();

        email.registerTemplate(createTestTemplate());

        await expect(
            email.render("welcome", {
                patches: [
                    {
                        op: "update",
                        target: "welcome-message",
                        props: {
                            text: "Changed",
                        },
                    },
                    {
                        op: "remove",
                        target: "nonexistent-node",
                    },
                ],
            }),
        ).rejects.toThrow("Component not found");

        expect(
            email.getTemplate("welcome")
                .body[0]?.props?.text,
        ).toBe("Hello John!");
    });

    it("renders safe custom HTML", async () => {
        const email = createEmail();

        const result = await email.renderHtml({
            subject: "Custom Email",
            html: `
        <h1>Hello!</h1>
        <script>alert(1)</script>
      `,
        });

        expect(result.html).toContain("Hello!");

        expect(result.html)
            .not.toContain("<script");
    });

    it("rejects unknown components", () => {
        const email = createEmail();

        const document = createTestTemplate();

        document.body.push({
            id: "unknown-node",
            type: "not-registered",
        });

        expect(() => {
            email.registerTemplate(document);
        }).toThrow("Unknown component");
    });
});
